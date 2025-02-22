/*
 * @file
 * @desc Follow/Unfollow 
 * @author Ajith
 * @date 15 May 2017
 *
 */

 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var jwt = require('jsonwebtoken')
 var db = require('../database/mongodb.js')
 var mongodb = require('mongodb')
 var io = require('socket.io-client')
 const config = require('config')
 var firebase = require('../functions/pushFirebase.js')

/**
 * @method
 * @return {json} Success or error message
 * @desc Follow/Unfollow a User
 */
 router.post('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		req.body = common.trim(req.body)

 		switch(req.body.action) {
 			case 'follow': 			
 			followUser(decoded, req.body)
 			break

 			case 'unfollow': 			
 			unfollowUser(decoded, req.body)
 			break
 		}
 	})

 	function followUser(decoded, body){

 		var userId = new mongodb.ObjectId(decoded.userId) 
 		var followUserId = new mongodb.ObjectId(body.userId) 

 		checkAlreadyFollowing(userId, followUserId, function(result){

 			if (result) {
 				res.status(200).json( common.formatResponse({
 					type: 'error',
 					code: 'USER_ALREADY_FOLLOWING',
 					data: 'You are already following this person'
 				}))
 				return
 			} else{

 				getBlockUsers(followUserId, function(blist){
            var blockList = blist.notInarray
            // blockList.push(new mongodb.ObjectId("5c763a944e97e354419b8c50"))
            var newData = []
           if(blockList){
             blockList.forEach((item)=>  newData.push(item.toString()))
           }
            console.log(blockList)
            console.log(userId)
            console.log("blockList.indexOf(userId)",newData.indexOf(userId.toString()))
            if(newData.indexOf(userId.toString()) == -1){
 				incrementUserDocument(userId, followUserId, function(output){				
 					incrementFollowUserDocument(userId, followUserId, function(data){ 						

 						var data = {
 							"code" : "FOLLOW_SUCCESS",
 							"message" : "You are now following this user"
 						}
                  firebase.firebaseNotification({
                     type: 'follow',
                     user_id: followUserId,
                     followed_user_id: userId

                  })
                  pushNotification({
                     type: 'follow',
                     user_id: userId,
                     follow_user_id: followUserId
                  })
                  sendSuccessResponse(data, res)
               })
 				})
            }else{
               res.status(200).json( common.formatResponse({
               type: 'error',
               code: 'USER_ALREADY_FOLLOWING',
               data: 'There is some issue to follow this person'
            }))
            return
            }
            })
 			}
 		})
 	}


   function  pushNotification(input) {

    var notificationObject = {   
      notification_id: new mongodb.ObjectId(),
      notification_type: input.type,
      user_id: input.follow_user_id ,
      follower_user_id: input.user_id,
      is_new: true,
      date_created: new Date()
   }

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.follower_user_id }, {"password" : 0}).toArray(function(err, result){
      if(err)
         throw err
      notificationObject.image = result[0].profile_image.thumbnail.small
      notificationObject.follower_user_name = result[0].name
      //var follower_profile_image = result[0].profile_image.thumbnail.small


      // Add new notification
      users.findOneAndUpdate(
         {"_id" : notificationObject.user_id
      },{
         $push : { 
            "notifications" :  notificationObject
         },
         $inc : {
            "meta_count.notifications" : 1 
         }
      },function(err, result) {
         if(err) {
            console.log(err)
         } else {
            // console.log(result.value.hasOwnProperty("firebase"))
            // if(result.value.hasOwnProperty("firebase")){
            //    console.log("inside firebase")
            // var firebaseRegToken = result.value.firebase.token || ""
            // if(firebaseRegToken){
            //    console.log("inside firebaseRegToken")
            //    if(input.type == "follow"){
            //       const message_notification = {
            //          notification: {
            //             icon: notificationObject.image,
            //             body: notificationObject.follower_user_name.first +" started following you"
            //          }
            //       };
            //       common.sendPushNotification({
            //          firebaseRegToken: firebaseRegToken,
            //          message_notification: message_notification,
            //       })            
            //    }
            // }  
            // }          

            // send web socket push   
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', { 
             topic: notificationObject.user_id,
             data: {
               notification: notificationObject
            } 
         })
            

         }
      })
   })
}


function unfollowUser(decoded, body){

   var userId = new mongodb.ObjectId(decoded.userId) 
   var followUserId = new mongodb.ObjectId(body.userId) 

   checkAlreadyFollowing(userId, followUserId, function(result){

     if (!result) {
       res.status(200).json( common.formatResponse({
         type: 'error',
         code: 'USER_NOT_FOLLOWING',
         data: 'You are not following this person'
      }))
       return
    } else{

     decrementUserDocument(userId, followUserId, function(output){ 					
      decrementFollowUserDocument(userId, followUserId, function(data){ 						

       var data = {
        "code" : "UNFOLLOW_SUCCESS",
        "message" : "Successfully Unfollowed user"
     }
      firebase.firebaseNotification({
         type: 'unfollow',
         user_id: followUserId,
         followed_user_id: userId

      })
     pushNotification({
      type: 'unfollow',
      user_id: userId,
      follow_user_id: followUserId
   })
     sendSuccessResponse(data, res)
  })
   })
  }
})

}


  /**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Check if the user is already following the person
   * @return {boolean} - TRUE if already following
   *
   */
   function checkAlreadyFollowing(userId, followUserId, callback){

   	db.get().collection('users').find({ 
   		"_id" : userId, 
   		"following" : followUserId
   	})
   	.toArray(function (err, result) {

   		if (err) 
   			console.log(err)

   		if (result.length == 0) {
   			callback(false) 

   		} else {
   			callback(true)    		
   		}

   	})
   }


  /**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Update the following list and count of the Logged In User
   * @return {json} error
   * @return {boolean} true - if success 
   *
   */
   function incrementUserDocument(userId, followUserId, callback){

   	db.get().collection('users').update({
   		"_id" : userId
   	},{
   		$push : { 
   			"following" : followUserId
   		},
   		$inc : { "meta_count.following" : 1 }   
   	}, function(err, result){

   		if(err){
   			console.log(err)
   		}else{   			
   			callback(true)
   		}
   	})

   }

  /**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Insert userId to the followers list and increment count of the User being followed
   * @return {json} error
   * @return {boolean} true - if success 
   *
   */
   function incrementFollowUserDocument(userId, followUserId, callback){

   	db.get().collection('users').update({
   		"_id" : followUserId
   	},{
   		$push : { 
   			"followers" : userId
   		},
   		$inc : { "meta_count.followers" : 1 }   
   	}, function(err, result){

   		if(err){
   			console.log(err)
   		}else{   			
   			callback(true)
   		}

   	})

   }


   /**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Remove the followUserId from following list and decrement Following count of the Logged In User
   * @return {json} error
   * @return {boolean} true - if success 
   *
   */
   function decrementUserDocument(userId, followUserId, callback){

   	db.get().collection('users').update({
   		"_id" : userId
   	},{
   		$pull : { 
   			"following" : followUserId
   		},
   		$inc : { "meta_count.following" : -1 }   
   	}, function(err, result){

   		if(err){
   			console.log(err)
   		}else{   			
   			callback(true)
   		}
   	})

   }

  /**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Remove userId the followers list and decrement Followers count of the User being followed
   * @return {json} error
   * @return {boolean} true - if success 
   *
   */
   function decrementFollowUserDocument(userId, followUserId, callback){

   	db.get().collection('users').update({
   		"_id" : followUserId
   	},{
   		$pull : { 
   			"followers" : userId
   		},
   		$inc : { "meta_count.followers" : -1 }   
   	}, function(err, result){

   		if(err){
   			console.log(err)
   		}else{   			
   			callback(true)
   		}

   	})

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
 * @param {json} req - input request object
 * @return {json} error message (if any)
 * @desc Validate the input parameters
 *
 */
 function validateParams(req, res){
 	validator.validateData('photoComment', req)

 	var errors = req.validationErrors()
 	if(errors) {
 		res.status(400).json( common.formatResponse({
 			type: 'validationError',
 			code: 'BAD_PARAMETERS',
 			data: errors
 		}))
 		return
 	}
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


/**
 * @method
 * @param {json} result
 * @param {json} res - Response object
 * @desc Send success response
 *
 */
 function sendSuccessResponse(result, res){

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: result.code,
 		data: {
 			message: result.message, 
 			data: {} 
 		}
 	}))
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
    console.log("users not in array11111111111111111111111111111111",data)
    callback(data)
  })
}

 module.exports = router