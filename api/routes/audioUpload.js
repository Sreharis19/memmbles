/**
* @file 
* @desc Audio Upload to S3 bucket
* @author Deepak
* @date 13 Dec 2017
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

  console.log('got request')

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())

    var form = new formidable.IncomingForm()

    // specify that we do not want to allow the user to upload multiple files in a single request
    form.multiples = false

    form.on('error', function(err){
      console.log(err)

      res.status(400).json( common.formatResponse({
       type: 'validationError',
       code: 'INVALID_FILE_FORMAT',
       data: 'Invalid file format'
     }))

    })

    var url = ""
    form.on('field', function(name, value) {
      switch(name) {
        case 'url' : 
        console.log("vvvvvvvvvvaaaaaaaallllllllllllllllllllluuuuuuuueeeeeeeeeeeee         ", value)
        url = value
        break
      }
    })

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function(field, file) {
      console.log('file')
      // console.log(field)

      var fileType = file.type.split("/")[1]
      
      var supportedFileTypes = ['mp3', 'wav', 'amr', 'm4a','mpeg','x-m4a']
      var fileSize = file.size // in bytes
      var maxAllowedFileSize = config.get('maxAllowedFileSize_audio') // in bytes

      if ( supportedFileTypes.indexOf(fileType) == '-1' ) {

        res.status(400).json( common.formatResponse({
         type: 'error',
         code: 'INVALID_FILE_FORMAT',
         data: {
          message: 'You can upload only MP3 and WAV files',
          data: {
            file: file
          }
        } 
      }))

      } else {      

        if(fileSize > maxAllowedFileSize) {

          res.status(400).json( common.formatResponse({
           type: 'error',
           code: 'INVALID_FILE_SIZE',
           data: {
            message: 'Voice size cannot exceed '+ Math.floor(maxAllowedFileSize * 0.000001)+' MB',
            data: {
              file: file
            }
          } 
        }))

        }else{

         fs.readFile(file.path, function(err, data) {
          if(err) {
            throw err
          }else{
           uploadToBucket(data, file, url, field)
         }
       })

       }
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
   function uploadToBucket(inputBuffer, file, url, field){
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
        console.log('There was an error uploading your voice: ')
        console.log(err.message)
      } else{
        console.log('Successfully uploaded voice.')
        console.log(data)   

        insertToCollection(data, url, field,file)

      }
    })

  }

  /**
   * @method
   * @param {json} data
   * @param {string} field 
   * @collection  temp 
   * @desc Insert the voice details to temp collection
   *
   */
   function insertToCollection(data, url, field,file) {

     var date = new Date()   
     var insertJson = `{
      "type": "audio",
      "audio": "`+data.Location+`",
      "image_url": "`+url+`"             
    }`

    insertJson = JSON.parse(insertJson)
    insertJson.userId = new mongodb.ObjectId(decoded.userId)
    insertJson.dateCreated = new Date()
    insertJson.processId=file.name

    var temp = db.get().collection('temp')

    // Delete existing audio before uploading new
    temp.remove( {type: "audio", image_url: url}, function(err, result) {
      if(err)
        console.log(err)

      temp.insertOne( insertJson, function(err, result){
        if(err) 
          console.log(err)
        
        // Update data
        let rawUrl = url.split("_")
        rawUrl = rawUrl[0]
        temp.update({
          "photo.quality.high_resolution" : rawUrl
        },{
          $set : { 
            "audio" : insertJson.audio 
          } 
        } , function(err, result) {
          if(err)
            console.log(err)
        })

      // console.log(result)
      console.log('voice insert id')
      console.log(result.insertedId)
      sendSuccess(data)         
    })

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
          audioUrl : data.Location
        }
      }
    }))
   }


 })

module.exports = router