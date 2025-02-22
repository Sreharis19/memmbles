/**
* @file 
* @desc User profile
* @author Ajith
* @date 28 Mar 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var request = require('request')
const config = require('config')

/**
* @callback
* @param {string} token
* @return {json} success or error message
* @desc Get user profile details (Details of Logged In User)
*
*/
router.get('/', function(req, res){

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
	 	getUserDetails(decoded.userId, (result)=>{
		res.status(200).json( common.formatResponse({
   			type: 'success',
   			code: 'USER_DETAILS_SUCCESS',
   			data: {
   				message: 'User details fetched successfully', 
   				data: result
   			}
   		}))

	 	})
	 } catch(err) {
	 	console.log(err)
	 	sendAuthError(res)
	 }

	})





router.post('/familyShareId', function(req, res){

	var token = ''
	if(req.headers.authorization) {
		var token = req.headers.authorization.split(" ")[1]
	}

	try{
		var decoded = jwt.verify(token, common.getSecret())
		console.log("heloooo verification done",req.body.familyShareId)
	 	// var users = db.get().collection('users')

		 // Add new notification
      db.get().collection('users').update(
         {"_id" : new mongodb.ObjectId(decoded.userId)
      },{
         $set : { 
            "familyShareId" :  req.body.familyShareId
         }
      }, function(err, result) {
         if(err) {
            console.log(err)
         } else {
            console.log('updated')
            

         }
      })
	} catch(err) {
		console.log(err)
		sendAuthError(res)
	}
})

/**
* @callback
* @param {string} userId
* @return {json} success or error message
* @desc Get details of a user by his id (Any User)
*
*/
router.get('/:userId', function(req, res){
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

	 	var userId = req.params.userId.trim()
	 	if (userId) {
	 		getUserDetails(userId, (result)=>{
			var decodedId = new mongodb.ObjectID(decoded.userId)  	
		 	var userId1 = new mongodb.ObjectID(userId)
	        getBlockUsers(decodedId, function(blist){
	        var blockList = blist.notInarray
	        var newData = []
	        if(blockList){
	          blockList.forEach((item)=>  newData.push(item.toString()))
	        }
	        console.log("newData@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",newData)
		 	// var newData = ['5b8a6059984cde4b0b8fe036']
		 	if(result.length > 0){
		        if(result[0].following.length){
		          result[0].following.forEach((pep,index)=>{
		            var isBlocked=newData.indexOf(pep.toString())
		            if(isBlocked != -1){
		              result[0].meta_count.following--
		            }
		          })
		        }
		        if(result[0].followers.length){
		          result[0].followers.forEach((pep,index)=>{
		            var isBlocked=newData.indexOf(pep.toString())
		            if(isBlocked != -1){
		              result[0].meta_count.followers--
		            }
		          })
		        }
	    	}	
			userIds = []
			userIds.push(userId1)	
			var users = db.get().collection('users')
			users.find({"_id" : decodedId, "following" : { $in : userIds }}).toArray(function(err, result1){
			console.log(err)
			if(result1.length){
			result[0].isfollowing = true
			}else{
			result[0].isfollowing = false
			}
			users.find({"_id" : decodedId, "blocked_users" : { $in : userIds }}).toArray(function(err, result2){
			console.log(err)
			if(result2.length){
			result[0].isblocked = true
			}else{
			result[0].isblocked = false
			}
			sendUserDetails(result,res)

			})
			
			})

	 		})

	    	})
	 	}else{
	 		sendAuthError(res)
	 	}

	 } catch(err) {
	 	console.log(err)
	 	sendAuthError(res)
	 }

	})



/**
 * @callback
 * @param {string} token
 * @return {json} success or error message
 * @desc Edit user profile
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
	 	var userId = new mongodb.ObjectID(decoded.userId)
	 	console.log("userId===========",userId)
	 	//req.body = common.trim(req.body)
	 	req.body.firstName = req.body.firstName.trim()
	 	req.body.lastName = req.body.lastName.trim()
	 	req.body.bio = req.body.bio.trim()

	 	validator.validateData('editProfile', req)

	 	var errors = req.validationErrors()
	 	console.log(errors)

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
		console.log(errors)

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
		 users.find( { "_id": userId} ).toArray(function (err, result) {

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

		 		console.log("inside else")
		 		updateUserCollection()		
		 		updateElasticSearch()
		 	}

		 })

		} catch(err) {
			console.log('errorrrrr')
			console.log(err)
			sendAuthError(res)
		}

		/**
		 * @module
		 * @desc Update Collection with new profile details
		 * @collection users
		 *
		 */
		 function updateUserCollection(){

		 	var interests = req.body.interests
		 	var userInterests = []




		 	for(interest of interests) {
		 		if(interest.hasSelected) {
		 			userInterests.push(new mongodb.ObjectID(interest._id))
		 		}
		 	}

		 	console.log('--------userInterests------')
		 	console.log(userInterests)
		 	var updateParams = {
		 		"name.first": req.body.firstName.trim(),
		 		"name.last": req.body.lastName.trim(),
		 		"phone":req.body.phone,
		 			//"birthday": new Date(req.body.birthday),
		 			"birthday": new Date(req.body.birthday),
		 			"bio": req.body.bio.trim(),
		 			"interests": userInterests
		 		}
		 		if(req.body.location) {
		 			updateParams.location = req.body.location
		 		}
		 		users.update({"_id": userId}, 
		 			{$set: updateParams}, function(err, count, updateResult) {		 			

		 				res.status(200).json( common.formatResponse({
		 					type: 'success',
		 					code: 'PROFILE_EDIT_SUCCESS',
		 					data: {
		 						message: 'User profile edited successfully', 
		 						data: ''
		 					}
		 				}))

		 			})
		 	}

		 /**
		 * @module
		 * @desc Update Elastic search server with new profile details (first name and last name)
		 * @type users
		 *
		 */
		 function updateElasticSearch(){
		 	request.post(config.get('updateProfileImageElasticSearchUrl')+userId+'/_update', { 
		 		json : {
		 			doc : {
		 				first_name : req.body.firstName,
		 				last_name : req.body.lastName
		 			}
		 		} 
		 	}, function(err, response){
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

		})

  /**
   * @method
   * @param {string} userId
   * @param {onject} res - response object
   * @return {json} success or error message
   * @desc Get user profile details
   *
   */
   function getUserDetails(userId, callback){  
   console.log("userId",userId)	

   	var userId = new mongodb.ObjectID(userId)  	
   	var users = db.get().collection('users')

   	users.find({ "_id" : userId }, {"password" : 0, "chat_history_data" : 0,}).toArray(function(err, result){
   		if(err)
   			throw err
   		console.log("result[0]",result)
   		if(result.length){
   		if(result[0].hasOwnProperty("birthday")){


   			console.log("birthday-----------------",result[0].birthday)
   			var date= new Date(result[0].birthday)

   			year = date.getFullYear();
   			month = date.getMonth()+1;
   			dt = date.getDate();

   			if (dt < 10) {
   				dt = '0' + dt;
   			}
   			if (month < 10) {
   				month = '0' + month;
   			}

   			console.log("full date.....................",dt+'/' + month + '/'+year);	
   			result[0].birthday = year+'-' + month + '-'+dt
   			console.log(result[0].birthday)

   		}
   	}
   	callback(result)
   		

   	})
   }

/**
* @method
* @param {string} json
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
/**
* @method
* @param {string} json
* @return {json} success message
* @desc Send UserDetails Success
*
*/
function sendUserDetails(result,res){
	res.status(200).json( common.formatResponse({
   			type: 'success',
   			code: 'USER_DETAILS_SUCCESS',
   			data: {
   				message: 'User details fetched successfully', 
   				data: result
   			}
   			}))		
}




function getBlockUsers(userId, callback){
  db.get().collection('users').aggregate(
   [
        { $match: { "_id" : userId } },
        { $project : {
            "blocked_users": { $ifNull: [ "$blocked_users", [] ] },
            "blocked_by": { $ifNull: [ "$blocked_by", [] ] }



          }
        },
        {
           $project: {
             "notInarray": {
                 $reduce: {
                    input: [ "$blocked_by" ],
                    initialValue: "$blocked_users",
                    in: { $concatArrays : ["$$value", "$$this"] }
                 }
              }
            }
          }
  ]).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    console.log(result)
    let data = result[0]
    console.log("users not in array11111111111111111111111111111111",data)
    callback(data)
  })
}

module.exports = router