/**
* @file 
* @desc Set language of a user
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
var path = require('path')

/**
 * @method
 * @return {json} List of languages
 * @desc Get a list of available languages
 *
 */
 router.get('/', function(req, res) {
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded) {
    getLanguages(function(data) {
      sendSuccessResponse('LANG_FETCH_SUCCESS', 'Languages fetched', data, res)
    })
  })
})


/**
 * @method
 * @return {json} Success or error message
 * @desc Set user language
 *
 */
 router.post('/', function(req, res) {
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded) {

 		var userId = new mongodb.ObjectId(decoded.userId)

 		if(!req.body.language) {
 			res.status(200).json( common.formatResponse({
 				type: 'error',
 				code: 'EMPTY_LANGUAGE',
 				data: {
 					message: "Language should not be empty"
 				}
 			}))
 			return false
 		}

 		var language = req.body.language.trim()
     console.log("language............",language)
     console.log("userId............",userId)
      var language1 = language.split(".")[0]

     var users = db.get().collection('users')
     users.update({
      "_id" : userId
    },{
      $set : { 
        "language" : language1 
      } 
    } , function(err, result) {
      if(err)
        console.log(err)

              // Send success response
              res.status(200).json( common.formatResponse({
                type: 'success',
                code: 'LANGUAGE_SUCCESS',
                data: {
                  message: "Language has been changed "
                }
              }))

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
 function getLanguages(callback){

  db.get().collection('lang').find({
    "status" : "active"
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    callback(result)
    console.log("result....................",result)
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
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponse(statusCode, message, data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: statusCode,
    data: {
      message: message, 
      data: { 
        details : data
      } 
    }
  }))
  return
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