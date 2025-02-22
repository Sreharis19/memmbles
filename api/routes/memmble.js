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
 var firebase = require('../functions/pushFirebase.js')


 var AWS = require('aws-sdk')
 AWS.config.update({
  accessKeyId: config.get('s3.access_key'),
  secretAccessKey: config.get('s3.secret_key'),
  region: config.get('s3.region')
})

 const rekognition = new AWS.Rekognition({
  apiVersion: config.get('rekognition.apiVersion')
})

/**
 * @method
 * @return {json} Success or error message
 * @desc Get list of all Memmbles of Logged in User
 *
 */
 router.get('/', function(req, res) {
  console.log("inside get")
  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)

    getUserMemmbles(userId, function(data) {

      var memmbles = data
      
      var totalMemmbleCount = data.length

      var finalOutput = []
      var totalItemToProcess = memmbles.length
      var totalProcessedItem = 0
      var finalProcessedOutputCount = 0

      if (totalMemmbleCount > 0) {

        for (memmble of memmbles) {

          totalProcessedItem++

          finalOutput[memmble._id] = memmble
          finalOutput[memmble._id].album.people_data = []
          totalItemToProcess += memmble.album.people.length

          if (finalOutput[memmble._id].album.people.length != 0) {
      // for
      for (people of finalOutput[memmble._id].album.people) {

        getUserDetailsNew(new mongodb.ObjectId(people), memmble._id, function(output, memmbleId) {

          if (output.length != 0) {
            let user = {
              user_id: output._id,
              user_name: output.name,
              user_image: output.profile_image.thumbnail.small
            }
            finalOutput[memmbleId].album.people_data.push(user)
          }

          totalProcessedItem++

          if (totalItemToProcess == totalProcessedItem) {

            var finalProcessedOutput = []
            for (index in finalOutput) {
              finalProcessedOutputCount++
              finalOutput[index].album.people = finalOutput[index].album.people_data
              delete finalOutput[index].album.people_data
              finalProcessedOutput.push(finalOutput[index])

              console.log('----')

              if (finalProcessedOutputCount == memmbles.length) {
                console.log('sendSuccessResponse if')
                sendSuccessResponse(finalProcessedOutput, res)

              }
            }

          }
        })
      }
            // for
          } else {

            if (totalItemToProcess == totalProcessedItem) {

              var finalProcessedOutput = []
              for (index in finalOutput) {
                finalProcessedOutputCount++
                finalOutput[index].album.people = finalOutput[index].album.people_data
                delete finalOutput[index].album.people_data
                finalProcessedOutput.push(finalOutput[index])
                console.log('----else')
                if (finalProcessedOutputCount == memmbles.length) {
                  console.log('sendSuccessResponse if else')
                  sendSuccessResponse(finalProcessedOutput, res)

                }
              }
            }

          }




        }

      } else {
        console.log("else")
        sendSuccessResponse(data, res)
      }

    })

  } catch (err) {
    sendAuthError(res)
  }
})





/**
 * @method
 * @return {json} Success or error message
 * @desc Get list of subscrition plans
 *
 */
 router.get('/plan', function(req, res) {
  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  try {
    getPlanDetails(function(data) {
      var planDetails = {

      }
      //[]
      data.forEach(function(item) {

        planDetails[item.plan] = {
          id: item._id,
          price: parseInt(item.price),
          no_of_memmbles: parseInt(item.no_of_memmbles)
        }

      })
      //planDetails =  JSON.stringify(planDetails)
      console.log(planDetails)

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'PLAN_DETAILS_SUCCESS',
        data: {
          message: 'Plan Details fetched successfully',
          data: {
            details: planDetails
          }
        }
      }))
    })

  } catch (err) {
    sendAuthError(res)
  }
})




 function getPlanDetails(callback) {
  var planDetails = db.get().collection('subscription_plans')
  planDetails.find({}).toArray(function(err, result) {
    if (err)
      console.log(err)
    console.log("=================", result)
    var details = result
    callback(details)
  })
}


/**
 * @method
 * @return {json} Success or error message
 * @desc Get list of Memmbles of a User (by User id)
 *
 */
 router.get('/:userId', function(req, res) {

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(req.params.userId.trim())

    var visibility
    (decoded.userId == userId) ? visibility = ['public', 'private'] : visibility = ['public']

    getUserMemmblesByVisibility(userId, visibility, function(data) {
      sendSuccessResponse(data, res)
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
 * @desc Get all memmbles of a user by User Id
 * @collection - memmbles
 *
 */
 function getUserMemmbles(userId, callback) {

  var memmbles = db.get().collection('memmbles')
  memmbles.find({
    "album.user_id": userId
  })
  .sort({"album.date_created" : -1})
  .toArray(function(err, result) {
    if (err) {
      console.log(err)
      throw err
    }
    var details = result

    console.log(details);
    callback(details)
  })
}


/**
 * @method
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json}
 * @desc Get all memmbles of a user by User Id - visibility
 * @collection - memmbles
 *
 */
 function getUserMemmblesByVisibility(userId, visibility, callback) {

  var memmbles = db.get().collection('memmbles')
  memmbles.find({
    "album.user_id": userId,
    "album.visibility": {
      $in: visibility
    }
  })
  .sort({"album.date_created" : -1})
  .toArray(function(err, result) {
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
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponse(data, res) {

  res.status(200).json(common.formatResponse({
    type: 'success',
    code: 'USER_MEMMBLES_SUCCESS',
    data: {
      message: 'User Memmbles fetched successfully',
      data: {
        details: data
      }
    }
  }))
}

/**
 * @method
 * @return {string} memmbleId
 * @return {json} Success or error message
 * @desc Get details of a particular memmble by Memmble ID and Memmble-User ID
 *
 */
 router.get('/:userId/:memmbleId', function(req, res) {

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())

    var memmbleId = new mongodb.ObjectId(req.params.memmbleId.trim())
    var userId = new mongodb.ObjectId(req.params.userId.trim())
    var userIdOrg = new mongodb.ObjectId(decoded.userId)

    getBlockUsers(userIdOrg, function(blist){
    var blockList = blist.notInarray
    var newData = []


    if(blockList){
      blockList.forEach((item)=>  newData.push(item.toString()))
    }

    getMemmbleById(userId, memmbleId, function(data) {
      if(data.length > 0){
        if(data[0].album.people.length){
          data[0].album.people.forEach((pep,index)=>{
            var isBlocked=newData.indexOf(pep)
            if(isBlocked ==0){
              data[0].album.people.splice(index,1)
            }
          })
        }

        incrementViewCount(memmbleId)

        getUserDetails(userId, function(result) {

          data[0].album.user_name = result.name
          data[0].album.user_account_type = result.subscriptions.type
          
          var count = data[0].album.people.length
          var final_output = data
          
          

          if (count > 0) {
            var i = 0;
            for (people of data[0].album.people) {
              /*get details of tagged people in the album*/
              getUserDetails(new mongodb.ObjectId(people), function(output) {

                if(output != undefined) {
                  let user = {
                    user_id: output._id,
                    user_name: output.name,
                    user_image: output.profile_image.thumbnail.small
                  }
                  final_output[0].album.people[i] = user
                }


                if (i == count - 1) {
                  sendSuccess(final_output)
                }

                i++
              })
            }

          } else {
            sendSuccess(final_output)
          }

        })

      }else{

        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_MEMMBLE_SUCCESS',
          data: {
            message: 'The Memmble is unavailable now'
          }
        }))
      }


      



    })
  })

  } catch (err) {
    sendAuthError(res)
  }


  /**
   * @method
   * @param {ObjectId} userId
   * @param {function} callback
   * @return {json}
   * @desc Get all memmbles of a user
   * @collection - memmbles
   *
   */
   function getMemmbleById(userId, memmbleId, callback) {
    

    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      "_id": memmbleId,
      "album.user_id": userId
    })
    .toArray(function(err, result) {
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
   * @param {ObjectId} memmbleId
   * @collection  memmbles
   * @desc Increment the view count of the album
   *
   */
   function incrementViewCount(memmbleId) {

    db.get().collection('memmbles').update({
      "_id": memmbleId
    }, {
      $inc: {
        "album.meta_count.views": 1
      }
    }, function(err, result) {

      if (err) {
        console.log(err)
      } else {
        // console.log(result)
      }
    })
  }

  /**
   * @method
   * @param {json} data
   * @return {json}
   * @desc Send Success response
   *
   */
   function sendSuccess(data) {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'MEMMBLE_SUCCESS',
      data: {
        message: 'Memmble fetched successfully',
        data: {
          details: data
        }
      }
    }))
  }

})


/**
 * @method
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} data
 * @desc Get Name of the User
 * @collection - users
 *
 */
 function getUserDetails(userId, callback) {

  db.get().collection('users').find({
    "_id": userId
  }, {
    "name": 1,
    "profile_image": 1,
    "_id": 1,
    "subscriptions.type": 1
  }).toArray(function(err, result) {
    if (err) {
      console.log(err)
      throw err
    }

    let data = result[0]
    callback(data)
  })
}


/**
 * @method
 * @param {ObjectId} userId
 * @param {ObjectId} memmbleId
 * @param {function} callback
 * @return {json} data
 * @desc Get Name of the User
 * @collection - users
 *
 */
 function getUserDetailsNew(userId, memmbleId, callback) {
  // console.log("userId++++++++++++++++++++++++++++++++",userId)
  db.get().collection('users').find({
    "_id": userId
  }, {
    "name": 1,
    "profile_image": 1,
    "_id": 1
  }).toArray(function(err, result) {
    if (err) {
      console.log(err)
      throw err
    }

    // console.log("+++++++++++++++++=== result", result)

    if (result.length != 0) {
      var data = result[0]
    } else {
      var data = result
    }
    // console.log("+++++++++++++++++=== data", data)
    callback(data, memmbleId)


  })
}

/**
 * @callback
 * @param {string} firstName
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('got requestss')
  console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
  console.log(req.body)
  console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())


    console.log('req.body.action')
    console.log(req.body.action)

    console.log("req.body")
    console.log(req.body)

    switch (req.body.action) {
      case 'create':
      console.log('create case')
      createMemmble(decoded, req.body.uploadedImages, req.body.uploadedVideos)
      break
      case 'update':
      console.log('update case')

      getMemmbleDetails(decoded, req.body.memmbleId, function(data) {
        if (data.album.user_id == decoded.userId) {
          updateMemmble(decoded, req.body.uploadedImages, req.body.uploadedVideos)
        } else {
          throwInvalidError()
        }
      })

      break
      case 'unsavedPhoto':
      getUnsavedPhotos(decoded)
      break
      case 'unsavedVideo':
      getUnsavedVideos(decoded)
      break
      case 'unsavedCoverImage':
      getUnsavedCoverImage(decoded)
      break
      case 'unsavedVoiceCover':
      getUnsavedVoiceCover(decoded)
      break
      case 'getTaggedPeople':
      var userId = new mongodb.ObjectId(decoded.userId)
      getBlockUsers(userId, function(blist){
        var blockList = blist.notInarray
        getTaggedPeople(decoded, req.body.memmbleId,blockList)
      })
      break
      case 'getPhotos':

      getMemmbleDetails(decoded, req.body.memmbleId, function(data) {
        if (data.album.user_id == decoded.userId) {
          getPhotos(decoded, req.body.memmbleId)
        } else {
          throwInvalidError()
        }
      })

      break

      case 'deletePhoto':
      deletePhoto(decoded, req.body.memmbleId, req.body.photoId)
      break
      case 'deleteVideo':
      deleteVideo(decoded, req.body.memmbleId, req.body.videoId)
      break
      case 'likeMemmble':
      likeMemmble(decoded.userId, req.body.memmbleId)
      break
      case 'unlikeMemmble':
      unlikeMemmble(decoded.userId, req.body.memmbleId)
      break
      case 'deleteTempPhoto':
      console.log("case delete temp photos")
      deleteTempPhoto(decoded.userId, req.body.url)
      break
      case 'deleteTempVideo':
      deleteTempVideo(decoded.userId, req.body.url)
      break
    }

  } catch (err) {
    console.log(err)
    res.status(401).json(common.formatResponse({
      type: 'authorizationError',
      code: 'INVALID_TOKEN',
      data: 'User authentication failed'
    }))
    return
  }

  function throwInvalidError() {
    res.status(401).json(common.formatResponse({
      type: 'authorizationError',
      code: 'INVALID_TOKEN',
      data: 'User authentication failed'
    }))
    return
  }

  function getTaggedPeople(decoded, memmbleId,blockList) {
    var newData = []


    if(blockList){
      blockList.forEach((item)=>  newData.push(item.toString()))
    }

    console.log('inside getTaggedPeople')
    console.log('memmbleId: ' + memmbleId)

    //var memmbles = db.get().collection('memmbles')
    // memmbles.find({
    //   _id: new mongodb.ObjectId(memmbleId)
    // })
    db.get().collection('memmbles').aggregate([
    { $match: { "_id" : new mongodb.ObjectId(memmbleId) } },
    {
      $project: {
        "_id" : 0,
        "album.people": {
          $filter: {
            input: "$album.people",
            as: "people",
            cond: { "$not":{ "$in": ["$$people", newData ]}}
          }
        }
      }
    }
  ])
    .toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      // console.log("3333333333333333333333333333333333333",result,result[0]) // why null?

      if (result[0].album.people.length == 0) {

        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_PEOPLE_IN_MEMMBLE',
          data: 'No people in memmble found'
        }))
        return
      } else {

        var peopleCount = result[0].album.people.length
        var i = 0
        var output = []


        for (let userId of result[0].album.people) {

          // getUserDetailsNew(new mongodb.ObjectId(people), memmble._id, function(output, memmbleId) {
            getUserDetailsNew(new mongodb.ObjectId(userId), memmbleId, function(out, memmbleId) {
              i++

              console.log('--out---')
              console.log(out)
              console.log('--memmbleId--')
              console.log(memmbleId)

              let user = {
                _id: out._id,
                _source: {
                  email: out.email,
                  first_name: out.name.first,
                  image: out.profile_image.thumbnail.small,
                  last_name: out.name.last_name
                }
              }

              output.push(user)

              console.log('---output--')
              console.log(output)

              if (i == peopleCount) {

                if (output.length == peopleCount) {

                  res.status(200).json(common.formatResponse({
                    type: 'success',
                    code: 'GET_PEOPLE',
                    data: {
                      message: 'People in memmble retrieved',
                      data: {
                        peopleIds: result[0].album.people,
                        peopleList: output,
                        visibility: result[0].album.visibility,
                        voiceCover: result[0].album.voice_cover
                      }
                    }
                  }))
                  return

                }

              }

            })

          }


        }

      })

  }


  function getMemmbleDetails(decoded, memmbleId, callback) {

    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      _id: new mongodb.ObjectId(memmbleId)
    }).toArray(function(err, result) {
      if (err)
        console.log(err)
      callback(result[0])
    })
  }


  function getPhotos(decoded, memmbleId) {

    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      _id: new mongodb.ObjectId(memmbleId)
    }).toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      if (result.length == 0) {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_PHOTOS_IN_MEMMBLE',
          data: 'No photos in memmble found'
        }))
        return
      } else {
        console.log(result[0].photos)
        var photoList = result[0].photos
        var videoList = result[0].videos
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'GET_PHOTOS',
          data: {
            message: 'Photos in memmble retrieved',
            data: {
              album: result[0].album,
              photos: photoList,
              videos: videoList
            }
          }
        }))
        return
      }

    })

  }

  function deletePhoto(decoded, memmbleId, photoId) {

    // delete face

    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@            delete photo     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")

    isBelongToUser(decoded, memmbleId, function(result){

      if(result){



        var faces = db.get().collection('faces')
        var memmbles = db.get().collection('memmbles')
    // get temp_id
    memmbles.aggregate([{
      "$unwind": "$photos"
    },
    {
      "$match": {
        "photos.photo_id": new mongodb.ObjectId(photoId)
      }
    },
    {
      "$project": {
        "photos.temp_id": 1
      }
    }
    ]).toArray(function(err, result) {
      if (err)
        console.log(err)
      console.log('RESULT====', result)
      if(result){
      if (result[0].photos.hasOwnProperty("temp_id")) {
        // delete face
        faces.remove({
          image_id: new mongodb.ObjectId(result[0].photos.temp_id)
        }, function(err, result) {
          if (err) console.log(err)
            console.log('face data deleted')
        })

      }
    }
    })

    memmbles.update({
      _id: new mongodb.ObjectId(memmbleId)
    }, {
      $pull: {
        photos: {
          photo_id: new mongodb.ObjectId(photoId)
        }
      }
    }, function(err, result) {
      if (err) {
        console.log(err)
      } else {

        deletePhotoElasticSearch(photoId)

        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'PHOTO_DELETED',
          data: {
            message: 'Photo has been deleted',
            data: {
              photoId: photoId,
            }
          }
        }))
      }

    })
  }
})
  }


  function deleteVideo(decoded, memmbleId, videoId) {

   isBelongToUser(decoded, memmbleId, function(result){

    if(result){

      var memmbles = db.get().collection('memmbles')
      memmbles.update({
        _id: new mongodb.ObjectId(memmbleId)
      }, {
        $pull: {
          videos: {
            video_id: new mongodb.ObjectId(videoId)
          }
        }
      }, function(err, result) {
        if (err) {
          console.log(err)
        } else {
          res.status(200).json(common.formatResponse({
            type: 'success',
            code: 'VIDEO_DELETED',
            data: {
              message: 'Video has been deleted',
              data: {
                videoId: videoId,
              }
            }
          }))
        }

      })
    }
  })
 }







 function deleteTempPhoto(decoded, url) {

  var photoUrl = url.split("_")[0]
  console.log(photoUrl)

  var splitUrl = photoUrl.split("/")
  // console.log('==memmbles-production.s3-us-east-2.amazonaws.com')
  //console.log(splitUrl[2])
  if(splitUrl[2] == 'memmbles-production.s3-us-east-2.amazonaws.com') {
    photoUrl = config.get("s3.bucketUrl")+splitUrl[3]
  }

  console.log('np', photoUrl)

  var temp = db.get().collection('temp')
  var faces = db.get().collection('faces')

    // delete face data
    // get id from url
    temp.find({
      "photo.quality.high_resolution": photoUrl
    }).toArray(function(err, result) {
      console.log("result.length",result.length)
      if(result.length!=0){
        console.log('==========', result)
        var idToDelete = result[0]._id
        console.log(idToDelete)

      // delete face
      faces.remove({
        image_id: new mongodb.ObjectId(idToDelete)
      }, function(err, result) {
        if (err) console.log(err)
          console.log('face data deleted')
      })


  //var splitUrl = photoUrl.split("/")
  //console.log('==memmbles-production.s3-us-east-2.amazonaws.com')
  //console.log(splitUrl[2])
  var nphotoUrl = photoUrl
  if(splitUrl[2] == 'memmbles-production.s3-us-east-2.amazonaws.com') {
   nphotoUrl = "https://memmbles-production.s3-us-east-2.amazonaws.com/"+splitUrl[3]
 }


      // delete photo
      temp.remove({
        "photo.quality.high_resolution": photoUrl
      }, function(err, result) {
        //result.photoUrl = nphotoUrl
        if (err) {
          console.log(err)
        } else {
          res.status(200).json(common.formatResponse({
            type: 'success',
            code: 'TEMP_PHOTO_DELETED',
            data: {
              message: 'Photo has been deleted',
              data: {
                photoUrl: nphotoUrl,
                result: result
              }
            }
          }))
        }
      })
    }
  })

  }

  function deleteTempVideo(decoded, url) {

    var videoUrl = url.split("_")[0]
    console.log(videoUrl)

    var temp = db.get().collection('temp')
    temp.remove({
      "video.quality.high_resolution": videoUrl
    }, function(err, result) {
      if (err) {
        console.log(err)
      } else {
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'TEMP_VIDEO_DELETED',
          data: {
            message: 'Video has been deleted',
            data: {
              videoUrl: videoUrl,
              result: result
            }
          }
        }))
      }
    })
  }

  function getUnsavedVoiceCover(decoded) {

    var temp = db.get().collection('temp')

    temp.find({
      voice_cover: {
        $exists: true
      },
      userId: new mongodb.ObjectId(decoded.userId)
    })
    .sort({
      "dateCreated": -1
    })
    .limit(1).toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      if (result.length == 0) {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_VOICE_COVER',
          data: 'No unsaved voice cover found'
        }))
        return
      } else {
        console.log(result)

        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'UNSAVED_VOICE_COVER',
          data: {
            message: 'Unsaved voice cover retrieved',
            data: {
              voiceUrl: result[0].voice_cover
            }
          }
        }))
        return
      }

    })

  }


  function getUnsavedCoverImage(decoded) {

    var temp = db.get().collection('temp')

    temp.find({
      cover_image: {
        $exists: true
      },
      userId: new mongodb.ObjectId(decoded.userId)
    })
    .sort({
      "dateCreated": -1
    })
    .limit(1).toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      if (result.length == 0) {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_COVER_IMAGE',
          data: 'No unsaved cover image found'
        }))
        return
      } else {
        console.log(result)

          // var photoList = []
          // for(image of result) {
          //   if(image.hasOwnProperty('cover_image')) {
          //     photoList.push({small: image.photo.quality.high_resolution+'_small.jpg'})
          //   }
          // }


          res.status(200).json(common.formatResponse({
            type: 'success',
            code: 'UNSAVED_COVER_IMAGE',
            data: {
              message: 'Unsaved cover image retrieved',
              data: {
                meta: {
                  big: result[0].cover_image.quality.high_resolution + '_big.jpg'
                },
                result: result[0].cover_image
              }
            }
          }))
          return
        }

      })

  }


  function getUnsavedPhotos(decoded) {

    var temp = db.get().collection('temp')
    temp.find({
      userId: new mongodb.ObjectId(decoded.userId)
    }).toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      if (result.length == 0) {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_PHOTOS',
          data: 'No unsaved photos found'
        }))
        return
      } else {
        console.log(result)
        var photoList = []
        var audioList = []
        for (image of result) {
          if (image.hasOwnProperty('photo')) {
            photoList.push({
              small: image.photo.quality.high_resolution + '_small.jpg'
            })
          }
          if (image.hasOwnProperty('audio')) {
            audioList.push({
              audio: image.audio,
              image_url: image.image_url
            })
          }
        }
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'UNSAVED_PHOTOS',
          data: {
            message: 'Unsaved photos retrieved',
            data: {
              photos: photoList,
              audios: audioList
            }
          }
        }))
        return
      }

    })

  }


  function getUnsavedVideos(decoded) {

    var temp = db.get().collection('temp')
    temp.find({
      userId: new mongodb.ObjectId(decoded.userId)
    }).toArray(function(err, result) {
      if (err)
        res.status(500).json(common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      if (result.length == 0) {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'NO_VIDEOS',
          data: 'No unsaved videos found'
        }))
        return
      } else {
        console.log(result)
        var videoList = []
        for (video of result) {
          if (video.hasOwnProperty('video')) {
            videoList.push({
              small: video.video.quality.high_resolution
            })
          }
        }
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'UNSAVED_VIDEOS',
          data: {
            message: 'Unsaved videos retrieved',
            data: videoList
          }
        }))
        return
      }

    })

  }



  function updateMemmble(decoded, uploadedImages, uploadedVideos) {

    console.log('inside updateMemmble')
//      processId:req.body.processId

    // get unsaved photos
    var temp = db.get().collection('temp')
    temp.find({
      userId: new mongodb.ObjectId(decoded.userId), processId: req.body.processId
    })
    .sort({
      "dateCreated": 1
    })
    .toArray(function(err, result) {
      if (err)
        console.log(err)

      console.log(result)

        // if(result.length != 0) {


        //---------------------------

        var memmbleObjectId = new mongodb.ObjectId(req.body.memmbleId)
        // album meta
        var memmble = {
          _id: memmbleObjectId,
          album: {
            user_id: new mongodb.ObjectId(decoded.userId),
            processId: req.body.processId,

            title: req.body.title,
            description: req.body.story,
            people: req.body.people
          }
        }

        // var memmble = {
        //   _id : memmbleObjectId,
        //   album: {
        //     user_id:  new mongodb.ObjectId(decoded.userId),
        //     title: req.body.title,
        //     description: req.body.story,
        //     people: req.body.people,
        //     date_created: new Date(),
        //     date_updated: new Date(),
        //     visibility: req.body.visibility,
        //     meta_count : {
        //       likes : 0,
        //       views : 0
        //     },
        //     voice_cover : ""
        //   },
        //   videos : [],
        //   likes : []
        // }

        //#################

        var voiceCover = ""

        var coverImage = {
          "thumbnail": {
            "medium": "",
            "big": ""
          },
          "quality": {
            "high_resolution": ""
          }
        }

        //---------------------------

        var imageCounter = 0

        // get photos
        var photoList = []
        var elasticPhotoData = []
        var videoList = []
        for (image of result) {

          imageCounter++

          if (image.hasOwnProperty('photo')) {

            var photoObjectId = new mongodb.ObjectId()

            // var uploadedImageIndex = this.hashCode(image.photo.quality.high_resolution+'_small.jpg')
            let summary = ''

            var uploadedImageUrl = image.photo.quality.high_resolution + '_small.jpg'

            for (let uploadedImage of uploadedImages) {
              if (uploadedImage.url.split('.com/')[1] == uploadedImageUrl.split('.com/')[1]) {

                if (uploadedImage.hasOwnProperty('summary')) {
                  summary = uploadedImage.summary
                }
              }
            }

            // if (uploadedImages[uploadedImageIndex].hasOwnProperty('summary')) {
            //   summary = uploadedImages[uploadedImageIndex].summary
            // }

            photoList.push({
              "photo_id": photoObjectId,
              "temp_id": image._id,
              "thumbnail": {
                "small": image.photo.quality.high_resolution + '_small.jpg',
                "medium": image.photo.quality.high_resolution + '_medium.jpg',
                "big": image.photo.quality.high_resolution + '_big.jpg'
              },
              "audio": image.audio,
              "description": summary,
              "quality": {
                "high_resolution​": image.photo.quality.high_resolution
              }
            })

            let photoData = {
              photoId: photoObjectId,
              memmbleId: memmbleObjectId,
              description: summary,
              image: image.photo.quality.high_resolution + '_small.jpg'
            }

            elasticPhotoData.push(photoData)

            //addPhotoToElasticSearch(photoData)
          }

          // Video
          if (image.hasOwnProperty('video')) {

            var videoObjectId = new mongodb.ObjectId()
            let summary = ''

            var uploadedVideoUrl = image.video.quality.high_resolution

            for (let uploadedVideo of uploadedVideos) {
              if (uploadedVideo.url == uploadedVideoUrl) {

                if (uploadedVideo.hasOwnProperty('summary')) {
                  summary = uploadedVideo.summary
                }
              }
            }

            videoList.push({
              "video_id": videoObjectId,
              "thumbnail": {
                "small": image.video.thumbnail.small
              },
              "description": summary,
              "quality": {
                "sd": image.video.quality.high_resolution
              }
            })

            let videoData = {
              videoId: videoObjectId,
              memmbleId: memmbleObjectId,
              image: image.video.thumbnail.small
            }

            // addPhotoToElasticSearch(photoData)
          }

          // get voice cover
          if (req.body.hasVoiceCoverChanged) {

            if (image.hasOwnProperty('voice_cover')) {
              voiceCover = image.voice_cover
            }
          }

          // get cover image
          if (req.body.hasCoverImageChanged) {

            if (image.hasOwnProperty('cover_image')) {
              coverImage = {
                "thumbnail": {
                  "medium": image.cover_image.quality.high_resolution + '_medium.jpg',
                  "big": image.cover_image.quality.high_resolution + '_big.jpg'
                },
                "quality": {
                  "high_resolution": image.cover_image.quality.high_resolution
                }
              }
            }
          }

        }

        console.log('imageCounter: ' + imageCounter + ' result.length: ' + result.length)

        req.body.title = req.body.title.trim()
        req.body.story = req.body.story.trim()

        updateMemmbleElasticSearch(req.body.memmbleId, req.body.title, req.body.story)

        if (result.length == imageCounter) {
          console.log('updateCollection')


          var memmbles = db.get().collection('memmbles')
          memmbles.find({
            _id: new mongodb.ObjectId(req.body.memmbleId)
          }).toArray(function(err, result) {
            if (err)
              res.status(500).json(common.formatResponse({
                type: 'dbError',
                code: 'DB_ERROR',
                data: err
              }))

            var photoListCount = result[0].photos.length
            var videoListCount = result[0].videos.length

            if ((photoList.length + videoList.length + photoListCount + videoListCount) == 0) {
              res.status(200).json(common.formatResponse({
                type: 'error',
                code: 'MEMMBLE_CREATE_NO_PHOTO_VIDEO',
                data: {
                  message: 'Please upload at least one image or video'
                }
              }))
            } else {
              if (req.body.title.length < 4 || req.body.title.length > 40) {
                res.status(200).json(common.formatResponse({
                  type: 'error',
                  code: 'MEMMBLE_INVALID_TITLE',
                  data: {
                    message: 'Title should have minimum 4 and maximum 40 characters'
                  }
                }))
              } else if (req.body.story.length < 10 || req.body.story.length > 2000) {
                res.status(200).json(common.formatResponse({
                  type: 'error',
                  code: 'MEMMBLE_INVALID_DESC',
                  data: {
                    message: 'Story should have minimum 10 and maximum 2000 characters'
                  }
                }))
              } else {
                updateCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData)
              }
            }


          })


        }
        // } else {

        //   res.status(200).json( common.formatResponse({
        //     type: 'error',
        //     code: 'MEMMBLE_CREATE_NO_PHOTO_VIDEO',
        //     data: {
        //       message: 'Please upload at least one image or video'
        //     }
        //   }))

        // }
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
   function updateCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData) {

    console.log('---inside updateCollection---')

    
    console.log("444444444444444444444444444444444444444444memmble444444444444444444444444444")
    console.log(memmble)
    console.log("444444444444444444444444444444444444444444memmble444444444444444444444444444")
    var newtag = []
    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      "_id": new mongodb.ObjectId(memmble._id)
    },{"album.people":1,"album.cover_image.thumbnail.medium":1,"album.visibility":1}).toArray(function(err, result) {

      if (err)
        console.log(err)
      console.log("##############################",result[0])
      console.log("result[0].album.cover_image.thumbnail.medium",result[0].album.cover_image.thumbnail.medium)

      if(result[0].album.people.length==0){
        for(let newtagpeople of memmble.album.people){

          newtag.push(newtagpeople)
          
        }

      }else{
        for(let newtagpeople of memmble.album.people){
          if(result[0].album.people.indexOf(newtagpeople)==-1){
            newtag.push(newtagpeople)
          }
        }

      }
      
      console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",newtag)
      console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",result[0].album.cover_image.thumbnail.medium)
      var cover_image = result[0].album.cover_image.thumbnail.medium

      for (let people of newtag) {

        console.log("++++++++++++++++++++++",people)
        firebase.firebaseNotification({
          type: 'tag',
          user_id: new mongodb.ObjectId(people),
          image: result[0].album.cover_image.thumbnail.medium,
          memmble_user_id: memmble.album.user_id
        })

        pushNotificationTag({
          type: 'tag',
          memmble_id: memmble._id,
          tagged_user_id: new mongodb.ObjectId(people),
          image: result[0].album.cover_image.thumbnail.medium,
          album_title: memmble.album.title,
          memmble_user_id: memmble.album.user_id
        })
      }
      console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$             $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
      console.log("memmble.album.visibility",memmble.album.visibility)
      console.log("memmble.album.user_id",memmble.album.user_id)
      if(result[0].album.visibility =='public'){
      	console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$             $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
        var users = db.get().collection('users')
        users.find({
          "_id": memmble.album.user_id
        }, {
          "password": 0
        }).toArray(function(err, result) {
          if (err)
            throw err

          for (let allFollowers of result[0].followers) {

            console.log("allFollowers",allFollowers)
            firebase.firebaseNotification({
              type: 'allFollowersUpdate',
              user_id: new mongodb.ObjectId(allFollowers),
              image: cover_image,
              album_title: memmble.album.title,
              memmble_user_id: memmble.album.user_id
            }) 

            pushNotificationFollow({
              type: 'allFollowersUpdate',
              memmble_id: memmble._id,
              follow_user_id: new mongodb.ObjectId(allFollowers),
              image: cover_image,
              album_title: memmble.album.title,
              memmble_user_id: memmble.album.user_id
            })
          }
        })


      }
      

    })

    




    var operationCount = 0


    // var memmbleObjectId = new mongodb.ObjectId()
    // // album meta
    // var memmble = {
    //   _id : memmbleObjectId,
    //   album: {
    //     user_id:  new mongodb.ObjectId(decoded.userId),
    //     title: req.body.title,
    //     description: req.body.story,
    //     people: req.body.people,
    //     date_created: new Date(),
    //     date_updated: new Date(),
    //     visibility: req.body.visibility,
    //     meta_count : {
    //       likes : 0,
    //       views : 0
    //     },
    //     voice_cover : ""
    //   },
    //   videos : [],
    //   likes : []
    // }


    // users.update({
    //   "_id" : new mongodb.ObjectId( userId )
    // },{
    //   $inc : {
    //     "meta_count.memmbles" : 1
    //   }
    // } , function(err, result) {
    //   if(err)
    //     console.log(err)
    // })

    memmble.photos = photoList
    memmble.videos = videoList
    //memmble.album.cover_image = coverImage
    // memmble.album.voice_cover = voiceCover

    

    // for(let photoData of elasticPhotoData) {
    //   console.log('calling addPhotoToElasticSearch')
    //   addPhotoToElasticSearch(photoData)
    // }

    for (let photoData of elasticPhotoData) {

      console.log('calling AWS Recogintion')
      processImage(photoData)
    }


    var memmbles = db.get().collection('memmbles')

    // Update voice cover
    if (req.body.hasVoiceCoverChanged) {
      memmbles.update({
        "_id": new mongodb.ObjectId(req.body.memmbleId)
      }, {
        $set: {
          "album.voice_cover": voiceCover
        }
      }, function(err, result) {
        if (err)
          console.log(err)
      })
    }


    // Update cover image
    if (req.body.hasCoverImageChanged) {
      memmbles.update({
        "_id": new mongodb.ObjectId(req.body.memmbleId)
      }, {
        $set: {
          "album.cover_image": coverImage
        }
      }, function(err, result) {
        if (err)
          console.log(err)
      })
    }


    // Update album meta
    memmbles.update({
      "_id": new mongodb.ObjectId(req.body.memmbleId)
    }, {
      $set: {
        "album.title": req.body.title,
        "album.description": req.body.story,
        "album.people": req.body.people,
        "album.date_updated": new Date(),
        "album.visibility": req.body.visibility
      }
    }, function(err, result) {
      if (err)
        console.log(err)
    })


    // Update photos
    if (photoList.length != 0) {

      // TODO for each photoList update faces where photoList.temp_id to faces.image_id = photoList.photo_id

      memmbles.update({
        "_id": new mongodb.ObjectId(req.body.memmbleId)
      }, {
        $push: {
          "photos": {
            $each: photoList
          }
        }
      }, function(err, result) {
        if (err)
          console.log(err)
      })
    }


    // Update videos
    if (videoList.length != 0) {

      memmbles.update({
        "_id": new mongodb.ObjectId(req.body.memmbleId)
      }, {
        $push: {
          "videos": {
            $each: videoList
          }
        }
      }, function(err, result) {
        if (err)
          console.log(err)
      })
    }

    // Update description for each PHOTO in the Memmble
    for (image of req.body.memmbleImages) {

      console.log(image)
      updatePhotoElasticSearch(image.photo_id, image.summary)

      console.log('===============image.audio==========')
      console.log(image.audio)

      if (image.audio != null) {

        memmbles.update({
          "_id": new mongodb.ObjectId(req.body.memmbleId),
          "photos.photo_id": new mongodb.ObjectId(image.photo_id)
        }, {
          $set: {
            "photos.$.description": image.summary,
            "photos.$.audio": image.audio
          }
        }, function(err, result) {
          if (err)
            console.log(err)
        })

      } else {

        memmbles.update({
          "_id": new mongodb.ObjectId(req.body.memmbleId),
          "photos.photo_id": new mongodb.ObjectId(image.photo_id)
        }, {
          $set: {
            "photos.$.description": image.summary
          }
        }, function(err, result) {
          if (err)
            console.log(err)
        })

      }


    }

    // Update description for each Video in the Memmble
    for (video of req.body.memmbleVideos) {

      memmbles.update({
        "_id": new mongodb.ObjectId(req.body.memmbleId),
        "videos.video_id": new mongodb.ObjectId(video.video_id)
      }, {
        $set: {
          "videos.$.description": video.summary
        }
      }, function(err, result) {
        if (err)
          console.log(err)
        //updateVideoElasticSearch(video.video_id, video.summary)
      })

    }


    deleteTemp(memmble.album.user_id,memmble.album.processId)
    sendSuccess()



    // var memmbles = db.get().collection('memmbles')
    // memmbles.insertOne( memmble, function(err, result){
    //   if(err) {
    //     console.log(err)
    //   } else {
    //     console.log('image insert id')
    //     console.log(result.insertedId)

    //     let memmbleData = {
    //       memmbleId : memmble._id,
    //       userId : memmble.album.user_id,
    //       title : memmble.album.title,
    //       description : memmble.album.description,
    //       image : coverImage.thumbnail.medium
    //     }

    //     addMemmbleToElasticSearch(memmbleData)
    //     incrementMemmbleCountByOne(memmble.album.user_id)
    //     deleteTemp(memmble.album.user_id)
    //     sendSuccess()
    //   }
    // })

  }



  function createMemmble(decoded, uploadedImages, uploadedVideos) {


    console.log('inside createMemmble')
    console.log("######################### uploadedImages #################",uploadedImages)

    // get unsaved photos
    var temp = db.get().collection('temp')
    temp.find({
      userId: new mongodb.ObjectId(decoded.userId), processId: req.body.processId
    })
    .sort({
      "dateCreated": 1
    })
    .toArray(function(err, result) {
      if (err)
        console.log(err)

      console.log("%%%%%%%%%%%%%%%% temp result %%%%%%%%%%%%%%%%%%%%%",result)

      if (result.length != 0) {

        var memmbleObjectId = new mongodb.ObjectId()
          // album meta
          var memmble = {
            _id: memmbleObjectId,
            album: {
              user_id: new mongodb.ObjectId(decoded.userId),
              processId: req.body.processId,
              title: req.body.title,
              description: req.body.story,
              people: req.body.people,
              date_created: new Date(),
              date_updated: new Date(),
              visibility: req.body.visibility,
              meta_count: {
                likes: 0,
                views: 0
              },
              voice_cover: ""
            },
            videos: [],
            likes: []
          }

          var voiceCover = ""

          var coverImage = {
            "thumbnail": {
              "medium": "",
              "big": ""
            },
            "quality": {
              "high_resolution": ""
            }
          }

          var imageCounter = 0

          // get photos
          var photoList = []
          var elasticPhotoData = []
          var videoList = []
          for (image of result) {

            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            console.log(image)
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            imageCounter++

            if (image.hasOwnProperty('photo')) {
              var photoObjectId = new mongodb.ObjectId()

              // var uploadedImageIndex = this.hashCode(image.photo.quality.high_resolution+'_small.jpg')
              let summary = ''

              var uploadedImageUrl = image.photo.quality.high_resolution + '_small.jpg'

              for (let uploadedImage of uploadedImages) {

                if (uploadedImage.url.split('.com/')[1] == uploadedImageUrl.split('.com/')[1]) {
                 if (uploadedImage.hasOwnProperty('summary')) {
                   summary = uploadedImage.summary

                 }
               }
             }

              // if (uploadedImages[uploadedImageIndex].hasOwnProperty('summary')) {
              //   summary = uploadedImages[uploadedImageIndex].summary
              // }
              //


              photoList.push({
                "photo_id": photoObjectId,
                "temp_id": image._id,
                "thumbnail": {
                  "small": image.photo.quality.high_resolution + '_small.jpg',
                  "medium": image.photo.quality.high_resolution + '_medium.jpg',
                  "big": image.photo.quality.high_resolution + '_big.jpg'
                },
                "audio": image.audio,
                "description": summary,
                "quality": {
                  "high_resolution​": image.photo.quality.high_resolution
                }
              })

              console.log("========================================================================")
              console.log(photoList)
              console.log("========================================================================")

              let photoData = {
                photoId: photoObjectId,
                memmbleId: memmbleObjectId,
                description: summary,
                image: image.photo.quality.high_resolution + '_small.jpg'
              }

              elasticPhotoData.push(photoData)
            }

             console.log("================================VIDEO===============================")
              console.log(photoList)
              console.log("========================================================================")


            // Video
            if (image.hasOwnProperty('video')) {

              console.log("================================VIDEO===============================")
              console.log(image.video.quality.high_resolution)
              console.log("========================================================================")



              var videoObjectId = new mongodb.ObjectId()
              let summary = ''

              var uploadedVideoUrl = image.video.quality.high_resolution

              for (let uploadedVideo of uploadedVideos) {
                if (uploadedVideo.url == uploadedVideoUrl) {

                  if (uploadedVideo.hasOwnProperty('summary')) {
                    summary = uploadedVideo.summary
                  }
                }
              }

              videoList.push({
                "video_id": videoObjectId,
                "thumbnail": {
                  "small": image.video.thumbnail.small
                },
                "meta":{
                  "duration_seconds": image.video.meta.duration_seconds
                },
                "description": summary,
                "quality": {
                  "sd": image.video.quality.high_resolution
                }
              })

              let videoData = {
                videoId: videoObjectId,
                memmbleId: memmbleObjectId,
                image: image.video.thumbnail.small
              }

              // addPhotoToElasticSearch(photoData)
            }


            // get voice cover
            if (image.hasOwnProperty('voice_cover')) {
              voiceCover = image.voice_cover
            }


            // get cover image
            if (image.hasOwnProperty('cover_image')) {
              coverImage = {
                "thumbnail": {
                  "medium": image.cover_image.quality.high_resolution + '_medium.jpg',
                  "big": image.cover_image.quality.high_resolution + '_big.jpg'
                },
                "quality": {
                  "high_resolution": image.cover_image.quality.high_resolution
                }
              }
            }

            if (image.hasOwnProperty('audio')) {
              var pc = -1
              for (let pList of photoList) {
                pc++
                console.log(image.image_url.split('.com/')[1] +'=='+  pList.thumbnail.small.split('.com/')[1])
                if (image.image_url.split('.com/')[1] == pList.thumbnail.small.split('.com/')[1]) {
                  photoList[pc]['audio']=image.audio

                }

              }
            }

          }

          console.log('imageCounter: ' + imageCounter + ' result.length: ' + result.length)

          memmble.album.title = memmble.album.title.trim()
          memmble.album.description = memmble.album.description.trim()

          if (result.length == imageCounter) {
            console.log('insertToCollection')
            if ((photoList.length + videoList.length) == 0) {
              res.status(200).json(common.formatResponse({
                type: 'error',
                code: 'MEMMBLE_CREATE_NO_PHOTO_VIDEO',
                data: {
                  message: 'Please upload at least one image or video'
                }
              }))
            } else {
              if (coverImage.quality.high_resolution == "") {
                res.status(200).json(common.formatResponse({
                  type: 'error',
                  code: 'MEMMBLE_CREATE_NO_COVER_IMAGE',
                  data: {
                    message: 'You have to upload a cover image'
                  }
                }))
              } else if (memmble.album.title.length < 4 || req.body.title.length > 40) {
                res.status(200).json(common.formatResponse({
                  type: 'error',
                  code: 'MEMMBLE_INVALID_TITLE',
                  data: {
                    message: 'Title should have minimum 4 and maximum 40 characters'
                  }
                }))
              } else if (memmble.album.description.length < 10 || memmble.album.description.length > 2000) {
                res.status(200).json(common.formatResponse({
                  type: 'error',
                  code: 'MEMMBLE_INVALID_DESC',
                  data: {
                    message: 'Story should have minimum 10 and maximum 2000 characters'
                  }
                }))
              } else {

                // Check memmble create limit based on user account type
                var packages = {
                  "free": {
                    "memmbles": 2,
                    "is_private_allowed": true,
                    "is_video_allowed": true
                  },
                  "starter": {
                    "memmbles": 5,
                    "is_private_allowed": true,
                    "is_video_allowed": true
                  },
                  "pro": {
                    "memmbles": 10,
                    "is_private_allowed": true,
                    "is_video_allowed": true
                  },
                  "premium": {
                    "memmbles": -1,
                    "is_private_allowed": true,
                    "is_video_allowed": true
                  }
                }
                var planDetails = db.get().collection('subscription_plans')
                planDetails.find({})
                .toArray(function(err, result) {
                  if (err)
                    console.log(err)

                  console.log(result)
                  result.forEach(function(item) {
                    switch (item.plan) {
                      case "free":
                      packages.free.memmbles = item.no_of_memmbles
                      break
                      case "starter":
                      packages.starter.memmbles = item.no_of_memmbles
                      break
                      case "pro":
                      packages.pro.memmbles = item.no_of_memmbles
                      break
                      case "premium":
                      packages.premium.memmbles = item.no_of_memmbles
                      break
                    }
                  })

                })
                console.log("packages============", packages)

                var memmbles = db.get().collection('memmbles')
                memmbles.find({
                  "album.user_id": new mongodb.ObjectId(decoded.userId)
                })
                .count(function(error, memmbleCount) {
                  if (error)
                    console.log(error)

                  console.log('memmbleCount')
                  console.log(memmbleCount)

                  var users = db.get().collection('users')
                  users.find({
                    "_id": new mongodb.ObjectId(decoded.userId)
                  })
                  .toArray(function(err, result) {

                    if (err)
                      console.log(err)

                    var subscription = result[0].subscriptions.type

                    console.log('subscription')
                    console.log(subscription)

                    console.log((memmbleCount + 1))
                    console.log(packages[subscription].memmbles)

                    switch (subscription) {

                      case 'free':
                      case 'starter':
                      case 'pro':
                      if ((memmbleCount + 1) > packages[subscription].memmbles) {
                        if(packages[subscription].memmbles== -1){
                          console.log('can create fps')
                          insertToCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData)

                        }else{
                          console.log('cannot create')

                          res.status(200).json(common.formatResponse({
                            type: 'error',
                            code: 'MEMMBLE_PLAN_LIMIT',
                            data: {
                              message: 'You can upload only ' + packages[subscription].memmbles + ' memmbles. Upgrade to upload more'
                            }
                          }))

                        }

                        
                      } else {
                        console.log('can create fps')
                        insertToCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData)
                      }
                      break

                      case 'premium':
                      console.log('can create premium')
                      insertToCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData)
                      break
                    }

                  })

                })

                // TO UNCOMMENT ********************************
                //insertToCollection(memmble, photoList, coverImage, videoList, voiceCover)
              }
            }
          }
        } else {

          res.status(200).json(common.formatResponse({
            type: 'error',
            code: 'MEMMBLE_CREATE_NO_PHOTO_VIDEO',
            data: {
              message: 'Please upload at least one image or video'
            }
          }))

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
   function insertToCollection(memmble, photoList, coverImage, videoList, voiceCover, elasticPhotoData) {

    console.log('---insie insert---')
    console.log("______________________________________________________            ",photoList)

    // TODO for each photoList update faces where photoList.temp_id to faces.image_id = photoList.photo_id

    memmble.photos = photoList
    memmble.videos = videoList
    memmble.album.cover_image = coverImage
    memmble.album.voice_cover = voiceCover

    console.log("444444444444444444444444444444444444444444memmble444444444444444444444444444")
    console.log(memmble)
    console.log("444444444444444444444444444444444444444444memmble444444444444444444444444444")
    for (let photoData of elasticPhotoData) {

      console.log('calling AWS Recogintion')
      processImage(photoData)

    }

    for (let people of memmble.album.people) {

      console.log(people)
      firebase.firebaseNotification({
        type: 'tag',
        user_id: new mongodb.ObjectId(people),
        image: memmble.album.cover_image.thumbnail.medium,
        memmble_user_id: memmble.album.user_id
      })      


      pushNotificationTag({
        type: 'tag',
        memmble_id: memmble._id,
        tagged_user_id: new mongodb.ObjectId(people),
        image: memmble.album.cover_image.thumbnail.medium,
        album_title: memmble.album.title,
        memmble_user_id: memmble.album.user_id
      })
    }

    if(memmble.album.visibility =='public'){
      var users = db.get().collection('users')
      users.find({
        "_id": memmble.album.user_id
      }, {
        "password": 0
      }).toArray(function(err, result) {
        if (err)
          throw err

        for (let allFollowers of result[0].followers) {

          console.log("allFollowers",allFollowers)
          firebase.firebaseNotification({
            type: 'allFollowers',
            user_id: new mongodb.ObjectId(allFollowers),
            image: memmble.album.cover_image.thumbnail.medium,
            album_title: memmble.album.title,
            memmble_user_id: memmble.album.user_id
          }) 


          pushNotificationFollow({
            type: 'allFollowers',
            memmble_id: memmble._id,
            follow_user_id: new mongodb.ObjectId(allFollowers),
            image: memmble.album.cover_image.thumbnail.medium,
            album_title: memmble.album.title,
            memmble_user_id: memmble.album.user_id
          })
        }
      })


    }

    

    

    console.log("======== memmble.album.people ======", memmble.album.people)

    var memmbles = db.get().collection('memmbles')
    memmbles.insertOne(memmble, function(err, result) {
      if (err) {
        console.log(err)
      } else {
        console.log('image insert id')
        console.log(result.insertedId)

        let memmbleData = {
          memmbleId: memmble._id,
          userId: memmble.album.user_id,
          title: memmble.album.title,
          description: memmble.album.description,
          image: coverImage.thumbnail.medium
        }

        addMemmbleToElasticSearch(memmbleData)
        incrementMemmbleCountByOne(memmble.album.user_id)
        deleteTemp(memmble.album.user_id,memmble.album.processId)
        sendAddSuccess()
      }
    })

  }



  /**
   * @method
   * @param {string} userId
   * @collection temp
   * @desc Delete the images of the User from the temp collection
   *
   */
   function deleteTemp(userId,proId) {

    var temp = db.get().collection('temp')
    temp.remove({
      userId: new mongodb.ObjectId(decoded.userId),processId: proId
    }, function(err, result) {
      if (err)
        console.log(err)
    })
  }



  /**
   * @method
   * @param {string} userId
   * @collection users
   * @desc Update memmble meta count by one
   *
   */
   function incrementMemmbleCountByOne(userId) {

    var users = db.get().collection('users')
    users.update({
      "_id": new mongodb.ObjectId(userId)
    }, {
      $inc: {
        "meta_count.memmbles": 1
      }
    }, function(err, result) {
      if (err)
        console.log(err)
    })
  }



  /**
   * @method
   * @param {json} photoData
   * @type  photo
   * @desc Process image to identify tags
   *
   */
   function processImage(photoData) {

    var imageUrl = photoData.image.split("_small.jpg")[0]
    var bucketObjectName = imageUrl.split(config.get('s3.bucketUrl'))[1]

    var params = {
      Image: {
        S3Object: {
          Bucket: config.get('s3.bucket'),
          Name: bucketObjectName
        }
      },
      MaxLabels: 10,
      MinConfidence: 90
    }

    rekognition.detectLabels(params, function(err, data) {
      if (err) console.log(err, err.stack) // an error occurred
        else {
          console.log(data)

          if (data.Labels.length > 0) {

            var totalLabelCount = data.Labels.length
            var labelsProcessed = 0
            var labelsArray = []

            for (tag of data.Labels) {

              labelsProcessed++
              labelsArray.push(tag.Name.toLowerCase())

              console.log(tag)
              insertTagToPhoto(photoData.photoId, tag.Name.toLowerCase())
              insertTagToAds(tag.Name.toLowerCase())

              if (labelsProcessed == totalLabelCount) {
                photoData.tags = labelsArray

                console.log('=========updated photoData==========')
                console.log(photoData)
                console.log('calling addPhotoToElasticSearch')
                addPhotoToElasticSearch(photoData)
              }

            }

          }

        }
      })
  }


  function insertTagToPhoto(photoId, tag) {

    var memmbles = db.get().collection('memmbles')
    memmbles.update({
      "photos.photo_id": photoId
    }, {
      $push: {
        "tags": tag
      }
    }, function(err, result) {

      if (err)
        console.log(err)
    })

  }


  function insertTagToAds(tag) {

    var ads_tags = db.get().collection('ads_tags')
    ads_tags.findAndModify({
      tag: tag
    }, [], {
      $setOnInsert: {
        tag: tag
      }
    }, {
      new: true,
      upsert: true
    }, function(err, result) {

      if (err)
        console.log(err)
      else {
        console.log(result)
      }

    })

  }


  /**
   * @method
   * @param {json} memmbleData
   * @type  album
   * @desc Insert the album details to Elastic search server
   *
   */
   function addMemmbleToElasticSearch(memmbleData) {

    request.put(config.get('memmbleToElasticSearchUrl') + memmbleData.memmbleId + '/_create', {
      json: {
        userId: memmbleData.userId,
        title: memmbleData.title,
        description: memmbleData.description,
        image: memmbleData.image
      }
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
   * @param {json} photoData
   * @type  photo
   * @desc Insert the photo details to Elastic search server
   *
   */
   function addPhotoToElasticSearch(photoData) {

    var data = {
      memmbleId: photoData.memmbleId,
      image: photoData.image,
      description: photoData.description,
      tags: photoData.tags
    }

    request.put(config.get('photoToElasticSearchUrl') + photoData.photoId + '?op_type=create', {
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



  function updateMemmbleElasticSearch(memmbleId, title, story) {

    var data = {
      doc: {
        title: title,
        description: story,
      }
    }

    request.post(config.get('memmbleToElasticSearchUrl') + memmbleId + '/_update', {
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




  function updatePhotoElasticSearch(photoId, description) {

    console.log('updatePhotoElasticSearch called')
    console.log('photoId: ' + photoId)
    console.log('description: ' + description)

    var data = {
      doc: {
        description: description
      }
    }

    request.post(config.get('photoToElasticSearchUrl') + photoId + '/_update', {
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
   * @param {string} userId
   * @param {string} memmbleId
   * @collection  memmbles
   * @desc Like a memmble
   * @return {json} Success or Error
   *
   */
   function likeMemmble(userId, memmbleId) {
    var memmbles = db.get().collection('memmbles')
    getUserIdFromMemmble(memmbleId, function(memUser) {
    var memmUserId = memUser[0].album.user_id
    console.log("memUser",memUser)
    var userIdOrg = new mongodb.ObjectId(userId)
    getBlockUsers(userIdOrg, function(blist){
    var blockList = blist.notInarray
    // blockList.push(new mongodb.ObjectId("5ba249531ef1f06900a94f63"))
    var newData = []
    if(blockList){
      blockList.forEach((item)=>  newData.push(item.toString()))
    }
    console.log(blockList)
    console.log(memmUserId)
    console.log("blockList.indexOf(userId)",newData.indexOf(memmUserId.toString()))
    if(newData.indexOf(memmUserId.toString()) == -1){

    checkAlreadyLiked(userId, memmbleId, function(result) {

      if (result) {
        memmbles.update({
          "_id": new mongodb.ObjectId(memmbleId)
        }, {
          $push: {
            "likes": new mongodb.ObjectId(userId)
          },
          $inc: {
            "album.meta_count.likes": 1
          }
        }, function(err, result) {

          if (err)
            console.log(err)
          console.log("hloooooooooooo liked memmbles")

          pushNotification({
            type: 'like',
            memmble_id: new mongodb.ObjectId(memmbleId),
            liked_user_id: new mongodb.ObjectId(userId)
          })
          res.status(200).json(common.formatResponse({
            type: 'success',
            code: 'MEMMBLE_LIKE_SUCCESS',
            data: {
              message: 'Memmbles liked successfully'
            }
          }))

        })

      }

    })
  }
  })
  })

  }

  /**
   * @method
   * @param {json} decoded
   * @param {string} memmbleId
   * @collection  memmbles
   * @desc Check if Memmble is already liked by the user
   * @return {json} Success or error
   *
   */
   function checkAlreadyLiked(userId, memmbleId, callback) {

    var memmbles = db.get().collection('memmbles')

    memmbles.find({
      "_id": new mongodb.ObjectId(memmbleId),
      "likes": new mongodb.ObjectId(userId)
    })
    .toArray(function(err, result) {

      if (err)
        console.log(err)

      if (result.length == 0) {
        callback(true)

      } else {
        res.status(200).json(common.formatResponse({
          type: 'error',
          code: 'MEMMBLE_ALREADY_LIKED',
          data: 'You have already liked this memmble'
        }))
        return
      }

    })

  }

  /**
   * @method
   * @param {string} userId
   * @param {string} memmbleId
   * @collection  memmbles
   * @desc Unlike a Memmble
   * @return {json} Success or error
   *
   */
   function unlikeMemmble(userId, memmbleId) {
    var memmbles = db.get().collection('memmbles')

    memmbles.update({
      "_id": new mongodb.ObjectId(memmbleId),
      "likes": new mongodb.ObjectId(userId)
    }, {
      $pull: {
        "likes": new mongodb.ObjectId(userId)
      },
      $inc: {
        "album.meta_count.likes": -1
      }
    }, function(err, result) {

      if (err)
        console.log(err)

      pushNotification({
        type: 'unlike',
        memmble_id: new mongodb.ObjectId(memmbleId),
        liked_user_id: new mongodb.ObjectId(userId)
      })
     

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'MEMMBLE_UNLIKE_SUCCESS',
        data: {
          message: 'Memmbles unliked successfully'
        }
      }))

    })

  }



  function pushNotification(input) {

    var notificationObject = {
      notification_id: new mongodb.ObjectId(),
      notification_type: input.type,
      user_id: input.liked_user_id,
      memmble_id: input.memmble_id,
      is_new: true,
      date_created: new Date()
    }

    // Get user details
    var users = db.get().collection('users')
    var memmbles = db.get().collection('memmbles')

    users.find({
      "_id": notificationObject.user_id
    }, {
      "password": 0
    }).toArray(function(err, result) {
      if (err)
        throw err
      notificationObject.image = result[0].profile_image.thumbnail.small
      notificationObject.liked_user_name = result[0].name

      memmbles.find({
        "_id": notificationObject.memmble_id
      }).toArray(function(err, result) {
        if (err)
          throw err
        notificationObject.album_title = result[0].album.title
        var push_user_id = result[0].album.user_id
        if(input.type =="like"){
                    firebase.firebaseNotification({
                     type: 'like',
                     user_id: push_user_id,
                     liked_user_id: input.liked_user_id

                  })
        }
        if(input.type =="unlike"){
                    firebase.firebaseNotification({
                     type: 'unlike',
                     user_id: push_user_id,
                     liked_user_id: input.liked_user_id

                  })
        }

        // Add new notification
        users.update({
          "_id": push_user_id
        }, {
          $push: {
            "notifications": notificationObject
          },
          $inc: {
            "meta_count.notifications": 1
          }
        }, function(err, result) {
          if (err) {
            console.log(err)
          } else {
            console.log('updated')
            console.log(notificationObject)

            // send web socket push
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', {
              topic: push_user_id,
              data: {
                notification: notificationObject
              }
            })

          }
        })

      })
    })
  }



  function pushNotificationTag(input) {

    var notificationObject = {
      notification_id: new mongodb.ObjectId(),
      notification_type: input.type,
      user_id: input.tagged_user_id,
      memmble_id: input.memmble_id,
      image: input.image,
      album_title: input.album_title,
      memmble_user_id: input.memmble_user_id,
      is_new: true,
      date_created: new Date()
    }

    // Get user details
    var users = db.get().collection('users')
    var memmbles = db.get().collection('memmbles')

    var push_user_id = input.tagged_user_id

    // Add new notification
    users.update({
      "_id": push_user_id
    }, {
      $push: {
        "notifications": notificationObject
      },
      $inc: {
        "meta_count.notifications": 1
      }
    }, function(err, result) {
      if (err) {
        console.log(err)
      } else {
        console.log('updated')
        console.log(notificationObject)

        // send web socket push
        var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
        socket.emit('push_notification', {
          topic: push_user_id,
          data: {
            notification: notificationObject
          }
        })

      }
    })

  }


  function pushNotificationFollow(input) {
  	console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$V   $$$$$$$$$$$$$$$$$$$$$$$$$$$")

    var notificationObject = {
      notification_id: new mongodb.ObjectId(),
      notification_type: input.type,
      user_id: input.follow_user_id,
      memmble_id: input.memmble_id,
      image: input.image,
      album_title: input.album_title,
      memmble_user_id: input.memmble_user_id,
      is_new: true,
      date_created: new Date()
    }

    // Get user details
    var users = db.get().collection('users')
    var memmbles = db.get().collection('memmbles')

    var push_user_id = input.follow_user_id

    // Add new notification
    users.find({
      "_id": notificationObject.memmble_user_id
    }, {
      "password": 0
    }).toArray(function(err, result) {
      if (err)
        throw err
      notificationObject.memmble_user_name = result[0].name
      users.update({
        "_id": push_user_id
      }, {
        $push: {
          "notifications": notificationObject
        },
        $inc: {
          "meta_count.notifications": 1
        }
      }, function(err, result) {
        if (err) {
          console.log(err)
        } else {
          console.log('updated followers notifications')
          console.log(notificationObject)

        // send web socket push
        var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
        socket.emit('push_notification', {
          topic: push_user_id,
          data: {
            notification: notificationObject
          }
        })

      }
    })
    })

  }


  /**
   * @method
   * @param {json} data
   * @desc Send success response
   *
   */
   function sendSuccess() {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'MEMMBLE_UPDATED_SUCCESS',
      data: {
        message: 'Memmbles updated successfully'
      }
    }))
  }


  function sendAddSuccess() {

    res.status(200).json(common.formatResponse({
      type: 'success',
      code: 'MEMMBLE_ADDED_SUCCESS',
      data: {
        message: 'Memmble added successfully'
      }
    }))
  }


})




// /**
//  * @callback
//  * @param {string} memmbleId
//  * @return {json} success or error message
//  *
//  */
//  router.delete('/:memmbleId', function(req, res) {

//    var token = ''
//    if(req.headers.authorization) {
//     var token = req.headers.authorization.split(" ")[1]
//   }

//   try{
//     var decoded = jwt.verify(token, common.getSecret())

//     var memmbleId = new mongodb.ObjectId(req.params.memmbleId.trim())
//     var userId = new mongodb.ObjectId(req.params.userId.trim())

//     getMemmbleById(userId, memmbleId, function(data){
//       sendSuccessResponse(data, res)
//     })

//   } catch(err){
//     sendAuthError(res)
//   }

// })



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


/**
 * @callback
 * @param {string} memmbleId
 * @desc Delete a memmble
 * @return {json} success or error message
 *
 */
 router.delete('/:memmbleId', function(req, res) {

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try {
    var decoded = jwt.verify(token, common.getSecret())
    var memmbleId = new mongodb.ObjectId(req.params.memmbleId.trim())
    var userId = new mongodb.ObjectId(decoded.userId)

    console.log('memmbleId: ' + memmbleId)
    console.log('userId: ' + userId)

    console.log('delete mem')
    console.log(memmbleId)

    isBelongToUser(decoded, memmbleId, function(result){


      if(result){
        console.log("*********************************************            ",result)


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

function isBelongToUser(decoded, memmbleId, callback){

  console.log("())))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))")
  console.log(new mongodb.ObjectId(decoded.userId))
  console.log(new mongodb.ObjectId(memmbleId))
  var memmbles = db.get().collection('memmbles')
  memmbles.find({
    _id: new mongodb.ObjectId(memmbleId), 
    "album.user_id": new mongodb.ObjectId(decoded.userId) 
  }).toArray(function(err, result) {
    console.log("result.length",result.length)
    if(result.length!=0){

      callback(true)


    }
    else{
      res.status(401).json(common.formatResponse({
        type: 'authorizationError',
        code: 'INVALID_USER',
        data: 'User authentication failed'
      }))
    }
  })
}

function hashCode(str) {

  var hash = 0,
  i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}




function getBlockUsers(userId, callback){
  db.get().collection('users').aggregate(
   [
        { $match: { "_id" : userId} },
        { $project : {
            "blocked_users": { $ifNull: [ "$blocked_users", [] ] },
            "blocked_by": { $ifNull: [ "$blocked_by", [] ] }



          }
        },
        {
           $project: {
             "notInarray": {
                 $reduce: {
                    input: [ "$blocked_by" ],
                    initialValue: "$blocked_users",
                    in: { $concatArrays : ["$$value", "$$this"] }
                 }
              }
            }
          }
  ]).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    console.log(result)
    let data = result[0]
    console.log("users not in array11111111111111111111111111111111",data)
    callback(data)
  })
}


/**
   * @method
   * @param {ObjectId} memmbleId
   * @param {function} callback
   * @return {json}
   * @desc Get all memmbles of a user
   * @collection - memmbles
   *
   */
   function getUserIdFromMemmble(memmbleId, callback) {
    

    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      "_id": new mongodb.ObjectId(memmbleId)
    },{"album.user_id":1,_id:0})
    .toArray(function(err, result) {
      if (err) {
        console.log(err)
        throw err
      }
      var details = result
      callback(details)
    })
  }
module.exports = router
