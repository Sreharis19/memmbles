/**
* @file 
* @desc Change password module
* @author Deepak
* @date 13 Feb 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
const config = require('config')

/**
* @callback
* @param {string} token
* @return {json} success or error message
*
*/
router.put('/', function(req, res) {

	var token = ''
	if(req.headers.authorization) {
		var token = req.headers.authorization.split(" ")[1]
	}

	/**
	 * @jwt
	 * @desc Verify JWT 
	 *
	 */
	 try{
	 	var decoded = jwt.verify(token, common.getSecret())
	 	var users = db.get().collection('users')

	 	req.body = common.trim(req.body)
	 	console.log(req.body)

	 	validator.validateData('changePassword', req);

	 	var errors = req.validationErrors()
	 	if(errors) {

	 		res.status(400).json( common.formatResponse({
	 			type: 'validationError',
	 			code: 'BAD_PARAMETERS',
	 			data: errors
	 		}))
	 		return
	 	}

		/**
		 * @database
		 * @desc Check if user exist 
		 * @collection users
		 *
		 */
		 users.find( {email: decoded.email} ).toArray(function (err, result) {

		 	if(err) 
		 		res.status(500).json( common.formatResponse({
		 			type: 'dbError',
		 			code: 'DB_ERROR',
		 			data: err
		 		}))

		 	if(result.length == 0) {
		 		res.status(200).json( common.formatResponse({
		 			type: 'error',
		 			code: 'INVALID_USER',
		 			data: 'User does not exist'
		 		}))
		 		return
		 	} else {

		 		/**
		 		 * @otp
		 		 * @desc Check if decoded OTP is matching with db entry
		 		 *
		 		 */
		 		 if(result[0].otp != decoded.otp) {
		 		 	res.status(401).json( common.formatResponse({
		 		 		type: 'error',
		 		 		code: 'OTP_EXPIRED',
		 		 		data: 'OTP has been expired'
		 		 	}))
		 		 	return
		 		 }

		 		 if(req.body.password != req.body.confirmPassword) {

		 		 	res.status(400).json( common.formatResponse({
		 		 		type: 'error',
		 		 		code: 'PASSWORD_MISMATCH',
		 		 		data: 'Password and confirm password does not match'
		 		 	}))
		 		 } else {

		 		 	var otp = common.generateOTP()

		 		 	users.update({email: decoded.email}, 
		 		 		{$set: {
		 		 			password: common.hashString(req.body.password),
		 		 			otp: otp
		 		 		}}, function(err, count, updateResult) {

		 				/**
		 				* @email
		 				* @desc Send password change notification email
		 				*
		 				*/
		 				common.sendEmail({
		 					from: config.get('email.from'),
		 					to: decoded.email,
		 					subject: 'Memmbles - Password Changed',
		 					template: 'password_changed.html',
		 					data: {
		 						name: result[0].firstName
		 					}
		 				})

		 				res.status(200).json( common.formatResponse({
		 					type: 'success',
		 					code: 'PASSWORD_CHANGED',
		 					data: {
		 						message: 'Password has been successfully changed', 
		 						data: ''
		 					}
		 				}))

		 			})
		 		 }

		 		}

		 	})

		} catch(err) {
			res.status(401).json( common.formatResponse({
				type: 'authorizationError',
				code: 'INVALID_TOKEN',
				data: 'User authentication failed'
			}))
			return
		}

	})


/**
* @callback
* @param {string} token
* @return {json} success or error message 
	// in app change password
*
*/
router.put('/inapp', function(req, res) {

	var token = ''
	if(req.headers.authorization) {
		var token = req.headers.authorization.split(" ")[1]
	}

	/**
	 * @jwt
	 * @desc Verify JWT 
	 *
	 */
	 try{
	 	console.log("hlllllllllllllllllllllllllllllllllllllllllll",token)
	 	var decoded = jwt.verify(token, common.getSecret())
	 	console.log("hlllllllllllllllllllllllllllllllllllllllllll",decoded)

	 	var users = db.get().collection('users')

	 	req.body = common.trim(req.body)
	 	console.log(req.body)

	 	validator.validateData('changePassword', req);

	 	var errors = req.validationErrors()
	 	if(errors) {

	 		res.status(400).json( common.formatResponse({
	 			type: 'validationError',
	 			code: 'BAD_PARAMETERS',
	 			data: errors
	 		}))
	 		return
	 	}

		/**
		 * @database
		 * @desc Check if user exist 
		 * @collection users
		 *
		 */
		 users.find( {email: decoded.email} ).toArray(function (err, result) {

		 	if(err) 
		 		res.status(500).json( common.formatResponse({
		 			type: 'dbError',
		 			code: 'DB_ERROR',
		 			data: err
		 		}))

		 	if(result.length == 0) {
		 		res.status(200).json( common.formatResponse({
		 			type: 'error',
		 			code: 'INVALID_USER',
		 			data: 'User does not exist'
		 		}))
		 		return
		 	} else {

		 		 if(req.body.password != req.body.confirmPassword) {

		 		 	res.status(400).json( common.formatResponse({
		 		 		type: 'error',
		 		 		code: 'PASSWORD_MISMATCH',
		 		 		data: 'Password and confirm password does not match'
		 		 	}))
		 		 } else {

		 		 	var otp = common.generateOTP()

		 		 	users.update({email: decoded.email}, 
		 		 		{$set: {
		 		 			password: common.hashString(req.body.password),
		 		 			otp: otp
		 		 		}}, function(err, count, updateResult) {

		 				/**
		 				* @email
		 				* @desc Send password change notification email
		 				*
		 				*/
		 				common.sendEmail({
		 					from: config.get('email.from'),
		 					to: decoded.email,
		 					subject: 'Memmbles - Password Changed',
		 					template: 'password_changed.html',
		 					data: {
		 						name: result[0].firstName
		 					}
		 				})

		 				res.status(200).json( common.formatResponse({
		 					type: 'success',
		 					code: 'PASSWORD_CHANGED',
		 					data: {
		 						message: 'Password has been successfully changed', 
		 						data: ''
		 					}
		 				}))

		 			})
		 		 }

		 		}

		 	})

		} catch(err) {
			console.log("errrrrrrrrrrrrrrrrrrrrrrrr",err)
			res.status(401).json( common.formatResponse({
				type: 'authorizationError',
				code: 'INVALID_TOKEN',
				data: 'User authentication failed'
			}))
			return
		}

	})

module.exports = router
