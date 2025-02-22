/**
* @file 
* @desc GET Notification details of the Logged In User
* @author Deepak
* @date 14 Jul 2017
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
 * @desc GET Notification details of a user
 *
 */
 router.get('/:userId', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(req.params.userId)
    getBlockUsers(userId, function(data){
      var blockList = data.notInarray

    getNotifications(userId, blockList,function(data){
     sendSuccessResponse(data, res)
   })
  })

  })
})


 /**
 * @method
 * @return {json} Success or error message
 * @desc POST  - Clear notification details of a user
 *
 */
 router.post('/:userId', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(req.params.userId)

    clearNotifications(userId)
    sendClearSuccessResponse(res)

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
 * @desc Get list of Notifications of the User  
 * @collection - users
 *
 */
 function getNotifications(userId,blockList, callback){
  console.log("blockList",blockList)

  // db.get().collection('users').find({
  //   "_id" : userId,
  //   "notifications": { "$not": { "$elemMatch": { "notification_type": "follow" } } }
  //   // "notifications.notification_type" : {
  //   //     "$in": ["follow","unfollow", "like"]

  //   //   }
  // },{
  //   "notifications" : 1,
  //   "meta_count" :  1,
  //   "_id" : 0
  // })
  db.get().collection('users').aggregate([
    { $match: { "_id" : userId } },
    {
      $project: {
        "meta_count" :  1,
        notifications: {
          $filter: {
            input: "$notifications",
            as: "noti",
            cond: {"$and": [{ "$not":{ "$in": ["$$noti.follower_user_id", blockList ]}},
                            { "$not":{ "$in": ["$$noti.birthday_user_id", blockList ]}},
                            { "$not":{ "$in": ["$$noti.memmble_user_id", blockList ]}},
                            { "$not":{ "$in": ["$$noti.frnd_user_id", blockList ]}},
                            { "$not":{ "$in": ["$$noti.user_id", blockList ]}}]
                  }
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
    var data = result[0]
     //console.log(data)

    data.notifications.sort(function(a, b) {
      return new Date(b.date_created) - new Date(a.date_created)
    })

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
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} 
 * @desc Clear notifications of the User  
 * @collection - users
 *
 */
 function clearNotifications(userId){


  // var doc = db.get().collection('users').find({
  //   "_id" : userId
  // })


  db.get().collection('users').find({
    "_id" : userId
  }).forEach(function(doc) {

    doc.notifications.map(function(n) {
      n.is_new = false
    })

    console.log(doc.notifications)

    db.get().collection('users').update({
      "_id" : userId
    },{
      $set: {
        "notifications" : doc.notifications,
        "meta_count.notifications" : 0
      }
    }, function(err, count, updateResult) {          

    })

  })



  // doc.notifications.forEach(function(notification) {
  //   notification.is_new = false
  // })

  // console.log(doc.notifications)

  // db.get().collection('users').update({
  //   "_id" : userId
  // },{
  //   $set: {
  //     "notifications" : doc.notifications,
  //     "meta_count.notifications" : 0
  //   }
  // })

 //  .update({
 //    "_id" : userId
 //  },{
 //    $set: {
 //      "notifications.$.is_new" : false,
 //      "meta_count.notifications" : 0
 //    }
 //  },{
 //   multi : true
 // })


//   db.get().collection('users').updateMany({
//     "_id" : userId
//   },{
//     $set: {
//       "notifications.is_new" : false,
//       "meta_count.notifications" : 0
//     }
//   })
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
    code: 'NOTIFICATIONS_SUCCESS',
    data: {
      message:'User notifications fetched successfully', 
      data: { 
        details : data
      } 
    }
  }))
}

/**
 * @method
 * @param {object} res - Response object
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendClearSuccessResponse(res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'NOTIFICATIONS_CLEAR_SUCCESS',
    data: {
      message:'User notifications cleared successfully', 
      data: {} 
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