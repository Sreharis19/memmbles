/**
* @file 
* @desc GET Feed details of Logged In User
* @author Ajith
* @date 17 May 2017
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
 * @desc Get Feed of Logged in User
 *
 */
 router.get('/', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(decoded.userId)

    getFollowing(userId, res, function(data){ 

      var following = data.following

      if (following.length > 0) {
        getMemmbles(following, decoded.userId, function(result){   

          var memmbleCount = result.length
          var output = []

          if (memmbleCount > 0) {
            var i = 0;
            for(let memmble of result){        

              output[memmble._id] = memmble         

              getUserDetails(memmble.album.user_id, memmble._id, function(data, memmbleId){
                i++         

                output[memmbleId].album.user_name = data.name        
                output[memmbleId].album.profile_image = data.profile_image        

                if ( i == memmbleCount) { 

                  var finalOutput = []

                  for(key in output){
                    finalOutput.push(output[key])
                  } 

                  if (finalOutput.length == memmbleCount) {

                    finalOutput.sort(function(a, b){
                      return new Date(b.album.date_created) - new Date(a.album.date_created)
                    })

                    sendSuccessResponse(finalOutput, res)
                  }

                }

              })

            }
          } else {
            sendSuccessResponse([], res)
          }

        })
      } else{        
        sendSuccessResponse([], res)
      }
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
 function verifyToken(token, res, callback){
  try{
    var decoded = jwt.verify(token, common.getSecret())
    callback(decoded)
  }catch(err){
    sendAuthError(res)
  }
}

/**
 * @method
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} 
 * @desc Get list of person the User is following 
 * @collection - users
 *
 */
 function getFollowing(userId, res, callback){

  db.get().collection('users').find({
    "_id" : userId
  },{
    "following" : 1,
    "_id" : 0
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    if (result.length == 0) {
      //invalid User id
      res.status(401).json( common.formatResponse({
        type: 'authorizationError',
        code: 'INVALID_USER',
        data: 'User authentication failed'
      }))
      return

    } else {
      let data = result[0]
      callback(data)
    }

  })
}


/**
 * @method
 * @param {Array} following 
 * @param {function} callback
 * @return {json} 
 * @desc Get all memmbles of the users followed by the Logged In User
 * @collection - memmbles
 *
 */
 function getMemmbles(following, userId, callback){

  // db.get().collection('memmbles').find({
  //   "album.user_id" : { $in : following },
  //   $or: [{"album.visibility": "public"}, {"album.people": userId }] 
  // })


  db.get().collection('memmbles').find({
  $or: [
  {
    $or: [
    { "album.people": userId }
    ]
  },
    {
      $and: [
      { "album.user_id": { $in: following } },
      { "album.visibility": "public" }
      ] 
    }
    ]
  }
)
  .sort({"album.date_created" : -1})
  .toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    var details = result

    callback(details)
  })



}


/**
 * @method
 * @param {ObjectId} userId
 * @param {string} memmbleId 
 * @param {function} callback
 * @return {json} data
 * @desc Get details of the User
 * @collection - users
 *
 */
 function getUserDetails(userId, memmbleId, callback){

  db.get().collection('users').find({
    "_id" : userId
  },{
    "name" : 1,
    "profile_image" : 1,
    "_id" : 0
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result[0]
    callback(data, memmbleId)
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
 function sendSuccessResponse(data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'FEED_SUCCESS',
    data: {
      message:'User Feed fetched successfully', 
      data: { 
        details : data
      } 
    }
  }))
}


/**
 * @method
 * @param {object} res - Response object
 * @return {json} error message
 * @desc Send Authentication Error
 *
 */
 function sendAuthError(res){
  res.status(401).json( common.formatResponse({
    type: 'authorizationError',
    code: 'INVALID_TOKEN',
    data: 'User authentication failed'
  }))
  return
}


module.exports = router