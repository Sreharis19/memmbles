/**
* @file 
* @desc Tag CRON
* @author Deepak
* @date 11 Aug 2017
*
*/

var express = require('express')
var common = require('./functions/common.js')
var db = require('./database/mongodb.js')
var mongodb = require('mongodb')
var PythonShell = require('python-shell')
var fs = require('fs')
var app = express()

var AWS = require('aws-sdk')

const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
})

var processedCount = 0
var totalCount = 0
/**
 * @database
 * @desc Connect to mongodb server
 *
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
      console.log("config_data",result[0].delay)
      console.log("retry",parseInt(result[0].retry))

      var temp_queue = db.get().collection('temp_queue')
      var d=new Date()
      d.setMinutes(d.getMinutes() - parseInt(result[0].retry));
      console.log("date@@@@@@@@@@",d)
      temp_queue.update({
        "date":{$lte: d},
        "is_processed": true
      },{
        $set: {
          "is_processed": false
        }
      },{
        multi: true
      }, function(err, result) {
        if (err)
          console.log(err)
        console.log("result******",result)
        deleteTempQueue()
      })

    })
  }




})

 function deleteTempQueue(){
   var config_data = db.get().collection('config_data')
   config_data.find().toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    console.log("config_data",result)
    console.log("parseInt(result[0].reCount)",parseInt(result[0].reCount))
    var temp_queue = db.get().collection('temp_queue')
    temp_queue.remove({
     "re_try":{ $gte: parseInt(result[0].reCount) }
   }, function(err, result) {
    if (err)
      console.log(err)
    console.log("temp QUEUE data deleted successfully")
    process.exit(1)
  })
  })
 } 
