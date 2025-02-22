/**
* @file 
* @desc Voip Push Notification module
* @author Jins
* @date 02 Jul 2020
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
const mongodb = require('mongodb')
const config = require('config')

/**
* @callback
* @param {string} token
* @return {json} success or error message
*
*/

router.post('/', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  validator.validateData('voipPush', req);
  var errors = req.validationErrors()
  if(errors) {
    res.status(400).json( common.formatResponse({
      type: 'validationError',
      code: 'BAD_PARAMETERS',
      data: errors
    }))
    return
  }

	var user = db.get().collection('users')
	user.update({
	            _id: userId
	},{$set:{"voip.token":req.body.voip_token}} ,function(err, result) {
	      // send response
	      res.status(200).json(common.formatResponse({
	      type: 'success',
	      code: 'DEVICE_TOKEN_INSERT_SUCCESS',
	      data: {
	        message: "You have successfully inserted device token"
	      }
	      }))
	      
	})
 })
})


router.put('/', function(req, res) {

	var token = ''
  	if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  	}
  	verifyToken(token, res, function(decoded){
  	var userId = new mongodb.ObjectId(decoded.userId)
		var user = db.get().collection('users')
		user.update({
	        _id: userId
			},{$unset:{"voip.token": ""}} ,function(err, result) {
		      	res.status(200).json(common.formatResponse({
			      	type: 'success',
			      	code: 'DEVICE_TOKEN_REMOVE_SUCCESS',
			      	data: {
			        	message: "You have successfully removed device token"
			      	}
		      	}))	      
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
    console.log(err)
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


module.exports = router