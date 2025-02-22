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

 var readXlsxFile =  require('read-excel-file/node')

/**
 * @method
 * @return {json}
 * @desc Get birthday notification
 */
 function GetBdayList() {};

 GetBdayList.prototype.startProcess = function() {
 db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/jins', function (err) {
 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
 		console.log('connection established')

        readXlsxFile("english.xlsx").then((rows) => {

          var jsonObj = {}
          for (i = 1; i <= rows.length - 1; i++) {
            let item = rows[i]
            if (item[0] == null) {
              jsonObj[item[1]] = item[2]
            } else {
              let innerObj = {}
              if (!jsonObj.hasOwnProperty(item[0])) {
                jsonObj[item[0]] = {}
              }
              jsonObj[item[0]][item[1]] = item[2]
            }
          }
          const content = JSON.stringify(jsonObj);

          if(rows.length == 0) {
console.log("bad params")
            return
          } else {
 
console.log(content)
db.get().collection('csvtojson').insertMany( content, function(err, result) {
            
               
               })

           }



         })


 	}



})
}
module.exports = new GetBdayList()
GetBdayList.prototype.startProcess()