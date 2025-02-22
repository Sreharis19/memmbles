/**
* @file 
* @desc OTP Verify module
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
var request = require('request')
const config = require('config')

/**
* @callback
* @param {string} token
* @return {json} success or error message
*
*/
router.post('/', function(req, res) {

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

		/**
		 * @database
		 * @desc Get OTP of user 
		 * @collection users
		 *
		 */
		 users.find({
		 	email: decoded.email, 
		 	otp: parseInt(req.body.otp)
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
		 			code: 'INVALID_OTP',
		 			data: 'Wrong OTP code'
		 		}))
		 		return
		 	}else{

		 		var otp = result[0].otp

		 		/**
	 			 * @response
	 			 * @desc OTP verification successful & Generate OTP verification token
	 			 *
	 			 */
	 			 var payload = { 
	 			 	userId: result[0]._id, 
	 			 	email: decoded.email,
	 			 	otp: result[0].otp
	 			 }
	 			 var token = jwt.sign(payload, common.getSecret())

	 			 switch(req.body.type) {
	 			 	case 'signup':
	 			 	/**
	 			 	 * @database
	 			 	 * @desc Update status of the user to active 
	 			 	 * @collection users
	 			 	 *
	 			 	 */
	 			 	 users.update({email: decoded.email}, 
	 			 	 	{$set: {
	 			 	 		account_status: 'active'
	 			 	 	}}, function(err, count, updateResult) { 

	 			 	 	})

	 			 	 users.find({
	 			 	 	email: decoded.email
	 			 	 }).toArray(function (err, result) {
	 			 	 	if (result.length > 0) {
	 			 	 		addToElasticSearch( result[0] )
	 			 	 	}
	 			 	 })	

	 			 	 break
	 			 	}

	 			 	res.status(200).json( common.formatResponse({
	 			 		type: 'success',
	 			 		code: 'OTP_VERIFIED',
	 			 		data: {
	 			 			message: 'OTP has been verified successfully', 
	 			 			data: {
	 			 				otpToken: token
	 			 			}
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


function addToElasticSearch(userData){

	var data = {
		first_name : userData.name.first,
		last_name : userData.name.last,
		email : userData.email,
		image : userData.profile_image.thumbnail.small 
	}

	request.put(config.get('updateProfileImageElasticSearchUrl')+userData._id+'/_create',
		{ json :  data }, function(err, response){
			if(err){
				console.log("err")
				console.log(err)
			}

			if(response){
				console.log("response")
				console.log(response.body)
			}	
		})
}

module.exports = router