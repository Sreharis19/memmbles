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

 				console.log("output",output)
 				console.log("output.length",output.length)



 				console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%      GETADS OUTPUT                  &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&")
 				console.log(output)
 				console.log("===============================================================================================================")
 				shuffle(output)

 				var adsList = {}
 				var i = 0
 				var totalProcessed = 0

 				adsList['size_350x250'] = []
 				adsList['size_350x350'] = []
 				adsList['size_450x450'] = []
 				adsList['size_600x450'] = []
 				if(output.length > 0){


 					for (ads of output) {

 					// if (!adsList.hasOwnProperty('size_'+ads.image_width+'x'+ads.image_height) ) {
 					// 	adsList['size_'+ads.image_width+'x'+ads.image_height] = []
 					// }

 					// Add only if budget permits
 					/* check with user balance 
 					   check with max budget for this ad - calculate total consumption
 					   */
 					   console.log('=====ads.budget==== '+ads.budget)

 					   var adsBudget = ads.budget
 					   var userId = new mongodb.ObjectId(ads.user_id) 
 					   var adsId = new mongodb.ObjectId(ads._id)
 					   var adsData = ads

 					   getUserDetails(userId, function(userData) {
 					   	getTotalViews(adsId, function(viewsCount) {
 					   		getTotalClicks(adsId, function(clicksCount) {
 					   			getTotalPrice(adsId, function(totalPrice) {

 					   				totalProcessed++

 					   				var minBalanceRequired = 0.50
 					   				var totalConsumed = totalPrice//(viewsCount * 0.01) + (clicksCount * 0.10)

 					   				console.log(userData.ads_balance+' >= '+minBalanceRequired+' && '+totalConsumed+' <= '+adsBudget)

 					   				if(userData.ads_balance >= minBalanceRequired && totalConsumed <= adsBudget) {

 					   					adsList['size_350x250'].push(adsData) 
 					   					adsList['size_350x350'].push(adsData) 
 					   					adsList['size_450x450'].push(adsData) 
 					   					adsList['size_600x450'].push(adsData) 
 					   				}

 					   				if(totalProcessed == output.length) {
 					   					var ads = {
 					   						sizes: adsList
 					   					}
 					   					sendSuccessResponse(ads, res)
 					   				}

 					   			})
 					   		})
 					   	})

 					   })



 					//adsList['size_'+ads.image_width+'x'+ads.image_height].push(ads) 

 					i++

 				}
 			}

 			else{
 				var ads = {
 					sizes: adsList
 				}
 				sendSuccessResponse(ads, res)

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
 	console.log("((((((((((((((((((((((((((((((((((((((((   GET ADS       ))))))))))))))))))))))))))))))))))))))))")
 	console.log(tags)
 	console.log(age)
 	console.log(gender)
 	console.log(location)
 	console.log("(((((((((((((((((((((((((((((((((((((((())))))))))))))))))))))))))))))))))))))))")

 	/* parameters
 	gender - (m)
 	age_min - (m)
 	age_max - (m)
 	tags - (o)
 	location - (m)	
     25       28        30      28  
 	start <= today and end >= today
 	*/

 	var today = new Date()

 	var findParams = {
 		"status" : "active",
 		"age_min": { $lte: age },
 		"age_max": { $gte: age },
 		"gender":  { $in : ["both", gender] },
 		"start": { $lte: today },
 		"end": { $gte: today }
 	}

 	var findParamsAll = {
 		"status" : "active",
 		"age_min": { $lte: age },
 		"age_max": { $gte: age },
 		"gender":  { $in : ["both", gender] },
 		"start": { $lte: today },
 		"end": { $gte: today },
 		$and: [
 		{ "locations.country.0":{$exists: false} },
 		{ "locations.state.0":{$exists: false} },
 		{ "locations.city.0":{$exists: false} }
 		]
 	}

 	var findParamsAllLoc = {
 		"status" : "active",
 		"age_min": { $lte: age },
 		"age_max": { $gte: age },
 		"gender":  { $in : ["both", gender] },
 		"start": { $lte: today },
 		"end": { $gte: today },
 		"all_location": true
 	}


 	if(location != "" || JSON.stringify(location) !== '{}') {
 		var userCity = location.city.short
 		var userState =	location.state.short
 		var userCountry = location.country.short
 	}


 	if (tags.length == 0 && (location != "" || JSON.stringify(location) !== '{}')) {

 		console.log('tag length =0, location not null')
 		console.log('tags zero')

 		console.log(findParams)

 		db.get().collection('ad_detail')
 		.find(findParams)
 		.toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}

 			var data = result
 			console.log("findParams data@@@@@@@@@@@@@@@",data)

 			var totalAds = data.length
 			console.log("totalAds@@@@@@@@@@@@@@@",totalAds)
 			var filteredData = []

 			var totalCounter = totalAds
 			var processedCounter = 0

 			console.log(data)

 			data.forEach(function(item, index) {

 				processedCounter++

 				// Push all location
 				if(item.all_location) {
 					filteredData.push(item)
 				}

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
 				console.log("totalCounter =="+totalCounter+"&& processedCounter"+processedCounter)

 				if(totalCounter == processedCounter) {
 				    // all data processed
 				    clearInterval(pTimer)

 			       // If no result
 			       if(totalAds == 0){
 			       	db.get().collection('ad_detail')
 			       	.find(findParamsAll)
 			       	.toArray(function(err, result){
 			       		if(err){
 			       			console.log(err)      
 			       			throw err
 			       		}
 			       		let data = result
 			       		console.log('callback 1')
 			       		callback(data)
 			       	})
 			       } else {

 			       	if(filteredData.length == 0) {
 			       		// send all

 			       		db.get().collection('ad_detail')
 			       		.find(findParamsAll)
 			       		.toArray(function(err, result){
 			       			if(err){
 			       				console.log(err)      
 			       				throw err
 			       			}
 			       			console.log('callback 2',findParamsAll)

 			       			let data = result
 			       			callback(data)
 			       		})

 			       	} else {
 			       		console.log('callback 3')
 			       		callback(filteredData)
 			       	}


 			       } // End if no result

 			   }

 			},100)



 		})

 	} else {

 		console.log('tag not 0')


 		if(location == "" || JSON.stringify(location) === '{}') {
 			//without loc

 			console.log('location null')

 			db.get().collection('ad_detail')
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

 					db.get().collection('ad_detail')
 					.find(findParamsAll)
 					.toArray(function(err, result){
 						if(err){
 							console.log(err)      
 							throw err
 						}
 						let data = result
 						console.log('callback 4')
 						callback(data)
 					})

 				} else {
 					console.log('callback 5')
 					callback(data)
 				}

 			})



 		} else {
 			// with loc

 			console.log('with loc and tag')

 			findParams.tags =  { $in : tags }

 			db.get().collection('ad_detail')
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
 			       	console.log(findParamsAll)
 			       	db.get().collection('ad_detail')
 			       	.find(findParamsAll)
 			       	.toArray(function(err, result){
 			       		if(err){
 			       			console.log(err)      
 			       			throw err
 			       		}
 			       		let data = result
 			       		console.log("dataaaa",data)
 			       		console.log('callback 6')
 			       		callback(data)
 			       	})
 			       } else {
 			       	console.log('else--')
 			       	console.log(filteredData)

 			       	if(filteredData.length == 0) {
 			       		// send all

 			       		db.get().collection('ad_detail')
 			       		.find(findParamsAll)
 			       		.toArray(function(err, result){
 			       			if(err){
 			       				console.log(err)      
 			       				throw err
 			       			}
 			       			let data = result
 			       			console.log('callback 7')
 			       			callback(data)
 			       		})

 			       	} else {
 			       		console.log('callback 8')
 			       		callback(filteredData)
 			       	}
 			       	
 			       } // End if no result

 			   }

 			},100)

 		})


 			/*db.get().collection('ad_detail')
 			.find(findParams)
 			.toArray(function(err, result){
 				if(err){
 					console.log(err)      
 					throw err
 				}

 				var data = result

 			// Apply here
 			if(result.length == 0){


 				db.get().collection('ad_detail').find({
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


 function getTotalViews(adsId, callback) {
console.log("inside get total views")
 	db.get().collection('ads_performance').aggregate([
 	{ 
 		$match: {
 			ads_id: adsId,
 			action: 'view'
 		}
 	},
 	{ 
 		$group: {
 			_id: '',
 			count: { $sum: 1 }
 		}
	 }
	//   function(err, result){

	]).toArray(function(err, result){
		 let count = 0
 		if(result.length > 0) {
 			count = result[0].count
 		}
 		callback(count)
 	})
 }


 function getTotalClicks(adsId, callback) {

 	db.get().collection('ads_performance').aggregate( [
 	{ 
 		$match: {
 			ads_id: adsId,
 			action: 'click'
 		}
 	},
 	{ 
 		$group: {
 			_id: '',
 			count: { $sum: 1 }
 		}
	 }
	//  , function(err, result){
	]).toArray(function(err, result){


 		let count = 0
 		if(result.length > 0) {
 			count = result[0].count
 		}
 		callback(count)
 	})
 }

 function getTotalPrice(adsId, callback) {

 	db.get().collection('ads_performance').aggregate( [
 	{ 
 		$match: {
 			ads_id: adsId
 		}
 	},
 	{ 
 		$group: {
 			_id: '',
 			totalPrice: { $sum: "$price" }
 		}
	}
	]).toArray(function(err, result){

 		
 		console.log("result#####",result,err)

 		if(result.length > 0) {
 			var totalPrice = result[0].totalPrice


 		} else {
 			var totalPrice = 0
 		}
 		console.log("totalPriceeeeeeeeeeeeeeeeeeeee",totalPrice)
 		console.log("adsIdeeeeeeeeeeeeeeeeeee",adsId)

 		callback(totalPrice)
 		
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
	 console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",data)

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



 // db.get().collection('ad_detail').aggregate([
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