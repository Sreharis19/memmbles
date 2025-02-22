/**
* @file 
* @desc GET crontime dynamically
* @author Jins
* @date 14 June 2018
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var cron = require('node-cron')
var CronJob = require('cron').CronJob
var moment = require('moment');

var face = require('../face.js')


/**
 * @method
 * @return {json}
 * @desc Get Cron
 */
 db.connect('mongodb://52.42.239.43:27017/memmbles', function (err) {

 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
 		console.log('connection established')

 		var config_data = db.get().collection('config_data')
 		config_data.find().toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}
 			console.log("config_data",result)
 			
 			//console.log("current_time",current_time)
 			var end =new moment()
 			console.log("end",end)
 			var start = result[0].last_executed
 			console.log("start",start)
 			var duration = moment.duration(end.diff(start));
 			var diff_hours = duration.get('hours');
 			var diff_minutes = duration.get('minutes');
 			for(i=1;i<=24;i++){
 				if(i==diff_hours){
 					diff_minutes=i*60+diff_minutes
 				}
 				else{
 					diff_minutes= diff_minutes
 				}

 			}
 			console.log("diff_hours",diff_hours)
 			console.log("diff_minutes",diff_minutes)
 			if(diff_minutes >= result[0].delay ){
 				console.log("inside if")
 				face.faceCollection(result[0].batch)
 				
 				var ldate =new Date()
 				config_data.update({"_id":result[0]._id},{
 					$set: {
 						"last_executed": ldate
 					}},function(err, result) {
 						if (err)
 							console.log(err)
 						console.log('EXIT--')
 						process.exit(1)
 					})

 			} else {
 				console.log('EXIT--')
 				process.exit(1)
 			}


 		})

 	}

 })


 