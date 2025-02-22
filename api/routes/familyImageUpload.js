/**
 * @file
 * @desc Image upload module
 * @author Deepak
 * @date 23 April 2018
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
 * @POST
 * @desc Resize, upload image to S3
 **/
router.post('/', function(req, res) {

  var images = {
    original: "",
    resized: ""
  }
      // var form = new formidable.IncomingForm()

console.log("req.body req.body",req.body)
  // height and width validations
  if (!req.body.hasOwnProperty('width')) {
    validationError('WIDTH_NOT_FOUND', 'Please specify a width')
  } else {
    if (!validator.isNumeric(req.body.width) || req.body.width == 0) {
      validationError('INVALID_WIDTH', 'Width must be a number and above 0')
    } else {

      if (!req.body.hasOwnProperty('height')) {
        validationError('HEIGHT_NOT_FOUND', 'Please specify a height')
      } else {
        if (!validator.isNumeric(req.body.height) || req.body.height == 0) {
          validationError('INVALID_HEIGHT', 'Height must be a number and above 0')
        } else {

          // other validations
          if (!req.files) {
            // send validation errors
            validationError('FILE_NOT_FOUND', 'Please choose a file')
          } else {
            if (!req.files.image) {
              validationError('INVALID_FILE_NAME', 'Input file name should be image')
            } else {
              var file = req.files.image
              checkFileType(file)
            }
          }

        }
      }

    }
  }

  // check the type of file
  function checkFileType(file) {
      var supportedFileTypes = ['jpeg', 'png']
    if (supportedFileTypes.indexOf(file.mimetype) == -1) {
      validationError('INVALID_FILE_FORMAT', 'Invalid type of file. Supported types are ' + supportedFileTypes.join(', '))
    } else {
      checkFileSize(file)
    }
  }

  // check the size of file
  function checkFileSize(file) {
    var maxAllowedFileSize = config.get('maxAllowedFileSize_img')
    if (file.sizeInByte > maxAllowedFileSize) {
      validationError('INVALID_FILE_SIZE', 'Image size cannot exceed ' + Math.floor(maxAllowedFileSize * 0.000001) + ' MB')
    } else {
      uploadToS3('original', file)
      resizeImage(file)
    }
  }

  // Resize image file
  function resizeImage(file) {
    smartcrop.crop(file.data, {
      width: req.body.width,
      height: req.body.height
    }).then(function(result) {
      var crop = result.topCrop
      sharp(file.data)
        .rotate()
        .extract({
          width: crop.width,
          height: crop.height,
          left: crop.x,
          top: crop.y
        }).resize(parseInt(req.body.width), parseInt(req.body.height))
        .max()
        .jpeg({
          quality: 70
        })
        .toBuffer((err, data, info) => {
          if (err) throw err
          let fileObj = {
            name: "resized",
            mimetype: "image/jpeg",
            data: data
          }
          uploadToS3('resized', fileObj)
        })

    })
  }

  // upload file to S3 bucket
  function uploadToS3(type, file) {
    var currentTime = new Date().getTime()
    var encFileName = common.hashString(decoded.userId + ':' + currentTime + ':' + file.name)

    s3.upload({
      Bucket: config.get('s3.bucket'),
      Key: encFileName,
      ContentType: file.mimetype,
      Body: file.data,
      ACL: 'public-read'
    }, function(err, data) {
      if (err) {
        validationError('UPLOAD_FAILED', err.message)
      } else {
        console.log('Successfully uploaded photo.')
        images[type] = data.Location
        if (images['resized'] != '' && images['original'] != '') {
          // send success
          resizeSuccess()
        }
      }
    })
  }

  function resizeSuccess() {
    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'FAMILY_PROFILE_IMAGE_CHANGE_SUCCESS',
      data: {
        message: "Image has been uploaded",
        data: images
      }
    }))
    return
  }

  function validationError(status, msg) {
    res.status(400).json(common.formatResponse({
      type: 'error',
      code: status,
      data: msg
    }))
    return
  }

})

module.exports = router
