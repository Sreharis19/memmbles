/*
 * @file
 * @desc Comments CRUD
 * @author Ajith
 * @date 31 Mar 2017
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
 * @desc Add comment for a Photo
 */
 router.post('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		req.body = common.trim(req.body)
 		var data = {}

 		// memmbleId	= verifyMemmble(memmble, res, token)
 		// photoId	= verifyPhoto(photo, res, token)
 		validateParams(req, res)

 		data.comment = req.body.comment
 		data.userId = new mongodb.ObjectId(decoded.userId)
 		data.memmbleId = new mongodb.ObjectId(req.body.memmbleId.trim())

 		data.type = req.body.type.trim()

 		if (data.type == "photo") {
 			data.photoId = new mongodb.ObjectId(req.body.photoId.trim()) 			
 		}

 		if (data.type == "video") {
 			data.videoId = new mongodb.ObjectId(req.body.videoId.trim()) 			
 		}
    getUserIdFromMemmble(data.memmbleId, function(memUser) {
    var memmUserId = memUser[0].album.user_id
    console.log("memUser",memUser)
    getBlockUsers(data.userId, function(blist){
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

 		insertComment(data, function(result){


 			pushNotification({
 				type: data.type+'_comment',
 				memmble_id: data.memmbleId,
 				commented_user_id: data.userId,
 				body: req.body
 			})

 			var output = {
 				"data":{
 					"commentId" : result.insertedId 					
 				},
 				"code" : "COMMENT_ADDED",
 				"message" : "Comment added successfully"
 			}
 			sendSuccessResponse(output, res)
 		})
    }
  })
  })
 	})
 })


 router.delete('/:commentId', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){ 	
 		var data = {}
 		data.userId = decoded.userId

 		data.commentId = new mongodb.ObjectId(req.params.commentId.trim())

 		verifyComment(data, res, function(result){

 			if(result){
 				deleteComment(data.commentId, res)
 			}
 		}) 		
 	})
 })



 function  pushNotification(input) {

   var notificationObject = {   
    notification_id: new mongodb.ObjectId(),
    notification_type: input.type,
    user_id: input.commented_user_id,
    memmble_id: input.memmble_id,
    is_new: true,
    date_created: new Date()
  }

   // Get user details
   var users = db.get().collection('users')
   var memmbles = db.get().collection('memmbles')

   users.find({ "_id" : notificationObject.user_id }, {"password" : 0}).toArray(function(err, result){
    if(err)
     throw err
   notificationObject.image = result[0].profile_image.thumbnail.small
   notificationObject.liked_user_name = result[0].name

   memmbles.find({ "_id" : notificationObject.memmble_id }).toArray(function(err, result){
    if(err)
      throw err
    notificationObject.album_title = result[0].album.title
    var push_user_id = result[0].album.user_id
    firebase.firebaseNotification({
         type: input.type,
         user_id: push_user_id,
         commented_user_id: notificationObject.user_id,
         album_title: notificationObject.album_title

      })

    switch(input.type) {
    	case 'photo_comment':
    	notificationObject.photo_id = new mongodb.ObjectId(input.body.photoId.trim()) 
    	break
    	case 'video_comment':
    	notificationObject.photo_id = new mongodb.ObjectId(input.body.videoId.trim()) 
    	break
    }

       // Add new notification
       users.update(
         {"_id" : push_user_id
       },{
         $push : { 
          "notifications" :  notificationObject
        },
        $inc : {
          "meta_count.notifications" : 1 
        }
      }, function(err, result) {
       if(err) {
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
 * @param {string} memmble - JWT encoded memmble id
 * @param {string} token - Auth Token 
 * @param {function} callback
 * @return {string} memmbleId
 * @desc Decode JWT to obtain memmble id
 *
 */
 function verifyMemmble(memmble, res, token){
 	try{
 		var memmbleId = jwt.verify(memmble, token)
 		return memmbleId
 	}catch(err){
 		console.log("invalid memmble")
 		res.status(200).json( common.formatResponse({
 			type: 'validationError',
 			code: 'INVALID_MEMMBLE',
 			data: 'Invalid memmble'
 		}))
 		return
 	}
 }

/**
 * @method
 * @param {string} photo - JWT encoded photo id
 * @param {string} token - Auth Token 
 * @param {function} callback
 * @return {string} memmbleId
 * @desc Decode JWT to obtain photo id
 *
 */
 function verifyPhoto(photo, res, token){

 	try{
 		var photoId = jwt.verify(photo, token)
 		return photoId
 	}catch(err){
 		console.log("invalid photo")
 		res.status(200).json( common.formatResponse({
 			type: 'validationError',
 			code: 'INVALID_PHOTO',
 			data: 'Invalid photo'
 		}))
 		return
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
 * @param {json} data
 * @param {function} callback
 * @collection comments
 * @desc Insert the comment to collection - comments
 *
 */
 function insertComment(data, callback){

 	if (data.type == "photo") {
 		var payload = {
 			"memmble_id" : data.memmbleId,
 			"photo_id" : data.photoId,
 			"author":{ 			
 				"user_id" : data.userId
 			},
 			"message" : data.comment,
 			"date_posted" : new Date()
 		}
 	}

 	if (data.type == "video") {
 		var payload = {
 			"memmble_id" : data.memmbleId,
 			"video_id" : data.videoId,
 			"author":{ 			
 				"user_id" : data.userId
 			},
 			"message" : data.comment,
 			"date_posted" : new Date()
 		}
 	}

 	var comments = db.get().collection('comments')
 	comments.insertOne(payload, function(err, result){

 		if(err) 
 			throw err
 		callback(result)
 	})
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
 			data: { 
 				details : result.data 			
 			} 
 		}
 	}))
 }


/**
 * @method
 * @param {string} memmble - JWT encoded memmble id
 * @param {string} token - Auth Token 
 * @param {function} callback
 * @return {string} memmbleId
 * @desc Decode JWT to obtain memmble id
 *
 */
 function decodeComment(commentToken, res, token, callback){
 	console.log("inside decodeComment")

 	try{
 		var commentId = jwt.verify(commentToken, token)
 		callback(commentId)
 	}catch(err){
 		console.log("invalid commentId")
 		res.status(200).json( common.formatResponse({
 			type: 'validationError',
 			code: 'INVALID_COMMENT',
 			data: 'Invalid comment'
 		}))
 		return
 	}
 }

 /**
 * @method
 * @param {object} data - comment ID and user ID 
 * @param {object} res - response object
 * @param {function} callback
 * @desc Check if Comment ID exists
 *
 */
 function verifyComment(data, res, callback){

 	var comments = db.get().collection('comments') 	
 	comments.find({ 
 		"_id": data.commentId 
 	}).toArray(function (err, result) {

 		if(err) 
 			res.status(500).json( common.formatResponse({
 				type: 'dbError',
 				code: 'DB_ERROR',
 				data: err
 			}))

 		if(result.length == 0) {
 			res.status(200).json( common.formatResponse({
 				type: 'error',
 				code: 'INVALID_COMMENT',
 				data: 'Comment does not exists'
 			}))
 			return

 		} else {

 			var resultUserId = result[0].author.user_id
 			
 			if(resultUserId != data.userId){

 				var commentMemmbleId = result[0].memmble_id
 				// console.log("user not authorized to delete comment")
 				console.log("user ids not matching")

 				// check if the User is Album Owner
 				var memmbles = db.get().collection('memmbles')
 				memmbles.find({ 
 					"_id": commentMemmbleId
 				},{
 					"album.user_id" : 1
 				}).toArray(function (err, result) {

 					console.log(result)

 					if (result[0].album.user_id ==  data.userId) {
 						console.log("Album user matching")
 						callback(true)
 					}else{

 						res.status(200).json( common.formatResponse({
 							type: 'error',
 							code: 'UNAUTHORIZED_USER',
 							data: 'User not authorized to delete this comment'
 						}))
 						return
 					}

 				})

 			} else{
 				console.log("return true")
 				callback(true)
 			}

 		}
 	})

 }

/**
 * @method
 * @param {objectId} commentId 
 * @param {object} res - Response object
 * @desc Delete a Commment
 *
 */
 function deleteComment(commentId, res){

 	var comments = db.get().collection('comments')

 	comments.remove( { "_id": commentId}, function (err, result) {

 		if(err) 
 			res.status(500).json( common.formatResponse({
 				type: 'dbError',
 				code: 'DB_ERROR',
 				data: err
 			}))
 		
 		if(result.length == 0) {
 			res.status(200).json( common.formatResponse({
 				type: 'error',
 				code: 'INVALID_COMMENT',
 				data: 'Comment does not exists'
 			}))
 			return
 		} else {

 			res.status(200).json( common.formatResponse({
 				type: 'success',
 				code: 'COMMENT_DELETE_SUCCESS',
 				data: {
 					message:'Comment deleted successfully', 
 					data: {} 
 				}
 			}))
 		}

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
      "_id": memmbleId
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