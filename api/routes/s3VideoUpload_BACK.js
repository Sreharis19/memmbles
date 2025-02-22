/**
* @file 
* @desc Video Upload to S3 bucket
* @author jins
* @date 02 December 2019
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


//new
const multer = require('multer');  
const upload = multer({dest:'/uploads'});
var path = require('path');
//AWS.config.update({useAccelerateEndpoint:true});
const s3 = new AWS.S3({
    signatureVersion: 'v4',
    accessKeyId: config.get('s3.access_key'),
    secretAccessKey:config.get('s3.secret_key'),
    region : config.get('s3.region'),
    //useAccelerateEndpoint:true,
    apiVersion: config.get('s3.api_version')
}); 

//===========

// AWS.config.update({
//   accessKeyId: config.get('s3.access_key'),
//   secretAccessKey: config.get('s3.secret_key'),
//   region: config.get('s3.region')
// })
// const s3 = new AWS.S3({
//   apiVersion: config.get('s3.api_version')
// })
const sns = new AWS.SNS({
  apiVersion: config.get('sns.api_version')
})
/**
 * @callback
 * @param {string} firstName
 * @return {json} success or error message
 *
 */
 router.post('/',function(req, res) {
  req.setTimeout(1200000000);
  //console.log('got request',req)

  console.log(req.file);


// Saving without validation

var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1];
  }
 var file=req.file;
 var decoded = jwt.verify(token, common.getSecret());
  const conte=fs.readFileSync(req.file.path); 
  var currentTime = new Date().getTime()
  var encFileName = common.hashString( decoded.userId+':'+currentTime+':'+req.file.name )
  console.log('Uploading...');
  const params = {
    Bucket: config.get('s3.bucket'),
    Key: encFileName,
    ContentType: req.file.type,
    Body: conte,
    ACL:'public-read'
  }
  s3.upload(params).on('httpUploadProgress',(evt)=>{
    let data= parseInt((evt.loaded*100)/evt.total); 
    console.log('Uploading...'+data+'%');
  }).send((err,data)=>{
    if (err) {
      res.status(500).send("Error -> " + err); 
       // res.status(401).json( common.formatResponse({
       //   type: 'authorizationError',
       //   code: 'INVALID_TOKEN',
       //   data: 'User authentication failed'
       // }))
      console.log(err);
    }else{
      console.log('Successfully uploaded video.')
        console.log(data) 
        let thumbnail = config.get('s3.video_thumbnailUrl');           

        notifyUploadCompleted(req.file.originalname, data.Location, thumbnail,  decoded.userId);

        insertToCollection(data, 'video',file,thumbnail);
 
    }
    //res.status(200).json({"msg":"File Uploaded successfully","Location":data.Location});
  });   




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
        let thumbnail = config.get('s3.video_thumbnailUrl')
        notifyUploadCompleted(encFileName, data.Location, thumbnail,  decoded.userId)
        insertToCollection(data, field,file,thumbnail)

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

      // console.log(result)4
      console.log(result);
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