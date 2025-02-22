/**
* @file 
* @desc GET Followers details of the Logged In User
* @author Ajith
* @date 19 May 2017
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
 * @desc GET Followers details of a User
 *
 */
 router.get('/:userId', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    // var userId = new mongodb.ObjectId(decoded.userId)
    var userId = new mongodb.ObjectId(req.params.userId)
    var userIdOrg = new mongodb.ObjectId(decoded.userId)
    getBlockUsers(userIdOrg, function(blist){
    var blockList = blist.notInarray
    getFollowers(userId,blockList, function(data){
      var followers = data.followers 

      var count = followers.length
      var output = []

      if (count > 0) {
        var i = 0
        for(let follower of followers){        

          getUserDetails(follower, function(data){

            let result = {}
            // result.follower_id = follower
            result.follower_id = data._id
            result.follower_name = data.name
            result.follower_image = data.profile_image.thumbnail.small

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
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} 
 * @desc Get list of Followers of the User  
 * @collection - users
 *
 */
 function getFollowers(userId,blockList, callback){

  // db.get().collection('users').find({
  //   "_id" : userId
  // },{
  //   "followers" : 1,
  //   "_id" : 0
  // })
  db.get().collection('users').aggregate([
    { $match: { "_id" : userId } },
    {
      $project: {
        "_id" : 0,
        "followers": {
          $filter: {
            input: "$followers",
            as: "followerUser",
            cond: { "$not":{ "$in": ["$$followerUser", blockList ]}}
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
    "profile_image" : 1
  }).toArray(function(err, result){
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
 * @param {object} res - Response object
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponse(data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'FOLLOWERS_SUCCESS',
    data: {
      message:'User Followers fetched successfully', 
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
    callback(data)
  })
}


module.exports = router