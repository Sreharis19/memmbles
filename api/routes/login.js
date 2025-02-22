/**
* @file 
* @desc Login module
* @author Ajith
* @date 14 Feb 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')

/**
* @callback
* @param {string} email
* @param {string} password
* @return {json} success or error message
*
*/

router.post('/', function(req, res) {

	var request = common.trim(req.body)

	validator.validateData('login', req);

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
	 * @desc Check if the user email exists and if password matches
	 * @collection users
	 *
	 */
	 var users = db.get().collection('users')

	 users.find( {email: request.email.toLowerCase()} ).toArray(function (err, result) {

	 	if(err){
	 		res.status(500).json( common.formatResponse({
	 			type: 'dbError',
	 			code: 'DB_ERROR',
	 			data: err
	 		}))
	 		return
	 	}

	 	if(result.length == 0) {

	 		res.status(200).json( common.formatResponse({
	 			type: 'error',
	 			code: 'INVALID_USER',
	 			data: 'User does not exist'
	 		}))
	 		return
	 	} else{
	 		
	 		if(result[0].password == common.hashString(request.password) ) {
	 		   /**
	 			* @jwt
	 			* @desc Generate JWT and send success response
	 			*
	 			*/
	 			var jwt = require('jsonwebtoken')
	 			var payload = { 
	 				userId: result[0]._id, 
	 				email: result[0].email 
	 			}
	 			var token = jwt.sign(payload, common.getSecret())


	 			switch(result[0].account_status) {

	 				case "active":
	 				res.status(200).json( common.formatResponse({
	 					type: 'success',
	 					code: 'LOGIN_SUCCESS',
	 					data: {
	 						message:'Login was successful', 
	 						data: { 
	 							token: token,
	 							showWalkthrough: result[0].show_walk_through
	 						} 
	 					} 
	 				}))
	 				break

	 				case "inactive":
	 				res.status(200).json( common.formatResponse({
	 					type: 'error',
	 					code: 'INACTIVE_USER',
	 					data: {
	 						message:'Your account is not active',
	 						token: token, 
	 						data: { 
	 							token: token
	 						} 
	 					} 
	 				}))
	 				break

	 				case "suspend":
	 				res.status(200).json( common.formatResponse({
	 					type: 'error',
	 					code: 'SUSPENDED_USER',
	 					data: 'Your account has been suspended'
	 				}))
	 				break
	 			}

	 		} else {

	 			res.status(200).json( common.formatResponse({
	 				type: 'error',
	 				code: 'INCORRECT_PASSWORD',
	 				data: 'You have entered a wrong password. Please try again!'
	 			}))
	 			return
	 		}

	 	}

	 })

	})

module.exports = router