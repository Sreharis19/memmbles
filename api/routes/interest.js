/*
 * @file
 * @desc Get Interests
 * @author Deepak
 * @date 11 Oct 2017
 *
 */
 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var mongodb = require('mongodb')
 var formidable = require('formidable')

/**
 * @method
 * @return {json} error message
 * @desc Fetch all Ads
 *
 */
 router.get('/', function(req, res) {

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	try{
 		var decoded = jwt.verify(token, common.getSecret())

 		getAllInterests(function(result){ 
 			sendSuccessResponse(result, res)
 		})

 	}catch(err){
 		sendAuthError(res)
 	}
 })

 
/**
 * @method
 * @param {object} res - Response object
 * @return {json} error message
 * @desc Send Authentication Error
 *
 */
 function sendAuthError(res) {
 	res.status(401).json( common.formatResponse({
 		type: 'authorizationError',
 		code: 'INVALID_TOKEN',
 		data: 'User authentication failed'
 	}))
 	return
 }


/**
 * @method
 * @param {function} callback
 * @return {json} data
 * @desc Get All Interests
 * @collection - interests
 *
 */
 function getAllInterests(callback) {

 	db.get().collection('interests').find({})
 	.sort({"interest" : 1})
 	.toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}

 		let data = result
 		callback(data)
 	})
 }


/**
 * @method
 * @param {object} res - Response object
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponse(result, res) {

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: 'INTEREST_DETAILS_SUCCESS',
 		data: {
 			message:'Interest details fetched successfully', 
 			data: result
 		}
 	}))
 }

 module.exports = router