/**
* @file 
* @desc Video Upload to S3 bucket
* @author Deepak
* @date 09 June 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var formidable = require('formidable')
var fs = require('fs')
var mongodb = require('mongodb')
const crypto = require('crypto')
var io = require('socket.io-client')
const config = require('config')
var ffmpeg = require('ffmpeg');
//import ThumbnailGenerator from 'video-thumbnail-generator';
const ThumbnailGenerator = require('video-thumbnail-generator').default;
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

  console.log('got request',req)

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())

    var form = new formidable.IncomingForm()

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true

    form.on('error', function(err){
      console.log(err)

      res.status(400).json( common.formatResponse({
       type: 'validationError',
       code: 'INVALID_FILE_FORMAT',
       data: 'Invalid file format'
     }))

    })

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function(field, file) {
      console.log('file')
      // console.log(field)
      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
      console.log('file')
      console.log(file) 
      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")

      var fileType = file.type.split("/")[1]

      console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                             @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",fileType)

      var supportedFileTypes = ['avi', 'mp4','mov', 'quicktime','3gp','3gpp']
      var fileSize = file.size // in bytes
      var maxAllowedFileSize = config.get('maxAllowedFileSize_video') // in bytes

      if ( supportedFileTypes.indexOf(fileType) == '-1' ) {

        res.status(400).json( common.formatResponse({
         type: 'error',
         code: 'INVALID_FILE_FORMAT',
         data: {
          message: 'You can upload only AVI and MP4 files',
          data: {
            file: file
          }
        } 
      }))

      } 
      if(field == "chat_video" && fileSize > maxAllowedFileSize) {



        res.status(400).json( common.formatResponse({
         type: 'error',
         code: 'INVALID_FILE_SIZE',
         data: {
          message: 'Video size cannot exceed '+ Math.floor(maxAllowedFileSize * 0.000001)+' MB',
          data: {
            file: file
          }
        } 
      }))
        
     }
      // else if(fileSize > maxAllowedFileSize) {

      //   res.status(400).json( common.formatResponse({
      //    type: 'error',
      //    code: 'INVALID_FILE_SIZE',
      //    data: {
      //     message: 'Video size cannot exceed '+ Math.floor(maxAllowedFileSize * 0.000001)+' MB',
      //     data: {
      //       file: file
      //     }
      //   } 
      // }))

      // }
      else{      

        console.log(fileType)
     console.log(file.name)
//           console.log(file.data) 


//           let output = '';

// const readStream = fs.createReadStream(file.path);
// const eol = require('eol')

// readStream.on('data', function(chunk) {
//   output += eol.auto(chunk.toString('utf8'));
// });

// readStream.on('end', function() {
//   console.log('finished reading');
//   // write to file here.
// });
 
    //uploadToBucket(file.data, file, field)


     fs.readFile(file.path, function(err, data) {

      if(err) {
        throw err
      }else{
       console.log("finished reading",data)
       uploadToBucket(data,file, field)
     }

   })

   }

 })

    form.parse(req);

  } catch(err){
    res.status(401).json( common.formatResponse({
     type: 'authorizationError',
     code: 'INVALID_TOKEN',
     data: 'User authentication failed'
   }))
    return
  }

  /**
   * @method
   * @param {buffer} inputBuffer
   * @param {json} file 
   * @param {string} field 
   * @param {json} data
   *
   */
   function uploadToBucket(inputBuffer,file, field){
    console.log('uploading to S3 bucket...')
    console.log(decoded.userId)

    var currentTime = new Date().getTime()
    var encFileName = common.hashString( decoded.userId+':'+currentTime+':'+file.name )

    s3.upload({
      Bucket: config.get('s3.bucket'),
      Key: encFileName,
      ContentType: file.type,
      Body: inputBuffer,
      ACL: 'public-read'
    }, function(err, data) {
      if (err) {
        console.log('There was an error uploading your video: ')
        console.log(err.message)
      } else{
        console.log('Successfully uploaded video.')
        console.log(data) 

        // var proc = new ffmpeg('tij19q1529663767580.mp4').takeScreenshots({
        //   count: 1,
        //   timemarks: [ '600' ] // number of seconds
        // }, '../thumbnail', function(err) {
        //   console.log('screenshots were saved')
        // });  
//         var thumbler = require('video-thumb');

// thumbler.extract('tij19q1529663767580.mp4', '../thumbnail/snapshot.png', '00:00:22', '200x125', function(){
    
//     console.log('snapshot saved to snapshot.png (200x125) with a frame at 00:00:22');

// });
// const tg = new ThumbnailGenerator({
//   sourcePath: file.path,
//   thumbnailPath: './thumbnail/'
//   //: '/some/writeable/directory' //only required if you can't write to /tmp/ and you need to generate gifs
// });
// tg.generate()
//   .then(console.log)
// tg.generateOneByPercentCb(90, (err, result) => {
//   console.log("thumbnailllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll",result);
//   fs.readFile('./thumbnail/'+result, function(err, data1) {
//     ///home/ubuntu/api/thumbnail/

//       if(err) {
//         throw err
//       }else{
//        console.log(data1)
//        var encFileName1 = common.hashString( decoded.userId+':'+currentTime+':'+result )
//        //===============
//            s3.upload({
//       Bucket: config.get('s3.bucket'),
//       Key: encFileName1,
//       ContentType: 'image/jpg',
//       Body: data1,
//       ACL: 'public-read'
//     }, function(err, datathumb) {
//       if (err) {
//         console.log('There was an error uploading your thumbnail: ')
//         console.log(err.message)
//       } else{
//         console.log('Successfully uploaded thumbnail.')
//         console.log(datathumb)
//         console.log(data.Location)
        let thumbnail = config.get('s3.video_thumbnailUrl')
        notifyUploadCompleted(file.name, data.Location, thumbnail,  decoded.userId)
        insertToCollection(data, field,file,thumbnail)
        
        // notifyUploadCompleted(file.name, data.Location, thumbnail,  decoded.userId)
//       }
//     })
//        //===============
//        //uploadToBucket(data, file, field)
//      }
//    })
//   // 'test-thumbnail-320x240-0001.png'
// });



        //publishSns(decoded.userId, encFileName, field)

      }
    })

  }

  /**
   * @method
   * @param {json} data
   * @param {string} field 
   * @collection  temp 
   * @desc Insert the video details to temp collection
   *
   */
   function insertToCollection(data, field,file,thumbnail){
    let thumbnailUrl = thumbnail
    console.log("###########################################")
    console.log(file)

    console.log("###########################################")
    var date = new Date()   
    var insertJson = `{
      "video": {
        "quality" : {
          "high_resolution" : "`+data.Location+`"
        },
        "thumbnail":{
          "small": "`+thumbnailUrl+`"
        }
      }                  
    }`

    insertJson = JSON.parse(insertJson)
    insertJson.userId = new mongodb.ObjectId(decoded.userId)
    insertJson.dateCreated = new Date()
    insertJson.processId=file.name

    var temp = db.get().collection('temp')
    temp.insertOne( insertJson, function(err, result){
      if(err) 
        console.log(err)

      // console.log(result)
      console.log('video insert id')
      console.log(result.insertedId)
      sendSuccess(data)         
    })

  }

  /**
   * @method
   * @param {json} data
   * @desc Send success response 
   *
   */
   function sendSuccess(data){

     res.status(200).json( common.formatResponse({
      type: 'success',
      code: 'FILE_UPLOADED',
      data: {
        message: 'File uploaded successfully', 
        data: {
          videoUrl : data.Location
        }
      }
    }))
   }


  /**
   * @method
   * @param {string} videoName
   * @param {string} videoLocation 
   * @desc Notify upload has been completed
   *
   */
   function notifyUploadCompleted(videoName, videoLocation, videoThumbnail,  notifyUserId) {

      // send web socket push   
      var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
        socket.emit('video_uploaded', { 
          topic: notifyUserId,
          data: {
            message: {
              image: {
                type: "video"
              }
            },
            processId: videoName, 
            thumbnail: videoThumbnail,
            url: videoLocation
          } 
        })

        console.log('video socket emitted')
      }


    })

      module.exports = router