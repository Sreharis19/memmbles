/**
* @file 
* @desc GET Likes details of a Memmble
* @author Ajith
* @date 26 May 2017
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
 * @desc GET Followers details of the Logged In User
 *
 */
 router.get('/:memmbleId', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(decoded.userId)
    var memmbleId = new mongodb.ObjectId(req.params.memmbleId.trim())
    getBlockUsers(userId, function(data){
    var blockList = data.notInarray
    getLikes(memmbleId, blockList, function(data){ 

      var likes = data.likes 
      var count = likes.length
      var output = []

      if (count > 0) {
        var i = 0
        for(let like of likes){        

          getUserDetails(like, function(data){

            let result = {}
            result.user_id = like
            result.user_name = data.name
            result.user_image = data.profile_image.thumbnail.small

            output.push(result)

            if ( i == count-1 ) {
              sendSuccessResponse(output, res)              
            }
            i++
          })

        }

      } else{
        sendSuccessResponse(output, res)
      }

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
 * @param {ObjectId} memmbleId
 * @param {function} callback
 * @return {json} 
 * @desc Get list of liked Users
 * @collection - memmbles
 *
 */
 function getLikes(memmbleId, blockList, callback){

  // db.get().collection('memmbles').find({
  //   "_id" : memmbleId
  // },{
  //   "likes" : 1,
  //   "_id" : 0
  // })
  db.get().collection('memmbles').aggregate([
    { $match: { "_id" : memmbleId } },
    {
      $project: {
        "_id" : 0,
        likes: {
          $filter: {
            input: "$likes",
            as: "like",
            cond: { "$not":{ "$in": ["$$like", blockList ]}}
          }
        }
      }
    }
  ])
  .toArray(function(err, result){
    if(err){
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
 * @param {function} callback
 * @return {json} data
 * @desc Get Name of the User
 * @collection - users
 *
 */
 function getUserDetails(userId, callback){

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
    callback(data)
  })
}


function getBlockUsers(userId, callback){
  db.get().collection('users').aggregate(
   [
        { $match: { "_id" : userId } },
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
    console.log("users not in array",data)
    callback(data)
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
    code: 'LIKES_SUCCESS',
    data: {
      message:'Liked user details fetched successfully', 
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