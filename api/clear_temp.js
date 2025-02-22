/**
* @file 
* @desc Tag CRON
* @author Jins
* @date 11 june 2018
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

    var temp = db.get().collection('temp')
    var d=new Date()
    d.setHours(d.getHours() -24);
    console.log("date@@@@@@@@@@",d)
    temp.remove({
      "dateCreated":{$lte: d}
      

    }, function(err, result) {
      if (err)
        console.log(err)
      console.log("result******",result)
      process.exit(1)

    })
  }




})

