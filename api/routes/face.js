/**
 * @file
 * @desc Faces
 * @author Deepak
 * @date 18 Apr 2018
 *
 */

 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var mongodb = require('mongodb')

/**
 * @method
 * @return {json} Success or error message
 * @desc POST  - Clear notification details of a user
 *
 */
 router.get('/thumbnails/:tempId', function(req, res) {
  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded) {

    var userId = new mongodb.ObjectId(req.body.userId)
    console.log(req.params)
    getFacesFromTempId(req.params.tempId, function(result) {
      // Send success
      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'FACE_FETCH_SUCCESS',
        data: {
          message: 'Face data has been fetched',
          data: result
        }
      }))

    })

  })
})


 router.get('/similar/:faceId/:offset/:limit', function(req, res) {

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }


  verifyToken(token, res, function(decoded) {

    var userId = new mongodb.ObjectId(decoded.userId)
    console.log(req.params)
    getFacesFromFaceId(req.params.faceId, function(result) {

      getPhotoDetails(result, userId,req.params.offset,req.params.limit, function(photo_result) {
        // Send success
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'SIMILAR_FACE_FETCH_SUCCESS',
          data: {
            message: 'Face data has been fetched',
            data: photo_result
          }
        }))
      })

    })
  })
})


/**
 * @method
 * @param {string} token - Auth Token
 * @param {json} res - Response Object
 * @param {function} callback
 * @desc verify auth token
 *
 */
 function verifyToken(token, res, callback) {
  try {
    var decoded = jwt.verify(token, common.getSecret())
    callback(decoded)
  } catch (err) {
    sendAuthError(res)
  }
}


function getFacesFromTempId(tempId, callback) {
  db.get().collection('faces').find({
    "image_id": new mongodb.ObjectId(tempId)
  }).toArray(function(err, result) {
    if (err)
      throw err
    callback(result)
  })
}


function getPhotoDetails(photos, userId,offset,limit, callback) {
console.log("offset",offset)
console.log("limit",limit)
  var photoList = []
  var counter = 0
  console.log(photos)
  //console.log("**************************************************")
  console.log('photos length', photos.length)
   console.log("**************************************************")


var CI = setInterval(() => {
if(photos.length == counter) {

console.log('FULL MATCH', photoList)



 var newPhotoList = []
          var photoListIds = []
          var pCounter = 0
          // filter
           var found = false
           //console.log('photoList', photoList)
           photoList.forEach(function(item) {
            pCounter++

            if(newPhotoList.length == 0) {
              newPhotoList.push(item)
              photoListIds.push(item.photo_id.toString())
            } else {
              if(photoListIds.indexOf(item.photo_id.toString()) == -1) {
                newPhotoList.push(item)
                photoListIds.push(item.photo_id.toString())
              }
            }
            console.log('pCounter: '+pCounter+' ==  photoList.length: '+photoList.length)
            if(pCounter == photoList.length) {
              console.log('CALLING CALLBACK===')
              callback(newPhotoList)
            }

           })




clearInterval(CI)


}
}, 300)

  photos.forEach(function(item) {

//console.log("**************************************************")
  console.log('item==', item)
  //  console.log("**************************************************")
    if (item.image_type == "photo") {

      db.get().collection('memmbles').find({
        "photos.temp_id": new mongodb.ObjectId(item.image_id)
      }, {
        'photos.$': 1,
        'album': 1
      }).toArray(function(err, result) {
       console.log('resultHERE')
        if (err)
          throw err
       // console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                          ",result.length)
        counter++
        console.log('counter++', counter)
        if (result.length != 0) {

          let photoObj = {
            memmble_id: result[0]._id,
            visibility: result[0].album.visibility,
            photo_id: result[0].photos[0].photo_id,
            thumbnail: result[0].photos[0].thumbnail,
            distance: item.distance,
            image_type: item.image_type
          }

console.log('STEP 1')

          if (result[0].album.visibility == "private") {
            // is owned by user?
            console.log("===========PRIVATE")
            //console.log('result[0].album.user_id', result[0].album.user_id)
            //console.log('userId', userId)
            if (result[0].album.user_id.toString() == userId.toString()) {
              console.log('--MATCHED')
             // listPhotoIds(photoObj,photoList)
             photoList.push(photoObj)

console.log('STEP 2')

            } else if (result[0].album.people.indexOf(userId) != -1) {

             //listPhotoIds(photoObj,photoList)
             photoList.push(photoObj)
console.log('STEP 3')

           }
         } else {
         // listPhotoIds(photoObj,photoList)
         photoList.push(photoObj)
console.log('STEP 4')

        }

console.log('STEP 5', counter)
console.log('STEP 6', photos.length)

console.log('photos.length',photos.length )
console.log('counter', counter)

        if (photos.length == counter) {
console.log('INSIDE IF')
          //callback(photoList)
/*          var newPhotoList = []
          var photoListIds = []
          var pCounter = 0
          // filter
           var found = false
           //console.log('photoList', photoList)
           photoList.forEach(function(item) {
            pCounter++

            if(newPhotoList.length == 0) {
              newPhotoList.push(item)
              photoListIds.push(item.photo_id.toString())
            } else {
              if(photoListIds.indexOf(item.photo_id.toString()) == -1) {
                newPhotoList.push(item)
                photoListIds.push(item.photo_id.toString())
              }
            }
            console.log('pCounter: '+pCounter+' ==  photoList.length: '+photoList.length)
            if(pCounter == photoList.length) {
              console.log('CALLING CALLBACK===')
              callback(newPhotoList)
            }

           })
*/
          // end filter

        }

        } // end if

      })

    } else {
      counter++
    }


  })

  
}

function listPhotoIds(photoObj,photoList){
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
    console.log(photoList.length)
    console.log(photoObj.photo_id)
    console.log(photoList)
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")

    if(photoList.length!=0){
      photoList.forEach(function(item){

        if(item.photo_id != photoObj.photo_id){
         photoList.push(photoObj)

       }

     }) 
    }else{
     photoList.push(photoObj)

   }

 }

function getFacesFromFaceId(faceId,callback) {

  db.get().collection('faces').find({
    "_id": new mongodb.ObjectId(faceId)
  }).toArray(function(err, result) {
    if (err)
      throw err
    console.log(result)
    var face128 = []
    for (let i = 1; i <= 128; i++) {
      face128.push(result[0]['v_' + i])
    }

    console.log('---BEGIN FACE_TO_COMPARE---', face128)
    console.log('url', result[0].image_url)
    console.log('---END_FACE_TO_COMPARE---')

    var powSum = []
    var index = 1
    for (item of face128) {
      let power = {
        $pow: [{
          $subtract: ['$v_' + index, item]
        }, 2]
      }
      index++
      powSum.push(power)
    }

    db.get().collection('faces').aggregate([{
      $project: {
        _id: 1,
        image_id: 1,
        image_type: 1,
        distance: {
          $sqrt: {
            $sum: powSum
          }
        }
      }
    },
    {
      $match: {
        "distance": {
          $lte: 0.5
        }
      }
    }
    ]).toArray(function(err, result) {
      if (err) {
        console.log(err)
        throw err
      }
      callback(result)
    })

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

module.exports = router
