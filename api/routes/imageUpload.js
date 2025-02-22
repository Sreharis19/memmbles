/**
 * @file
 * @desc Image Upload to S3 bucket
 * @author Ajith
 * @date 20 Mar 2017
 *
 */

 var express = require('express')
 var router = express.Router()
 var PythonShell = require('python-shell')
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var formidable = require('formidable')
 var fs = require('fs')
 const config = require('config')

 var mongodb = require('mongodb')
 var request = require('request')
 const crypto = require('crypto')

 var AWS = require('aws-sdk')
 AWS.config.update({
  accessKeyId: config.get('s3.access_key'),
  secretAccessKey: config.get('s3.secret_key'),
  region: config.get('s3.region')
})
 const s3 = new AWS.S3({
  apiVersion: config.get('s3.api_version')
})
 const sns = new AWS.SNS({
  apiVersion: config.get('sns.api_version')
})

/**
 * @callback
 * @param {string} firstName
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('got request')

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())

    var form = new formidable.IncomingForm()

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true

    form.on('error', function(err) {
      console.log(err)

      res.status(400).json(common.formatResponse({
        type: 'validationError',
        code: 'INVALID_FILE_FORMAT',
        data: 'Invalid file format'
      }))

    })

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function(field, file) {
      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
      console.log('field')
      console.log(field) 
      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")

      var fileType = file.type.split("/")[1]
      var supportedFileTypes = ['jpeg', 'png','gif']

      var fileSize = file.size // in bytes
      var maxAllowedFileSize = config.get('maxAllowedFileSize_img') // in bytes

      if (supportedFileTypes.indexOf(fileType) == '-1') {

        res.status(400).json(common.formatResponse({
          type: 'error',
          code: 'INVALID_FILE_FORMAT',
          data: {
            message: 'You can upload only JPEG and PNG files',
            data: {
              file: file
            }
          }
        }))

      } 
      // else if (fileSize > maxAllowedFileSize) {

      //   res.status(400).json(common.formatResponse({
      //     type: 'error',
      //     code: 'INVALID_FILE_SIZE',
      //     data: {
      //       message: 'Image size cannot exceed ' + Math.floor(maxAllowedFileSize * 0.000001) + ' MB',
      //       data: {
      //         file: file
      //       }
      //     }
      //   }))

      // } 
      else {

        /*   console.log(fileType)
        console.log(file.name) */

        fs.readFile(file.path, function(err, data) {

          if (err) {
            throw err
          } else {
            //output.forEach console.log(data)
            uploadToBucket(data, file, field)
          }

        })

      }

    })

    form.parse(req);

  } catch (err) {
    res.status(401).json(common.formatResponse({
      type: 'authorizationError',
      code: 'INVALID_TOKEN',
      data: 'User authentication failed'
    }))
    return
  }

  /*
   * Capture and crop faces
   */

   function insertToQueue(file, type, pid,s3Location) {
    console.log("@@@@@@@@@@@@@@@@@process started@@@@@@@@@@@@@@@@@")

    console.log("file_path",file.path)
    console.log("type",type)
    console.log("pid",pid)

    var temp_queue = db.get().collection('temp_queue')
    var d=new Date()
    d.setSeconds(d.getSeconds() - 30);
    console.log("date@@@@@@@@@@",d)
    temp_queue.insertOne({"file":file,
      "type":type,
      "pid":pid,
      "date":new Date(),
      "re_try": 0,
      "s3_Location": s3Location,
      "is_processed": false}, function(err, result) {
        if (err)
          console.log(err)
        console.log('Face data inserted to temp_queue')
      })



  }



  /**
   * @method
   * @param {buffer} inputBuffer
   * @param {json} file
   * @param {string} field
   * @param {json} data
   *
   */
   function uploadToBucket(inputBuffer, file, field) {
    console.log('uploading to S3 bucket...')
    console.log(decoded.userId)

    var currentTime = new Date().getTime()
    var encFileName = common.hashString(decoded.userId + ':' + currentTime + ':' + file.name)

    s3.upload({
      Bucket: config.get('s3.bucket'),
      Key: encFileName,
      ContentType: file.type,
      Body: inputBuffer,
      ACL: 'public-read'
    }, function(err, data) {
      if (err) {
        console.log('There was an error uploading your photo: ')
        console.log(err.message)
      } else {
        console.log('Successfully uploaded photo.')
        console.log(data)

        switch (field) {
          case 'user_cover_image':
          insertProfileCoverToCollection(data, field, file)
          publishSns(decoded.userId, encFileName, field, file)
          break

          case 'user_profile_image':
          insertProfileImageToCollection(data, field, file)
          publishSns(decoded.userId, encFileName, field, file)
          break
          case 'family_profile_image':
          publishSns(decoded.userId, encFileName, field, file)
          sendfamilyProfile(data)

          break
          case 'event_image':
          publishSns(decoded.userId, encFileName, field, file)
          sendEventImage(data)

          break
          case 'chat_image':
          publishSns(decoded.userId, encFileName, field, file)
          sendChatImage(data)
          break


          default:
          insertToCollection(data, field, file)
          publishSns(decoded.userId, encFileName, field, file)
          break
        }

      }
    })

  }


  /**
   * @method
   * @param {json} data
   * @param {string} field
   * @collection  temp
   * @desc Insert the profile cover image user collection
   *
   */
   function insertProfileCoverToCollection(data, field, file) {

    var users = db.get().collection('users')

    users.update({
      "_id": new mongodb.ObjectId(decoded.userId)
    }, {
      $set: {
        "profile_cover_image": {
          "thumbnail": {
            "small": data.Location + "_small.jpg",
            "big": data.Location + "_big.jpg"
          },
          "quality": {
            "high_resolution": data.Location
          }
        }
      }
    }, function(err, result) {

      if (err)
        console.log(err)

      // process image - file.path, type, id
      insertToQueue(file, 'cover', new mongodb.ObjectId(decoded.userId),data.Location)

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'PROFILE_COVER_CHANGE_SUCCESS',
        data: {
          message: 'Profile cover image changed successfully',
          data: {
            imageUrl: data.Location
          }
        }
      }))

    })

  }


  /**
   * @method
   * @param {json} data
   * @param {string} field
   * @collection  temp
   * @desc Insert the profile image user collection
   *
   */
   function insertProfileImageToCollection(data, field, file) {

    var users = db.get().collection('users')

    users.update({
      "_id": new mongodb.ObjectId(decoded.userId)
    }, {
      $set: {
        "profile_image": {
          "thumbnail": {
            "small": data.Location + "_small.jpg"
          },
          "quality": {
            "high_resolution": data.Location
          }
        }
      }
    }, function(err, result) {

      if (err)
        console.log(err)

      // process image - file.path, type, id
      insertToQueue(file, 'profile', new mongodb.ObjectId(decoded.userId),data.Location)

      // Update image on elastic search
      updateProfileImageElasticSearch(decoded.userId, data.Location + "_small.jpg")

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'PROFILE_IMAGE_CHANGE_SUCCESS',
        data: {
          message: 'Profile image changed successfully',
          data: {
            imageUrl: data.Location
          }
        }
      }))

    })

  }

  function sendfamilyProfile(data) {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'FAMILY_PROFILE_IMAGE_CHANGE_SUCCESS',
      data: {
        message: 'Profile image changed successfully',
        data: {
          imageUrl: data.Location+ "_small.jpg"
        }
      }
    }))

    
  }
  function sendEventImage(data) {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'EVENT_IMAGE_CHANGE_SUCCESS',
      data: {
        message: 'Event image changed successfully',
        data: {
          imageUrl: data.Location+ "_medium.jpg"
        }
      }
    }))

    
  }
  function sendChatImage(data){
     res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'CHAT_IMAGE_UPLODED_SUCCESS',
      data: {
        message: 'Chat image uploaded successfully',
        data: {
          imageUrl: data.Location+ "_medium.jpg"
        }
      }
    }))

  }


  /**
   * @method
   * @param {json} data
   * @param {string} field
   * @collection  temp
   * @desc Insert the image details to temp collection
   *
   */
   function insertToCollection(data, field, file) {
    console.log("###########################################")
    console.log(data)
    console.log("__________________________________________________")
    console.log(field)
    console.log("__________________________________________________")
    console.log(file)

    console.log("###########################################")

    var date = new Date()
    var insertJson = `{
      "` + field + `": {
        "quality" : {
          "high_resolution" : "` + data.Location + `"
        },
        "thumbnail":{}
      }
    }`

    insertJson = JSON.parse(insertJson)
    insertJson.userId = new mongodb.ObjectId(decoded.userId)
    insertJson.dateCreated = new Date()
    insertJson.processId=file.name
    console.log("%%%%%%%%%%%%%%%%%      %%%%%%%%%%%%%%%%%%%    %%%%%%%%%%%%%%%%%%%%%%")
    console.log(insertJson)
    console.log("%%%%%%%%%%%%%%%%%      %%%%%%%%%%%%%%%%%%%    %%%%%%%%%%%%%%%%%%%%%%")

    var temp = db.get().collection('temp')
    temp.insertOne(insertJson, function(err, result) {
      if (err)
        console.log(err)

      // process image - file.path, type, id
      insertToQueue(file, 'photo', new mongodb.ObjectId(result.insertedId),data.Location)

      // console.log(result)
      console.log('image insert id')
      console.log(result.insertedId)
      sendSuccess(data)
    })

  }




  function updateProfileImageElasticSearch(userId, image) {

    var data = {
      doc: {
        image: image
      }
    }

    request.post(config.get('updateProfileImageElasticSearchUrl')+ userId + '/_update', {
      json: data
    }, function(err, response) {
      if (err) {
        console.log("err")
        console.log(err)
      }

      if (response) {
        console.log("response")
        console.log(response.body)
      }
    })
  }







  /**
   * @method
   * @param {json} data
   * @desc Send success response
   *
   */
   function sendSuccess(data) {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'FILE_UPLOADED',
      data: {
        message: 'File uploaded successfully',
        data: {
          imageUrl: data.Location
        }
      }
    }))
  }


  function stringToInt(str) {
    str = str.toString()
    var hash = 0;
    if (str.length == 0) return hash;
    for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash;
  }


  /**
   * @method
   * @param {string} userId
   * @param {string} fileName
   * @desc Trigger Lambda to resize the image uploaded to S3 bucket
   *
   */
   function publishSns(userId, fileName, field, file) {

    switch (field) {

      case 'photo':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "processId":file.name,
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "fid": '_' + file.size + '_' + stringToInt(file.name),
        "sizes": [{
          "resizedFileName": fileName + "_small.jpg",
          "width": 125,
          "height": 125,
          "quality": 70,
          "blur": false
        },
        {
          "resizedFileName": fileName + "_medium.jpg",
          "width": 486,
          "height": 486,
          "quality": 70,
          "blur": true
        },
        {
          "resizedFileName": fileName + "_big.jpg",
          "width": 2048,
          "height": 1152,
          "quality": 70,
          "blur": true
        }
        ]
      }]
      break
      case 'cover_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "processId": file.name,
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_medium.jpg",
          "width": 686,
          "height": 686,
          "quality": 70,
          "blur": true
        },
        {
          "resizedFileName": fileName + "_big.jpg",
          "width": 1024,
          "height": 576,
          "quality": 70,
          "blur": false
        }
        ]
      }]
      break
      case 'user_cover_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_small.jpg",
          "width": 293,
          "height": 178,
          "quality": 70,
          "blur": false
        },
        {
          "resizedFileName": fileName + "_big.jpg",
          "width": 620,
          "height": 435,
          "quality": 70,
          "blur": true
        }
        ]
      }]
      break

      case 'user_profile_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_small.jpg",
          "width": 125,
          "height": 125,
          "quality": 70,
          "blur": false
        }]
      }]
      break

      case 'family_profile_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_small.jpg",
          "width": 125,
          "height": 125,
          "quality": 70,
          "blur": false
        }]
      }]
      break

        case 'event_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_medium.jpg",
          "width": 686,
          "height": 686,
          "quality": 70,
          "blur": true
        },
        {
          "resizedFileName": fileName + "_big.jpg",
          "width": 1024,
          "height": 576,
          "quality": 70,
          "blur": false
        }
        ]
      }]
      break
        case 'chat_image':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_medium.jpg",
          "width": 686,
          "height": 686,
          "quality": 70,
          "blur": true
        },
        {
          "resizedFileName": fileName + "_big.jpg",
          "width": 1024,
          "height": 576,
          "quality": 70,
          "blur": false
        }
        ]
      }]
      break

      case 'profile_picture':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": userId,
        "originalFileName": fileName,
        "type": field,
        "sizes": [{
          "resizedFileName": fileName + "_small.jpg",
          "width": 125,
          "height": 125,
          "quality": 70,
          "blur": false
        }]
      }]
      break
    }

    var params = {
      Message: JSON.stringify(payload),
      Subject: config.get('sns.resize_subject'),
      TopicArn: config.get('sns.resize_topic_arn')
    }
    console.log('sns params')
    console.log(params)

    sns.publish(params, function(err, data) {
      if (err) throw err
        console.log("#######################   publishSns error  ############################")
      console.log(err)
      console.log("#######################   publishSns data  ############################")
      console.log(data)
    })

  }

})

module.exports = router
