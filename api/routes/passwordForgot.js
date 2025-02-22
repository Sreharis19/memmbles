/**
* @file 
* @desc Forgot password module
* @author Deepak
* @date 14 Feb 2017
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
router.post('/', function(req, res) {

	var request = common.trim(req.body)

	validator.validateData('forgotPassword', req);

	var errors = req.validationErrors()
	if(errors) {

		res.status(400).json( common.formatResponse({
			type: 'validationError',
			code: 'BAD_PARAMETERS',
			data: errors
		}))
		return
	}

	var users = db.get().collection('users')

	/**
	 * @database
	 * @desc Check if user exist 
	 * @collection users
	 *
	 */
	 users.find({email: req.body.email}).toArray(function (err, result) {

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
	 	}else{

	 	/**
	 	 * @database
	     * @desc Regenerate OTP and update in db 
	     * @collection users
	     *
	     */
	     var otp = common.generateOTP()

	     users.update( {email: req.body.email}, {$set: {otp: otp}}, function(err, count, updateResult) {

	     	if(err)
	     		res.status(500).json( common.formatResponse({
	     			type: 'dbError',
	     			code: 'DB_ERROR',
	     			data: err
	     		}))

	     		/**
	 			 * @email
	 			 * @desc Send OTP verification email
	 			 *
	 			 */
	 			 common.sendEmail({
	 			 	from: config.get('email.from'),
	 			 	to: req.body.email,
	 			 	subject: 'Memmbles - OTP Verification Code',
	 			 	template: 'forgot_password_otp.html',
	 			 	data: {
	 			 		name: result[0].firstName,
	 			 		otpCode: otp
	 			 	}
	 			 })

	 			 /**
	 			  * @response
	 			  * @desc OTP has been sent to email
	 			  *
	 			  */
	 			  var payload = { 
	 			  	userId: result[0]._id, 
	 			  	email: req.body.email,
	 			  	otp: otp 
	 			  }
	 			  var token = jwt.sign(payload, common.getSecret())

	 			  res.status(200).json( common.formatResponse({
	 			  	type: 'success',
	 			  	code: 'OTP_SENT',
	 			  	data: {
	 			  		message: 'OTP has been sent to your email', 
	 			  		data: {
	 			  			otpToken: token
	 			  		}
	 			  	}
	 			  }))

	 			})
	 }
	})
	})

module.exports = router
