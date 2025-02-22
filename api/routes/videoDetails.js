/*
 * @file
 * @desc Video details
 * @author Ajith
 * @date 19 June 2017
 *
 */
 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var mongodb = require('mongodb')


 router.get('/:memmbleId/:videoId', function(req, res){

 	console.log("inside video details API")

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	try{
 		var decoded = jwt.verify(token, common.getSecret())

 		var userId = new mongodb.ObjectId(decoded.userId)
 		var memmbleId = new mongodb.ObjectId(req.params.memmbleId)
 		var videoId = new mongodb.ObjectId(req.params.videoId)

 		getVideoDetails(memmbleId, videoId, function(data){
 			if(data.length >0){

 				getOtherVideoDetails(memmbleId, videoId, function(otherData){

 					data[0]["others"] = otherData

 					let albumUserId = data[0].album.user_id
 					getUserDetails(albumUserId, function(output){  

 						data[0].album.user_name = output.name
 						data[0].album.user_account_type = output.subscriptions.type
 						getBlockUsers(userId, function(blist){
          				var blockList = blist.notInarray

 						getVideoComments(videoId,blockList, function(result){ 

 							data[0]["videos"][0]["comments"] = result 

 							var count = data[0].album.people.length
 							var finalOutput = data

 							if (count > 0) {
 								var i = 0;
 								for(people of data[0].album.people){            
 							// get details of tagged people in the album
 							getUserDetails(new mongodb.ObjectId(people), function(output){  

 								let user = {
 									user_id : output._id,
 									user_name : output.name,
 									user_image : output.profile_image.thumbnail.small
 								}

 								finalOutput[0].album.people[i] = user

 								if ( i == count-1 ) {
 									sendSuccessResponse(finalOutput, res)             
 								}

 								i++
 							})

 						}         

 					}else{
 						sendSuccessResponse(finalOutput, res)
 					}
 					
 				})
 				})
 					})
 				})

 			}else{

 				res.status(200).json(common.formatResponse({
 					type: 'error',
 					code: 'NO_VIDEO_DETAILS_SUCCESS',
 					data: {
 						message: 'The Video is unavailable now'
 					}
 				}))

 			}


 			
 		})

 	}catch(err){
 		sendAuthError(res)
 	}

 })
 
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
 * @param {ObjectId} memmbleId
 * @param {ObjectId} videoId
 * @param {function} callback
 * @return {json} 
 * @desc Get details of the video
 * @collection - memmbles
 *
 */
 function getVideoDetails(memmbleId, videoId, callback){

 	var memmbles = db.get().collection('memmbles')

 	memmbles.find({
 		"_id": memmbleId,
 		"videos.video_id": videoId
 	},{
 		"videos" : {
 			$elemMatch : {
 				"video_id": videoId
 			}
 		},
 		"album" : 1
 	}
 	).toArray(function(err, result){
 		if(err){
 			console.log(err)			
 			throw err
 		}
 		var details = result
 		callback(details)
 	})
 }


 function getOtherVideoDetails(memmbleId, videoId, callback){

 	var memmbles = db.get().collection('memmbles')

 	memmbles.find({
 		"_id": memmbleId
 	},{
 		"photos" : 1,
 		"videos" : 1
 	}
 	).toArray(function(err, result){
 		if(err){
 			console.log(err)			
 			throw err
 		}
 		var details = result[0]
 		callback(details)
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
 		"_id" : 1,
 		"subscriptions.type" : 1 		
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
 * @param {ObjectId} videoId
 * @param {function} callback
 * @return {json} 
 * @desc Get comment details of the video
 * @collection - comments
 *
 */
 function getVideoComments(videoId,blockList, callback){

 	var comments = db.get().collection('comments')
 	comments.find({
 		"video_id": videoId,
 		"author.user_id" : { "$nin" : blockList }

 	},{
 		"memmble_id":0,
 		"video_id":0
 	})
 	.sort({"date_posted" : -1})
 	.toArray(function(err, result){
 		if(err){
 			console.log(err)			
 			throw err
 		}

 		var count = result.length
 		var commentDetails = result

 		if (count == 0) {
 			callback(commentDetails)	

 		} else {

 			var finalOutput = []
 			var commentUsers = []
 			
 			for(let item of result){		

 				/* get details of the Commented User*/
 				db.get().collection('users').find({
 					"_id" : new mongodb.ObjectId(item.author.user_id)
 				},{
 					"name" : 1,
 					"profile_image" : 1,
 					"_id" : 1
 				}).toArray(function(err, dbResult){
 					if(err){
 						console.log(err)      
 						throw err
 					}

 					let data = dbResult[0]
 					commentUsers.push(data) 
 					/*
 					if (data != undefined) {
 						commentUsers.push(data) 
 						console.log("pushed")

 					} else{
 						console.log("else")
 						console.log(count)
 						count--
 						console.log(count) 						
 					}*/ 			

 					/*Add user name and image  to the comment details*/
 					for(let comment of commentDetails){

 						for(user of commentUsers){ 						
 							
 							if( (""+comment.author.user_id) == (""+user._id) ){ 						

 								comment.author.user_name  = user.name
 								comment.author.user_image  = user.profile_image.thumbnail.small 								
 								
 								if(finalOutput.indexOf(comment) == -1) {
 									finalOutput.push(comment)	

 									if ( finalOutput.length == count) {
 										// sort comments according to the descending order of posted data
 										finalOutput.sort(function(a, b) {
 											return new Date(b.date_posted) - new Date(a.date_posted)
 										})

 										callback(finalOutput)	
 									} 
 								} 						
 							}  							
 						} 						
 					}					
 				}) 				
 			}
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
    console.log("users not in array",data)
    callback(data)
  })
}

 /**
 * @method
 * @param {object} res - Response object
 * @param {json} data
 * @return {json}
 * @desc Send Authentication Error
 *
 */
 function sendSuccessResponse(data, res){

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: 'VIDEO_DETAILS_SUCCESS',
 		data: {
 			message:'Video details fetched successfully', 
 			data: { 
 				details : data
 			} 
 		}
 	}))
 }

 module.exports = router