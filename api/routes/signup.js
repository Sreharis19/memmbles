/**
* @file 
* @desc Signup module
* @author Deepak
* @date 09 Feb 2017
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
* @param {string} firstName
* @param {string} lastName
* @param {string} email
* @param {string} password
* @param {ISODate} birthday
* @return {json} success or error message
*
*/
router.post('/', function(req, res) {
	if(JSON.stringify(req.body.location) === '{}'){
	 		console.log("location is empty")
	 	}

	validator.validateData('signup', req);


	var errors = req.validationErrors()
	console.log("bdayyyyyyyyyy",req.body.birthday)
	var today = new Date()
	var bday=new Date(req.body.birthday)
	if(bday>today){
		//console.log("please enter a valid birthday")
		if(typeof errors === "boolean"){
			errors=[]
		}
		errors.push({ param: 'birthday',
		msg: 'Please enter a valid Birthday',
		value: '' })	
	}


	console.log("###################################     signup  errors          ##########################################")
	console.log(errors)
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
	 * @desc Check if the user email already exist 
	 * @collection users
	 *
	 */
	 users.find( {email: req.body.email} ).toArray(function (err, result) {

	 	if(err)
	 		res.status(500).json( common.formatResponse({
	 			type: 'dbError',
	 			code: 'DB_ERROR',
	 			data: err
	 		}))
	 	if(result.length > 0) {
	 		res.status(200).json( common.formatResponse({
	 			type: 'error',
	 			code: 'USER_EMAIL_EXIST',
	 			data: 'Email already exist'
	 		}))
	 		return
	 	}else{

	 		var phone = req.body.phone.trim()
	 		if(phone.length != 0) {
	 			
	 			phoneAlreadyExist(phone, function(data) {
	 				if(!data) {
	 					registerNewUser()
	 				} else {
	 					res.status(200).json( common.formatResponse({
	 						type: 'error',
	 						code: 'USER_PHONE_EXIST',
	 						data: 'Phone number already exist'
	 					}))
	 					return
	 				}
	 			})

	 		} else {
	 			registerNewUser()
	 		}
	 	}

	 })



	 function phoneAlreadyExist(phone, callback) {

	 	db.get().collection('users').find({
	 		"phone" : phone
	 	}).toArray(function(err, result){
	 		if(err)
	 			throw err
	 		if(result.length == 0) {
	 			callback(false)
	 		} else {
	 			callback(true)
	 		}

	 	})

	 }
	 console.log("req.body.usertype")
	 console.log(req.body.userType)

	 function registerNewUser() {


	 		/**
	 		* @database
	 		* @desc Insert new user 
	 		* @collection users
	 		*
	 		*/
	 		var otp = common.generateOTP()

	 		var profileImage = req.body.profileImage
	 		var profileImageArray = [
	 		config.get('s3.bucketUrl')+'default/default_one.jpg',
	 		config.get('s3.bucketUrl')+'default/default_two.jpg',
	 		config.get('s3.bucketUrl')+'default/default_three.jpg',
	 		config.get('s3.bucketUrl')+'default/default_four.jpg',
	 		config.get('s3.bucketUrl')+'default/default_five.jpg',
	 		config.get('s3.bucketUrl')+'default/default_six.jpg',
	 		config.get('s3.bucketUrl')+'default/default_seven.jpg',
	 		config.get('s3.bucketUrl')+'default/default_eight.jpg'
	 		]

	 		if (profileImage.trim() == "") {
	 			let max = 7
	 			let min = 0
	 			let randomNumber = Math.floor(Math.random() * (max - min + 1)) + min
	 			profileImage = profileImageArray[randomNumber]
	 		}

	 		var language = "en"
	 		
	 		// switch (req.body.location.country.short.toUpperCase()) {
	 		// 	case "PH":
	 		// 	language = "fi"
	 		// 	break
	 		// 	case "VN" :
	 		// 	language = "vi"
	 		// 	break
	 		// 	default:
	 		// 	language = "en"
	 		// 	break
	 		// }

	 		var payload = {
	 			name: {
	 				first: req.body.firstName.trim(),
	 				last: req.body.lastName.trim()
	 			},
	 			email: req.body.email.trim().toLowerCase(),
	 			birthday: new Date(req.body.birthday),
	 			gender: req.body.gender.trim(),
	 			phone: req.body.phone.trim(),
	 			user_type: req.body.userType,
	 			location: req.body.location,
	 			language: language,
	 			password: common.hashString(req.body.password),
	 			profile_image: {
	 				thumbnail: {
	 					small: profileImage
	 				},
	 				quality: {
	 					high_resolution: profileImage
	 				}
	 			},
	 			profile_cover_image: {
	 				thumbnail: {
	 					small: config.get('s3.bucketUrl')+'default/default_cover_small.jpg',
	 					big: config.get('s3.bucketUrl')+'default/default_cover_big.jpg'
	 				},
	 				quality: {
	 					high_resolution: config.get('s3.bucketUrl')+'default/default_cover'
	 				}
	 			},
	 			date_created: new Date(),
	 			account_status: 'inactive',
	 			followers: [],
	 			following: [],
	 			notifications: [],
	 			subscriptions: {
	 				type: 'free'
	 			},
	 			meta_count : {
	 				memmbles : 0,
	 				followers : 0,
	 				following : 0,
	 				notifications : 0
	 			},
	 			show_walk_through: true,
	 			otp: otp,
	 			bio : "",
	 			ads_balance: 0
	 		}
	 		console.log("payload")
	 		console.log(payload)
	 		users.insert( payload, function(err, result) {
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
 					template: 'signup_otp.html',
 					data: {
 						name: req.body.firstName,
 						otpCode: otp
 					}
 				})

 				/**
 				* @jwt
 				* @desc Generate JWT and send response
 				*
 				*/
 				var jwt = require('jsonwebtoken')
 				var payload = { 
 					userId: result.insertedIds[0], 
 					email: req.body.email.toLowerCase() 
 				}
 				var token = jwt.sign(payload, common.getSecret())

 				res.status(200).json( common.formatResponse({
 					type: 'success',
 					code: 'USER_INSERTED',
 					data: {
 						message:'Signup was successful', 
 						data: { 
 							token: token
 						} 
 					}
 				}))

 			})
	 	}



	 })

module.exports = router
