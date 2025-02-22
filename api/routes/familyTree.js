/*
 * @file
 * @desc Hide walkthrough
 * @author Deepak
 * @date 11 July 2017
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
 var Person = require('./person.model');
 var firebase = require('../functions/pushFirebase.js')

 /**
 * @method
 * @desc Change status of show_walk_through in db
 */

 router.get('/', function(req, res){
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

    // var userId = new mongodb.ObjectId(decoded.userId)
    var userId = new mongodb.ObjectId(decoded.userId)

    getUserDetails(userId, function(data){
    	if(data.familyShareId){


    		var fid = data.familyShareId 
    		getFamilyMemmers(fid, function(data1){
    			 var tree_memmbers = data1.tree_memmbers 


    			var count = tree_memmbers.length
    			var output = []

    			if (count > 0) {
    				var i = 0
    				for(let tree_memmber of tree_memmbers){        

    					getUserDetails(tree_memmber, function(data2){

				    		result.tree_memmber_id = data2._id
				            result.tree_memmber_name = data2.name
				            result.tree_memmber_image = data2.profile_image.thumbnail.small

				            output.push(result)

				            if ( i == count-1 ) {
				            	sendSuccessResponseTree(output, res)              
				            }
				            i++
        				})

    				}

    			} else{
    				sendSuccessResponseTree(output, res)
    			}
    		})
    	}
    })

})
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
 function getUserDetails(userId, callback){

 	db.get().collection('users').find({
 		"_id" : userId
 	}).toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}

 		let data = result[0]
 		callback(data)
 	})
 }
function getFamilyMemmers(fid, callback){

 	db.get().collection('people').find({ 
 		"familyId" : fid,
 		"is_root": true
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
 function sendSuccessResponseTree(data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'TREEMEMMBERS_SUCCESS',
    data: {
      message:'Tree Memmbers fetched successfully', 
      data: { 
        details : data
      } 
    }
  }))
}


 router.post('/', function(req, res){
  console.log("trrrrrrrrrrrrrreeeeee shareeeeeeeeeeeee@@@@@@@@@@@@@@@@@@@@@@@@@11111111111")

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		var userId = new mongodb.ObjectId(decoded.userId) 
 		var inviteUserId = new mongodb.ObjectId(req.body.to) 

 		switch(req.body.action) {


 			case 'share':      
 			share(userId, inviteUserId, res)
 			break




 			case 'tree-accept':  
        console.log("trrrrrrrrrrrrrreeeeee shareeeeeeeeeeeee@@@@@@@@@@@@@@@@@@@@@@@@@2222222222222")
      
 			acceptShare(userId, inviteUserId, res)
 			break







 		}
 	})

 })


 function share(userId, inviteUserId, res) {

 	console.log('inside share')
 	db.get().collection('users').find({ 
 		"_id" : userId
 	})
 	.toArray(function (err, result) {
 		// console.log(result)
 		if(result[0].familyShareId){

 		



console.log("result[0].familyShareId result[0].familyShareId result[0].familyShareId result[0].familyShareId",result[0].familyShareId)



 		var data = {
 			"code" : "TREE_SHARE_SUCCESS",
 			"message" : "share tree has been sent"
 		}
    

 		pushNotification({
 			type: 'tree_share',
 			user_id: userId,
 			fid: result[0].familyShareId,
 			invite_user_id: inviteUserId
 		})
 		sendSuccessResponse(data, res)
}

 	})


 }



 function acceptShare(userId, inviteUserId, res) {

 	db.get().collection('users').find({ 
 		"_id" : inviteUserId
 	})
 	.toArray(function (err, result) {

 		if (err) 
 			console.log(err)

 		console.log("id id id id id id id",result[0].familyShareId)
 		var fid = result[0].familyShareId

 		checkAlreadyInSharedList(userId, inviteUserId,result[0].familyShareId, function(result) {
 			console.log('----------result----------')
 			console.log(result)
 			if (!result) {
 				addToShareList(userId, inviteUserId,fid, function(response) { })
 				UpdateUserList(userId,fid, function(response) { })

 			}
 		})


 		checkAlreadyInSharedList(inviteUserId, userId,result[0].familyShareId, function(result) {
 			if (!result) {
 				addToShareList(inviteUserId,userId, fid, function(response) { })
 			}
 		})


 		removeAcceptedNotification(userId, inviteUserId,fid)

 		pushNotification({
 			type: 'tree_share_accepted',
 			user_id: userId,
 			fid: fid,
 			invite_user_id: inviteUserId
 		})

 		pushNotification({
 			type: 'tree_share_accepted_by_user',
 			user_id: inviteUserId,
 			fid: fid,
 			invite_user_id: userId
 		})

 		// res.status(200).json( common.formatResponse({
 		// 	type: 'success',
 		// 	code: 'CHAT_INVITE_ACCEPTED_SUCCESS',
 		// 	data: 'Chat invitaion has been accepted'
 		// }))

 	})
 }


 function checkAlreadyInSharedList(userId, inviteUserId, fid,callback){
 	console.log("==============================================")
 	console.log(fid)
 	console.log(userId)
 	console.log("==============================================")

 	db.get().collection('people').find({ 
 		"familyId" : fid,
 		"is_root": true,
 		"tree_memmbers.user_id" : userId
 	})
 	.toArray(function (err, result) {

 		if (err) 
 			console.log(err)
 		console.log(result)
 		console.log(result.length)

 		if (result.length == 0) {
 			callback(false) 

 		} else {
 			callback(true)        
 		}

 	})
 }

 // function checkAlreadyInSharedList(userId, inviteUserId,fid, callback){

 // 	db.get().collection('people').find({ 
 // 		"familyId" : fid,
 // 		"is_root": true
 // 	}).forEach(function(doc) {
 // 		if(doc.tree_memmbers){

 // 			var status = false

 // 			doc.tree_memmbers.map(function(n) {

 // 				let uId = n.user_id.toString()
 // 				let uUserId = userId.toString()

 // 				if(uUserId === uId) {


 // 					status = true




 // 				}

 // 			})
 // 		}
 // 	})
 // 	// .toArray(function (err, result) {

 // 	// 	if (err) 
 // 	// 		console.log(err)

 // 	// 	if (result.length == 0) {
 // 	// 		callback(false) 

 // 	// 	} else {
 // 	// 		callback(true)        
 // 	// 	}

 // 	// })
 // }


 function addToShareList(userId, inviteUserId,fid, callback) {

 	console.log('_id: '+ userId)
 	console.log('user_id: '+ inviteUserId)

 	db.get().collection('people').update({
 		"familyId" : fid,
 		"is_root": true
 	},{
 		$push : { 
 			"tree_memmbers" : {
 				user_id: userId
 			}
 		}
 	}, function(err, result){

 		if(err){
 			console.log(err)
 			callback(false)
 		}else{            
 			callback(true)
 		}
 	})

 }
 function UpdateUserList(userId,fid, callback) {

 	console.log('_id: '+ userId)


 	db.get().collection('users').update({
 		"_id" : userId
 		
 	},{
 		$set : { 
 			"familyShareId" :  fid
 		}
 	}, function(err, result){

 		if(err){
 			console.log(err)
 		}else{            
 			callback(true)
 		}
 	})

 }



 function removeAcceptedNotification(userId, inviteUserId,fid) {

 	console.log('--removeAcceptedNotification--')

 	db.get().collection('users').find({
 		"_id" : userId
 	}).forEach(function(doc) {

 		doc.notifications.map(function(n) {

 			let uId = n.user_id.toString()
 			let iId = inviteUserId.toString() 
 			let uUserId = userId.toString()
      //console.log(iId +'==='+ uId +'&&'+ n.notification_type +'== "chat_invite"') 
       // if(n.notification_type == "tree_share"&& fid == n.fid){
       //         console.log(iId +'==='+ uId +'&&'+ n.notification_type +'== "tree_share"'+fid +'=='+ n.fid) 


       // }
       // if(uId === iId && n.notification_type == "tree_share"){
       //  console.log("nnnnnnnnnnn",n)
       //  console.log("fid",fid)
       //         console.log(iId +'=+=+='+ uId +'&&'+ n.notification_type +'== "tree_share"'+fid +'=='+ n.fid) 


       // }
       // if(fid == n.fid){
       //         console.log(iId +'=-=-='+ uId +'&&'+ n.notification_type +'== "tree_share"'+fid +'=='+ n.fid) 


       // }

 			if(iId === uId && n.notification_type == "tree_share") {
      console.log(iId +'==='+ uId +'&&'+ n.notification_type +'== "tree_share"') 

 				console.log('====MATCH FOUND====')

 				db.get().collection('users').update({"_id" : userId },
 				{ 
 					$pull: { 
 						notifications: {
 							notification_id: n.notification_id
 						}
 					} 
 				}, function(err, result) {
 					if(err) {
 						console.log(err)
 					}else{
 						console.log('notifcation deleted')
 					}

 				})


 			}

 		})
 	})
 }



 function  pushNotification(input) {
  
  firebase.firebaseNotification({
                     type: input.type,
                     user_id: input.invite_user_id,
                     senderId: input.user_id

        })

 	var notificationObject = {   
 		notification_id: new mongodb.ObjectId(),
 		notification_type: input.type,
 		user_id: input.user_id ,
 		fid: input.fid,
 		invite_user_id: input.invite_user_id,
 		is_new: true,
 		date_created: new Date()
 	}

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.user_id }, {"password" : 0}).toArray(function(err, result){
   	if(err)
   		throw err
   	notificationObject.image = result[0].profile_image.thumbnail.small
   	notificationObject.user_name = result[0].name

      // Add new notification
      users.update(
      	{"_id" : notificationObject.invite_user_id
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
            	topic: notificationObject.invite_user_id,
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
 module.exports = router