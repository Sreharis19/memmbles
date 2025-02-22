/**
* @file 
* @desc GET birthday notification dynamically
* @author Jins
* @date 12 december 2018
*
*/

var express = require('express')
var router = express.Router()
// var common = require('../functions/common.js')
// var validator = require('../functions/validator.js')
var db = require('./database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var cron = require('node-cron')
var CronJob = require('cron').CronJob
var moment = require('moment');
const config = require('config')
var io = require('socket.io-client')
var firebase = require('./functions/pushFirebase.js')
const schedule = require('node-schedule')

/**
 * @method
 * @return {json}
 * @desc Get birthday notification
 */
 function GetBdayList() {};

 GetBdayList.prototype.startProcess = function() {
 schedule.scheduleJob("0 15 0 * * *", function() {
 db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {
 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
 		console.log('connection established')
 		var users = db.get().collection('users')
 		var userArray =[]
 		users.aggregate([
 		{
 			"$project" : {
 				"_id" : 1,
 				"name" : 1,
 				"birthday" : 1,
 				"followers" : 1,
 				"todayDayOfYear" : {
 					"$dayOfYear" : new Date()
 				},
 				"birthDayOfYear" : {
 					"$dayOfYear" : "$birthday"
 				}
 			}
 		},
 		{
 			"$project" : {
 				"_id" : 1,
 				"name" : 1,
 				"birthday" : 1,
 				"followers" : 1,
            "todayDayOfYear" : 1,
            "birthDayOfYear" : 1,
 				"isBirthDay" : {
 					"$eq" : [
 					"$todayDayOfYear",
 					"$birthDayOfYear"
 					]
 				}
 			}
 		},
 		{
 			"$match" : {
 				"isBirthDay" : true
 			}
 		}
 		]).toArray(function(err, result){
    // var today = new Date()
    // var a1 = {$addFields:{
    // today:{$dateFromParts:{year:{$year:today},month:{$month:today},day:{$dayOfMonth:today}}},
    // birthdayThisYear:{$dateFromParts:{year:{$year:today}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}, 
    // birthdayNextYear:{$dateFromParts:{year:{$add:[1,{$year:today}]}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}
    // }};
    // var a2 = {$addFields:{
    //     nextBirthday:{$cond:[ {$gte:[ "$birthdayThisYear", "$today"]}, "$birthdayThisYear", "$birthdayNextYear"]}
    // }};
    // var p1 = {$project:{
    //     name:1, 
    //     birthday:1,
    //     followers:1, 
    //     nextBirthday:1,
    //     daysTillNextBirthday:{$divide:[ 
    //         {$subtract:["$nextBirthday", "$today"]}, 
    //         24*60*60*1000  /* milliseconds in a day */
    //      ]}, 
    //     _id:1,
    //     profile_image:1
    // }};
    // var m1 = { $match : {  daysTillNextBirthday : { $lt : 1 } } }
    //      users.aggregate([a1,a2,p1,m1]).toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}
 			console.log("users",result)
 			result.forEach(function(user) {
 				// console.log(user);
 				if(user.followers){
 					user.followers.forEach(function(frnd) {
 						console.log("frndddddddddddddd",frnd)
                  firebase.firebaseNotification({
                     type: 'birthday',
                     user_id: frnd,
                     birthday_user_id: user._id

                  })
 						pushNotification({
 							type: 'birthday',
 							user_id: user._id,
 							frnd_user_id: frnd
 						})
 					})

 				}
 			})






 		})

 	}


 	function  pushNotification(input) {
 		console.log("helllllllllllllllllloooooo")

 		var notificationObject = {   
 			notification_id: new mongodb.ObjectId(),
 			notification_type: input.type,
 			user_id: input.frnd_user_id ,
 			birthday_user_id: input.user_id,
 			is_new: true,
 			date_created: new Date()
 		}

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.birthday_user_id }, {"password" : 0}).toArray(function(err, result){
   	if(err)
   		throw err
   	notificationObject.image = result[0].profile_image.thumbnail.small
   	notificationObject.follower_user_name = result[0].name

      // Add new notification
      users.update(
      	{"_id" : notificationObject.user_id
      },{
      	$push : { 
      		"notifications" :  notificationObject
      	},
      	$inc : {
      		"meta_count.notifications" : 1 
      	}
      }, function(err, result) {
      	if(err) {
      		console.log(err)
      	} else {
      		console.log('updated')
      		console.log(notificationObject)

            // send web socket push   
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', { 
            	topic: notificationObject.user_id,
            	data: {
            		notification: notificationObject
            	} 
            })
            

        }
    })
  })
}
})
})
}
module.exports = new GetBdayList()
GetBdayList.prototype.startProcess()