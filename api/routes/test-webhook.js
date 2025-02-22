/**
* @file 
* @desc  Payment Gateway 
* @author Jins
* @date 2 May 2018
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
const crypto = require('crypto')
var mongodb = require('mongodb')
var fs = require('fs');
const util = require('util');
const config = require('config')


var stripe = require('stripe')('sk_test_SUYTYnLJ8K2kQuqcooypuN77')

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var constants = require('../constants.js');

router.post('/', function(req, res) {
 	/*var request = util.inspect(req); 
 	console.log(request)
 	console.log("$$$$$$$$$$$$$$$$$$$$$",req.body)
 	fs.writeFile('request.txt',JSON.stringify(req.body), (err) => {  
 		if (err) throw err;

 		console.log('data saved!')
 		res.status(200).send('done!')
 	});*/
 	
 /*	var payload={

 		"notificationId": "35e4c150-1d64-40b3-ba52-9356ebecd3c7",
 		"eventType": "net.authorize.customer.subscription.suspended",
 		"eventDate": "2016-03-08T08:18:27.434Z",
 		"webhookId": "873B7193-31FF-4881-9593-FA6578D52510",
 		"payload": {
 			"entityName": "subscription",
 			"id": "5155278",
 			"name": "testSubscription",
 			"amount": 23,
 			"status": "active",
 			"profile": {
 				"customerProfileId": 348,
 				"customerPaymentProfileId": 644,
 				"customerShippingAddressId": 675
 			}
 		}

 	}*/

 	if(req.body.eventType=="net.authorize.customer.subscription.suspended"|| req.body.eventType=="net.authorize.customer.subscription.terminated"){
 		console.log("inside if")
 		getUserDetails(req.body.payload.id,function(data){
 			console.log("@@@@@@@@@@@@@ userid @@@@@@@@@@@")
 			console.log(data.user_id)
 			updateUserDetails(data.user_id,req)

 		})
 	}
 })

function getUserDetails(subId,callback){
	db.get().collection('payments').find({
		"payment_details.subscriptionId" : subId
	}).toArray(function(err, result){
		if(err){
			console.log(err)      
			throw err
		}

		let data = result[0]
		callback(data)
	})


}


function updateUserDetails(userId,req){
	console.log("++++++++++++ inside updateUserDetails ++++++++++++++")
	db.get().collection('users').update({
		"_id" : userId
	},{
		$set : {
			"account_status" : "suspend"
		}
	}, function(err, result){
		if(err)
			console.log(err)
		db.get().collection('users').find({
			"_id" : userId },{"email" : true
		}).toArray(function(err, result){
			if(err){
				console.log(err)      
				throw err
			}

			let data = result[0]
			sendMail(data)
		})
	

	})


}

function sendMail(data){
	console.log("++++++++++++ inside sendMail ++++++++++++++")

	common.sendEmail({
		from: config.get('email.from'),
		to: data.email,
		subject: 'Memmbles - Account Suspended',
		template: 'account_suspend.html',
		data: {  
		}
	})
}


module.exports = router

