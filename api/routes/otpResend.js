/**
* @file 
* @desc OTP Resend module
* @author Deepak
* @date 13 Feb 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
const config = require('config')


/**
* @callback
* @param {string} token
* @return {json} success or error message
*
*/
router.post('/', function(req, res) {
	console.log("otpresend")
	console.log("req.headers.authorization",req.headers.authorization)

	var jwt = require('jsonwebtoken')
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
	 	console.log("decoded email",decoded.email)

		/**
		 * @database
		 * @desc Get OTP of user 
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
		 	}else{
		 		console.log("result[0].otp",result[0].otp)

		 		var otp = result[0].otp
		 		var status =req.body.type

		 		/**
	 			 * @email
	 			 * @desc Send OTP verification email
	 			 *
	 			 */
	 			 if(status=="signup"){

	 			 	common.sendEmail({
	 			 	from: config.get('email.from'),
	 			 	to: decoded.email,
	 			 	subject: 'Memmbles - OTP Verification Code',
	 			 	template: 'signup_otp.html',
	 			 	data: {
	 			 		name: result[0].firstName,
	 			 		otpCode: otp
	 			 	}
	 			 })


	 			 }
	 			 else if(status=="forgot"){
	 			 common.sendEmail({
	 			 	from: config.get('email.from'),
	 			 	to: decoded.email,
	 			 	subject: 'Memmbles - OTP Verification Code',
	 			 	template: 'forgot_password_otp.html',
	 			 	data: {
	 			 		name: result[0].firstName,
	 			 		otpCode: otp
	 			 	}
	 			 })
	 			}
	 			 res.status(200).json( common.formatResponse({
	 			 	type: 'success',
	 			 	code: 'OTP_SENT',
	 			 	data: {
	 			 		message: 'OTP has been sent to your email', 
	 			 		data: ''
	 			 	}
	 			 }))

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




module.exports = router
