/**
* @file 
* @desc Profile Picture Upload to S3 bucket
* @author Deepak
* @date 14 June 2017
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
const config = require('config')

var AWS = require('aws-sdk')
AWS.config.update({
  accessKeyId: config.get('s3.access_key'),
  secretAccessKey: config.get('s3.secret_key'),
  region: config.get('s3.region')
})
const s3 = new AWS.S3({ apiVersion: config.get('s3.api_version')})
const sns = new AWS.SNS({ apiVersion: config.get('sns.api_version')})

/**
 * @callback
 * @param {string} firstName
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('got request profile')


  try{

    var form = new formidable.IncomingForm()

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = false

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

      var fileType = file.type.split("/")[1]
      var supportedFileTypes = ['jpeg', 'png']

      if ( supportedFileTypes.indexOf(fileType) == '-1' ) {

        res.status(400).json( common.formatResponse({
         type: 'validationError',
         code: 'INVALID_FILE_FORMAT',
         data: 'Invalid file format'
       }))

      }else{      

     fs.readFile(file.path, function(err, data) {

      if(err) {
        throw err
      }else{
       // console.log(data)
       uploadToBucket(data, file, field)
     }

   })

   }

 })

    form.parse(req);

  } catch(err){
    res.status(401).json( common.formatResponse({
     type: 'validationError',
     code: 'GENERAL_ERROR',
     data: 'Something went wrong'
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
   function uploadToBucket(inputBuffer, file, field){
    console.log('uploading to S3 bucket...')

    var currentTime = new Date().getTime()
    var encFileName = common.hashString( currentTime+':'+file.name )

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
      } else{
        console.log('Successfully uploaded photo.')
        console.log(data)   

        insertToCollection(data, field)
        publishSns(encFileName, field)

      }
    })

  }

  /**
   * @method
   * @param {json} data
   * @param {string} field 
   * @collection  temp 
   * @desc Insert the image details to temp collection
   *
   */
   function insertToCollection(data, field){

     var date = new Date()   
     var insertJson = `{
      "`+field+`": {
        "quality" : {
          "high_resolution" : "`+data.Location+`"
        },
        "thumbnail":{}
      }                  
    }`

    insertJson = JSON.parse(insertJson)
   // insertJson.userId = new mongodb.ObjectId(decoded.userId)
    insertJson.dateCreated = new Date()

    var temp = db.get().collection('temp')
    temp.insertOne( insertJson, function(err, result){
      if(err) 
        console.log(err)

      // console.log(result)
      console.log('image insert id')
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
          imageUrl : data.Location
        }
      }
    }))
   }

  /**
   * @method
   * @param {string} userId
   * @param {string} fileName 
   * @desc Trigger Lambda to resize the image uploaded to S3 bucket
   *
   */
   function publishSns(fileName, field){

    switch (field) {

      case 'profile_picture':
      var payload = [{
        "bucket": config.get('s3.bucket'),
        "notifyHost": config.get('sns.notifyHost'),
        "notifyPort": config.get('sns.notifyPort'),
        "notifyPath": config.get('sns.notifyPath'),
        "userId": "TEMP_USER",
        "originalFileName": fileName,
        "type": field,
        "sizes": [
        {
          "resizedFileName": fileName+"_small.jpg",
          "width": 125,
          "height": 125,
          "quality": 70
        }
        ]
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
        console.log(data)
    })

  }

})

module.exports = router