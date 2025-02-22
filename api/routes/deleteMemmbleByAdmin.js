/**
 * @file
 * @desc GET/ Add /Update/ Like/ Unlike Memmble
 * @author Deepak
 * @date 07 Apr 2017
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
const crypto = require('crypto')
var mongodb = require('mongodb')
var request = require('request')
var io = require('socket.io-client')
const config = require('config')

var AWS = require('aws-sdk')

const rekognition = new AWS.Rekognition({
  apiVersion: '2016-06-27'
})



/**
 * @callback
 * @param {string} memmbleId
 * @desc Delete a memmble
 * @return {json} success or error message
 *
 */
router.delete('/', function(req, res) {
console.log("req.body.memmbleId",req.body.memmbleId)
console.log("req.body.userId",req.body.userId)

  // var token = ''
  // if (req.headers.authorization) {
  //   var token = req.headers.authorization.split(" ")[1]
  // }

  try {
    // var decoded = jwt.verify(token, common.getSecret())
    var memmbleId = new mongodb.ObjectId(req.body.memmbleId.trim())
    var userId = new mongodb.ObjectId(req.body.userId)

    console.log('memmbleId: ' + memmbleId)
    console.log('userId: ' + userId)

    console.log('delete mem')
    console.log(memmbleId)

    getMemmbleToDeleteById(memmbleId, function(data) {

      console.log("data")
      console.log(data)

      if (data.length > 0) {

        for (photo of data[0].photos) {
          console.log("photo : " + photo.photo_id)
          deletePhotoElasticSearch(photo.photo_id)
        }

        // for(video of data[0].videos){
        //   console.log("video : " + video.video_id)
        // deletePhotoElasticSearch(photo.photo_id)
        // }
      }

      deleteMemmbleComments(memmbleId)
      deleteMemmbleElasticSearch(memmbleId)
      deleteMemmble(memmbleId, userId)

      /**
       * @callback
       * @param {string} memmbleId
       * @desc Delete all comments of a Photos and Videos in a Memmble
       * @collection comments
       *
       */
      function deleteMemmbleComments(memmbleId) {
        var comments = db.get().collection('comments')
        comments.remove({
          "memmble_id": new mongodb.ObjectId(memmbleId)
        })
      }


      /**
       * @callback
       * @param {string} memmbleId
       * @desc Delete whole memmble from DB
       * @collection memmbles
       *
       */
      function deleteMemmble(memmbleId, userId) {
        deleteFaces(memmbleId)
        var memmbles = db.get().collection('memmbles')
        memmbles.remove({
          "_id": new mongodb.ObjectId(memmbleId)
        })
        decrementMemmbleCountByOne(userId)
      }


      function deleteFaces(memmbleId) {
        // get all photos of this memmble_id
        var faces = db.get().collection('faces')
        var memmbles = db.get().collection('memmbles')

        memmbles.find({
          "_id": new mongodb.ObjectId(memmbleId)
        }).toArray(function(err, result) {
          console.log('==========', result)

          // get temp_id of each photo
          result[0].photos.forEach(function(photo) {

            if (photo.hasOwnProperty("temp_id")) {
              // delete face
              faces.remove({
                image_id: new mongodb.ObjectId(photo.temp_id)
              }, function(err, result) {
                if (err) console.log(err)
                console.log('face data deleted')
              })
            }
          })
        })
      }

      /**
       * @method
       * @param {string} userId
       * @collection users
       * @desc Decrement memmble meta count by one
       *
       */
      function decrementMemmbleCountByOne(userId) {

        var users = db.get().collection('users')
        users.update({
          "_id": new mongodb.ObjectId(userId)
        }, {
          $inc: {
            "meta_count.memmbles": -1
          }
        }, function(err, result) {
          if (err)
            console.log(err)

          res.status(200).json(common.formatResponse({
            type: 'success',
            code: 'MEMMBLE_DELETE_SUCCESS',
            data: {
              message: 'Memmble deleted successfully',
              data: {
                "memmbleId": memmbleId
              }
            }
          }))

        })
      }


    })

  } catch (err) {
    sendAuthError(res)
  }

})


/**
 * @method
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json}
 * @desc Get all memmbles of a user
 * @collection - memmbles
 *
 */
function getMemmbleToDeleteById(memmbleId, callback) {

  var memmbles = db.get().collection('memmbles')
  memmbles.find({
    "_id": memmbleId,
  }).toArray(function(err, result) {
    if (err) {
      console.log(err)
      throw err
    }
    var details = result
    callback(details)
  })
}




/**
 * @method
 * @param {object} res - Response object
 * @return {json} error message
 * @desc Send Authentication Error
 *
 */
function sendAuthError(res) {

  res.status(401).json(common.formatResponse({
    type: 'authorizationError',
    code: 'INVALID_TOKEN',
    data: 'User authentication failed'
  }))
  return
}

function deletePhotoElasticSearch(photoId) {

  request.delete(config.get('photoToElasticSearchUrl') + photoId, {}, function(err, response) {
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
 * @callback
 * @param {string} memmbleId
 * @desc Delete Memmble from elastic search
 *
 */
 function deleteMemmbleElasticSearch(memmbleId) {

  request.delete(config.get('memmbleToElasticSearchUrl') + memmbleId, {},
    function(err, response) {
      if (err) {
        console.log("err")
        console.log(err)
      }

      if (response) {
        console.log("deleteMemmbleElasticSearch response")
        console.log(response.body)
      }
    })
}


module.exports = router
