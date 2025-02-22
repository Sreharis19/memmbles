/**
* @file 
* @desc Send contact message to admin
* @author Deepak
* @date 22 Nov 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
const config = require('config')

var limit = config.get('email.limit')
var adminEmail = config.get('email.adminEmail')

/**
 * @method
 * @return {json} Success or error message
 * @desc Send contact message
 *
 */
 router.post('/', function(req, res) {
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded) {

 		var userId = new mongodb.ObjectId(decoded.userId)

 		if(!req.body.message) {
 			res.status(200).json( common.formatResponse({
 				type: 'error',
 				code: 'EMPTY_MESSAGE',
 				data: {
 					message: "Message should not be empty"
 				}
 			}))
 			return false
 		}

 		var message = req.body.message.trim()

        // Check if characters in message is less than 10
        if(message.length < 10) {
        	res.status(200).json( common.formatResponse({
        		type: 'error',
        		code: 'INVALID_MESSAGE',
        		data: {
        			message: "Message should contain at least 10 characters"
        		}
        	}))
        } else {

        	hasLimitReached(userId, limit, function(limitReached) {

        		if(limitReached) {
        			res.status(200).json( common.formatResponse({
        				type: 'error',
        				code: 'LIMIT_REACHED',
        				data: {
        					message: "You have sent maximum number of messages allowed per day. Please try again tomorrow"
        				}
        			}))
        		} else {

        			getUserDetails(userId, function(response) {

        				saveMessage(decoded, message)

        			    // Send email
        			    common.sendEmail({
        			    	from: config.get('email.from'),
        			    	to: adminEmail,
        			    	subject: 'Memmbles - '+response.name.first+' '+response.name.last+' sent a new contact message',
        			    	template: 'contact.html',
        			    	data: {
        			    		name: response.name,
        			    		email: response.email,
        			    		image: response.profile_image.thumbnail.small,
        			    		message: message
        			    	}
        			    })

                        // Send email CEO
                        common.sendEmail({
                            from: config.get('email.from'),
                            to: config.get('email.to1'),
                            subject: 'Memmbles - '+response.name.first+' '+response.name.last+' sent a new contact message',
                            template: 'contact.html',
                            data: {
                                name: response.name,
                                email: response.email,
                                image: response.profile_image.thumbnail.small,
                                message: message
                            }
                        })

                        // Send email Hyle
                        common.sendEmail({
                            from: config.get('email.from'),
                            to: config.get('email.to2'),
                            subject: 'Memmbles - '+response.name.first+' '+response.name.last+' sent a new contact message',
                            template: 'contact.html',
                            data: {
                                name: response.name,
                                email: response.email,
                                image: response.profile_image.thumbnail.small,
                                message: message
                            }
                        })



        			    res.status(200).json( common.formatResponse({
        			    	type: 'error',
        			    	code: 'CONTACT_MESSAGE_SENT',
        			    	data: {
        			    		message: "Your message has been sent"
        			    	}
        			    }))

        			})

        		}

        	})
        }

    })
 })


 function hasLimitReached(userId, limit, callback) {

 	var start = new Date();
 	start.setHours(0,0,0,0);

 	var end = new Date();
 	end.setHours(23,59,59,999);

 	var admin_messages = db.get().collection('admin_messages')
 	admin_messages.find({
 		"user_id": userId,
 		"date_sent": {
 			$gte: start,
 			$lt: end
 		}
 	}).toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}
 		if(result.length >= limit) {
 			callback(true)
 		} else {
 			callback(false)
 		}
 		
 	})
 }

 function saveMessage(decoded, message) {

 	var payload = {
 		user_id: new mongodb.ObjectId(decoded.userId),
 		message: message,
 		date_sent: new Date()  
 	}

 	var admin_messages = db.get().collection('admin_messages')
 	admin_messages.insert( payload, function(err, result) {
 		if(err)
 			res.status(500).json( common.formatResponse({
 				type: 'dbError',
 				code: 'DB_ERROR',
 				data: err
 			}))
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
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} 
 * @desc Get list of Followers of the User  
 * @collection - users
 *
 */
 function getFollowers(userId, callback){

 	db.get().collection('users').find({
 		"_id" : userId
 	},{
 		"followers" : 1,
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