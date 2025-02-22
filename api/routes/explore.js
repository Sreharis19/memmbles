/**
* @file 
* @desc GET Explore details of Logged In User
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
 router.get('/:offset/:limit', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){
    console.log("decoded.userId",decoded.userId)

    var userId = new mongodb.ObjectId(decoded.userId)

    getFollowing(userId, function(data){ 
      var following = data.notInarray
      // var blocked_users = data.blocked_users || []
      // var blocked_by = data.blocked_by || []

      // console.log("blocked_users",blocked_users)
      // console.log("following",following)

      following.push(userId)
      // following.push(blocked_users)
      // following.push(blocked_by)

      console.log(following)

      getMemmbles(following, function(result){   

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

    })

  })


  /**
   * @method
   * @param {Array} following 
   * @param {function} callback
   * @return {json} 
   * @desc Get memmbles of the users not followed by Logged In User ( Exclude memmbles of logged In User)
   * @collection - memmbles
   *
   */
   function getMemmbles(following, callback){
     db.get().collection('memmbles').find({
      "album.user_id" : { $nin : following },
      "album.visibility" : "public" 
    })
     .sort({"album.meta_count.views" : -1,"album.date_created" : -1})
     .skip(+req.params.offset)
     .limit(+req.params.limit)
     .toArray(function(err, result){

      if(err){
        console.log(err)      
        throw err
      }
      var details = result
      //console.log("details",details)
      callback(details)
    })



 ////////////////////////////////
   // db.get().collection('memmbles').aggregate([{
   //  "$match": {
   //    "album.user_id": { $nin : following },
   //    "album.visibility" : "public" 
   //  }

   // },
   // { $sort : {"album.date_created" : -1, "album.meta_count.views" : -1} },
   // { $skip : 0 },
   // { $limit : 10 }
   // ]).toArray(function(err, result){

   //    if(err){
   //      console.log(err)      
   //      throw err
   //    }
   //    var details = result
   //    console.log("details",details)
   //    //callback(details)
   //  })

 ////////////////////////////////

   }


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
 function getFollowing(userId, callback){

  // db.get().collection('users').find({
  //   "_id" : userId
  // },{
  //   "following" : 1,
  //   "blocked_users" : 1,
  //   "blocked_by" : 1,
  //   "_id" : 0
  // }).toArray(function(err, result){
  //   if(err){
  //     console.log(err)      
  //     throw err
  //   }
  //   let data = result[0]
  //   callback(data)
  // })
  db.get().collection('users').aggregate(
   [
        { $match: { "_id" : userId } },
        { $project : {
            "following": { $ifNull: [ "$following", [] ] },
            "blocked_users": { $ifNull: [ "$blocked_users", [] ] },
            "blocked_by": { $ifNull: [ "$blocked_by", [] ] }



          }
        },
        {
           $project: {
             "notInarray": {
                 $reduce: {
                    input: [ "$blocked_users", "$blocked_by" ],
                    initialValue: "$following",
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
 * @param {ObjectId} userId 
 * @param {string} memmbleId 
 * @param {function} callback
 * @desc Get Details of the User
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
    code: 'EXPLORE_SUCCESS',
    data: {
      message:'User Explore details fetched successfully', 
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