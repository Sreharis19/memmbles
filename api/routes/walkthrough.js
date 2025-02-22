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
 var jwt = require('jsonwebtoken')
 var db = require('../database/mongodb.js')
 var mongodb = require('mongodb')

/**
 * @method
 * @desc Change status of show_walk_through in db
 */
 router.post('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

      var userId = new mongodb.ObjectId(decoded.userId) 
      hideWalkthrough(userId)

      var data = {
        "code" : "WALKTHROUGH_HIDE_SUCCESS",
        "message" : "Walkthrough status updated"
     }
     sendSuccessResponse(data, res)
  })

 })

/**
 * @method
 * @param {ObjectId} userId
 * @collection  users
 * @desc Hide walkthrough
 *
 */
 function hideWalkthrough(userId){

   db.get().collection('users').update({
      "_id" : userId
   },{         
      $set : {
        "show_walk_through" : false
      }  
   }, function(err, result){

      if(err){
         console.log(err)
      }else{            
         // console.log(result)            
      }
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