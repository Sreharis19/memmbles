/**
* @file 
* @desc GET friends details
* @author Deepak
* @date 25 Oct 2017
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
 * @desc GET Friends list of a User
 *
 */
 router.get('/:userId', function(req, res){
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		var userId = new mongodb.ObjectId(req.params.userId)
 		var chatFriends = [] 

 		getFriends(userId, function(data){
 			console.log("data",data)

 			if (data.hasOwnProperty('chat_friends')) {
 				chatFriends = data.chat_friends 
 			}

 			var count = chatFriends.length
 			var output = []

 			if (count > 0) {
 				var i = 0
 				for(let friend of chatFriends){    

 					var unSeenCount = 0

 					if( data.hasOwnProperty('chat_history_meta') ) {
 						//console.log('==has== chat_history_meta')
 						//console.log(friend.user_id.toString())
 						if( data.chat_history_meta.hasOwnProperty( friend.user_id.toString() ) ) {
 							unSeenCount = data.chat_history_meta[friend.user_id.toString()] 
 						} 						
 					}

 					//console.log('====unSeenCount==== '+unSeenCount)
 					friend.unseen_count = unSeenCount
 					getLastMsgDetails(userId,friend, function(msgdata){
 						if(msgdata)
 						{
 							var lastMsgTime = msgdata.time
 							if(msgdata.from == userId.toString())
 							{
 								if(msgdata.videoUrl)
 								{
 									msgdata.msg ="you sent a video"
 								}
 								else if(msgdata.imageUrl)
 								{
 							 		msgdata.msg ="you sent a photo"	
 								}

 							}
 							else
 							{
 								if(msgdata.videoUrl)
 								{
 									msgdata.msg ="sent a video"
 								}
 								else if(msgdata.imageUrl)
 								{
 							 		msgdata.msg ="sent a photo"	
 								}
 							} 							
 						}
 					getUserDetails(friend, function(udata){

 						let result = {}

 						result.user_id = udata._id
 						result.user_name = udata.name
 						result.userName = udata.name.first+" "+udata.name.last
 						result.user_image = udata.profile_image.thumbnail.small
 						result.meta = udata.meta
 						result.lastMsg = msgdata || ""
 						result.lastMsgTime = lastMsgTime || ""
 						result.unseen_count = udata.meta.unseen_count
 						result.firebase = udata.firebase || ""

 						//console.log('udata.meta.unseen_count===== '+udata.meta.unseen_count)

 						output.push(result)

 						if ( i == count-1 ) {
 							sendSuccessResponse(output, res)              
 						}
 						i++
 					})
 				 })

 				}

 			} else{
 				sendSuccessResponse(output, res)
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
 * @desc Get list of Friends of the User  
 * @collection - users
 *
 */
 function getFriends(userId, callback){

 	db.get().collection('users').find({
 		"_id" : userId
 	},{
 		"chat_friends" : 1,
 		"chat_history_meta" : 1,
 		"_id" : 0
 	}).toArray(function(err, result){
 		console.log("result",result)
 		if(err){
 			console.log(err)      
 			throw err
 		}
 		let data = result[0]
 		console.log("data",data)
 		if(data){
 			 		callback(data)

 		}
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
 function getUserDetails(friend, callback){

 	db.get().collection('users').find({
 		"_id" : friend.user_id
 	},{
 		"name" : 1,
 		"profile_image" : 1,
 		"firebase":1
 	}).toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}

 		let data = result[0]
 		data.meta = friend
 		callback(data)
 	})
 }



/**
 * @method
 * @param {ObjectId} userId 
 * @param {function} callback
 * @return {json} data
 * @desc Get last msg of user
 * @collection - chat history
 *
 */
 function getLastMsgDetails(userId,friend, callback){
 db.get().collection('chat_history').find({

   $or: [
    {
     $and: [
     { "from": friend.user_id },
     { "to": userId }
     ] 
   	},
   {
     $and: [
     { "from": userId },
     { "to": friend.user_id }
     ] 
   }
   ]},{"from":1,"time":1,"msg":1,"imageUrl":1,"videoUrl":1,"_id":0}
 	).sort({$natural:-1}).limit(1).toArray(function(err, result){
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
 		code: 'FRIENDS_LIST_SUCCESS',
 		data: {
 			message:'Freiends list fetched successfully', 
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