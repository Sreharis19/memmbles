/**
* @file 
* @desc GET Advertisements for a User
* @author Deepak
* @date 10 Aug 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')

/**
 * @method
 * @return {json} Success or error message
 * @desc Get Advertisements for a User
 *
 */
 router.get('/', function(req, res){
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		console.log(decoded)

 		var userId = new mongodb.ObjectId(decoded.userId)

 		getUserDetails(userId, function(data){ 
 			console.log(data)
 			var tags = []
 			if(data.hasOwnProperty("tags")) {
 				tags = data.tags
 			}

 			var age = 0
 			if(data.hasOwnProperty("birthday")) {
 				age =  getAge(data.birthday)
 			}

 			var gender = ""
 			if(data.hasOwnProperty("gender")) {
 				gender = data.gender
 			}

 			var location = ""
 			if(data.hasOwnProperty("location")) {
 				location = data.location
 			}

 			getAds(tags, age, gender, location, function(output){

 				shuffle(output)

 				var adsList = {}
 				var i = 0
 				var totalProcessed = 0
 				for (ads of output) {
 					totalProcessed++

 					if (!adsList.hasOwnProperty('size_'+ads.image_width+'x'+ads.image_height) ) {
 						adsList['size_'+ads.image_width+'x'+ads.image_height] = []
 					}

 					adsList['size_'+ads.image_width+'x'+ads.image_height].push(ads) 
 					i++
 					if(totalProcessed == output.length) {
 						//console.log(output)
 						var ads = {
 							sizes: adsList
 						}
 						//console.log(ads)
 						sendSuccessResponse(ads, res)
 					}
 				}

 			})
 			
 		})

 	})

 })



 function getAge(dateString) {

 	var today = new Date();
 	var birthDate = new Date(dateString);
 	var age = today.getFullYear() - birthDate.getFullYear();
 	var m = today.getMonth() - birthDate.getMonth();
 	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
 		age--;
 	}
 	return age;
 }

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
 		sendAuthError(res)
 	}
 }

/**
 * @method
 * @param {Array} tags
 * @param {function} callback
 * @return {json} 
 * @desc Get all Advertisements having the input tags
 * @collection - advertisements
 *
 */
 function getAds(tags, age, gender, location, callback){

 	console.log('inside getAds')

 	/* parameters
 	gender - (m)
 	age_min - (m)
 	age_max - (m)
 	tags - (o)
 	location - (m)
 	*/

 	var findParams = {
 		"status" : "active",
 		"age_min": { $lte: age },
 		"age_max": { $gte: age },
 		"gender":  { $in : ["both", gender] }
 	}


 	if(location != "") {
 		var userCity = location.city.short
 		var userState =	location.state.short
 		var userCountry = location.country.short
 	}


 	if (tags.length == 0 && location != "") {

 		console.log('tag length =0, location not null')

 		console.log('tags zero')
 		db.get().collection('advertisements')
 		.find(findParams)
 		.toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}

 			var data = result
 			var totalAds = data.length
 			var filteredData = []

 			var totalCounter = totalAds
 			var processedCounter = 0

 			data.forEach(function(item, index) {

 				processedCounter++
 				var totalLocCount = item.locations.country.length + item.locations.state.length + item.locations.city.length
 				totalCounter += totalLocCount
 				if(totalLocCount != 0) {
 					// has country
 					if(item.locations.country.length != 0) {
 						item.locations.country.forEach(function(cItem, cIndex) {
 							processedCounter++
 							if(userCountry == cItem.country.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}


 					// has state
 					if(item.locations.state.length != 0) {
 						item.locations.state.forEach(function(sItem, sIndex) {
 							processedCounter++
 							if(userCountry == sItem.country.short && userState == sItem.state.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}


 					// has city
 					if(item.locations.city.length != 0) {
 						item.locations.city.forEach(function(ciItem, ciIndex) {
 							processedCounter++
 							if(userCountry == ciItem.country.short && userState == ciItem.state.short && userCity == ciItem.city.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}


 				}

 			})


 			// See if all data has been processed
 			var pTimer = setInterval(function() {

 				if(totalCounter == processedCounter) {
 				    // all data processed
 				    clearInterval(pTimer)

 			       // If no result
 			       if(totalAds == 0){
 			       	db.get().collection('advertisements').find({
 			       		"status" : "active"
 			       	}).toArray(function(err, result){
 			       		if(err){
 			       			console.log(err)      
 			       			throw err
 			       		}
 			       		let data = result
 			       		callback(data)
 			       	})
 			       } else {

 			       	if(filteredData.length == 0) {
 			       		// send all

 			       		db.get().collection('advertisements').find({
 			       			"status" : "active"
 			       		}).toArray(function(err, result){
 			       			if(err){
 			       				console.log(err)      
 			       				throw err
 			       			}
 			       			let data = result
 			       			callback(data)
 			       		})

 			       	} else {
 			       		callback(filteredData)
 			       	}


 			       } // End if no result

 			   }

 			},100)



 		})

 	} else {

 			console.log('tag not 0')


 		if(location == "") {
 			//without loc

 			console.log('location null')

 			db.get().collection('advertisements')
 			.find({
 				"status" : "active",
 				"tags" : { $in : tags }
 			}).toArray(function(err, result){
 				if(err){
 					console.log(err)      
 					throw err
 				}
 				var data = result

 				if(result.length == 0){

 					db.get().collection('advertisements').find({
 						"status" : "active"
 					}).toArray(function(err, result){
 						if(err){
 							console.log(err)      
 							throw err
 						}
 						let data = result
 						callback(data)
 					})

 				} else {
 					callback(data)
 				}

 			})



 		} else {
 			// with loc

 			console.log('with loc and tag')

 			findParams.tags =  { $in : tags }

 			db.get().collection('advertisements')
 			.find(findParams)
 			.toArray(function(err, result){
 				if(err){
 					console.log(err)      
 					throw err
 				}

 				var data = result
 				var totalAds = data.length
 				var filteredData = []

 				var totalCounter = totalAds
 				var processedCounter = 0

 				console.log(data)

 				data.forEach(function(item, index) {

 					console.log('inside each')

 					processedCounter++
 					var totalLocCount = item.locations.country.length + item.locations.state.length + item.locations.city.length
 					totalCounter += totalLocCount
 					if(totalLocCount != 0) {
 					// has country
 					if(item.locations.country.length != 0) {
 						item.locations.country.forEach(function(cItem, cIndex) {
 							processedCounter++
 							if(userCountry == cItem.country.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}

 					// has state
 					if(item.locations.state.length != 0) {
 						item.locations.state.forEach(function(sItem, sIndex) {
 							processedCounter++
 							if(userCountry == sItem.country.short && userState == sItem.state.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}

 					// has city
 					if(item.locations.city.length != 0) {
 						console.log('city length not 0')
 						item.locations.city.forEach(function(ciItem, ciIndex) {
 							console.log('isnide item.locations.city each')
 							processedCounter++
 							console.log(userCountry +'=='+ ciItem.country.short +'&&'+ userState +'=='+ ciItem.state.short +'&&'+ userCity +'=='+ ciItem.city.short)
  							if(userCountry == ciItem.country.short && userState == ciItem.state.short && userCity == ciItem.city.short) {
 								// Include this ads
 								filteredData.push(item)
 							}
 						})
 					}


 				}

 			})

 			// See if all data has been processed
 			var pTimer = setInterval(function() {

 				console.log('inside timer')
 				console.log(totalCounter +'=='+ processedCounter)

 				if(totalCounter == processedCounter) {
 				    // all data processed
 				    clearInterval(pTimer)

 				    console.log('totalAds: '+totalAds)

 			       // If no result
 			       if(totalAds == 0){
 			       	db.get().collection('advertisements').find({
 			       		"status" : "active"
 			       	}).toArray(function(err, result){
 			       		if(err){
 			       			console.log(err)      
 			       			throw err
 			       		}
 			       		let data = result
 			       		callback(data)
 			       	})
 			       } else {
 			       	console.log('else--')
 			       	console.log(filteredData)

 			       	if(filteredData.length == 0) {
 			       		// send all

 			       		db.get().collection('advertisements').find({
 			       			"status" : "active"
 			       		}).toArray(function(err, result){
 			       			if(err){
 			       				console.log(err)      
 			       				throw err
 			       			}
 			       			let data = result
 			       			callback(data)
 			       		})

 			       	} else {
 			       		callback(filteredData)
 			       	}
 			       	
 			       } // End if no result

 			   }

 			},100)

 		})


 			/*db.get().collection('advertisements')
 			.find(findParams)
 			.toArray(function(err, result){
 				if(err){
 					console.log(err)      
 					throw err
 				}

 				var data = result

 			// Apply here
 			if(result.length == 0){


 				db.get().collection('advertisements').find({
 					"status" : "active"
 				}).toArray(function(err, result){
 					if(err){
 						console.log(err)      
 						throw err
 					}

 					let data = result
 					callback(data)
 				})


 			} else {
 				callback(data)
 			}
 			
 		}) */








 		} // end with loc


 	}

 }


/**
 * @method
 * @param {ObjectId} userId
 * @param {function} callback
 * @return {json} data
 * @desc Get tags interest of a User
 * @collection - users
 *
 */
 function getUserDetails(userId, callback){

 	db.get().collection('users').find(
 	{
 		"_id" : userId
 	}
 	// ,{
 	// 	"tags" : 1
 	// }
 	).toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}

 		let data = result[0]
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
 function sendSuccessResponse(data, res){

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: 'ADS_DETAILS_SUCCESS',
 		data: {
 			message:'Advertisements fetched successfully', 
 			data: { 
 				details : data
 			} 
 		}
 	}))
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


 /**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
 function shuffle(a) {
 	var j, x, i;
 	for (i = a.length; i; i--) {
 		j = Math.floor(Math.random() * i);
 		x = a[i - 1];
 		a[i - 1] = a[j];
 		a[j] = x;
 	}
 }


 module.exports = router



 // db.get().collection('advertisements').aggregate([
 // { 
 // 	$match: { 
 // 		status: "active" 
 // 	} 
 // },
 // {
 // 	$group: {
 // 		_id: { height: "$image_height", width: "$image_width"},
 // 		count: { $sum: 1 }
 // 	}
 // },
 // {
 // 	$sample: { 
 // 		size: 2 
 // 	} 
 // }
 // ]).toArray(function (err,result) {
 // 	if(err){
 // 		console.log(err)      
 // 		throw err
 // 	}

 // 	console.log(result)

 // 	let data = result
 // 	callback(data)
 // })