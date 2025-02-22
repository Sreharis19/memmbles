var express  = require('express')
var router   = express.Router()
var db       = require('./database/mongodb.js')
var jwt      = require('jsonwebtoken')
var mongodb  = require('mongodb')
var cron     = require('node-cron')
var CronJob  = require('cron').CronJob
var moment   = require('moment');
const config = require('config')
var io       = require('socket.io-client')
const schedule = require('node-schedule')
var firebase = require('./functions/pushFirebase.js')

function GetAllbirthdays() {};

GetAllbirthdays.prototype.startProcess = function() {
  schedule.scheduleJob("0 30 0 * * *", function() {
  db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {
    if(err) {
  		console.log('Error establishing database connection')
  		console.log(err)
  		process.exit(1)
  	}else{
    	console.log('connection established in admBirthwish')
    	var users = db.get().collection('users')
    	users.aggregate([
        {
          "$project" : {
            "_id"            : 1,
            "name"           : 1,
            "birthday"       : 1,
            "gender"         : 1,
            "todayDayOfYear" : {
              "$dayOfMonth" : new Date()
            },
            "birthDayOfYear" : {
              "$dayOfMonth" : "$birthday"              
            },
            "currentmonthOfYear" : {
              "$month" : new Date()
            },
            "birthmonthOfYear" : {
              "$month" : "$birthday"              
            }
          }
        },
        {
          "$project" : {
            "_id"        : 1,
            "name"       : 1,
            "birthday"   : 1,
            "gender"     : 1,
            "isBirthDay" : {
              "$eq" : [
              "$todayDayOfYear",
              "$birthDayOfYear"
              ]
            },
            "isBirthMonth" : {
              "$eq" : [
              "$currentmonthOfYear",
              "$birthmonthOfYear"
              ]
            }
          }
        },
        {
          "$match" : {
                  "isBirthDay"  : true,
                  "isBirthMonth": true   
          }
        }
      ]).toArray(function(err, result){
  			if(err){
  				console.log(err)      
  				throw err
  			}
        if(result.length > 0){
    			result.forEach(function(user) {
    				if(user._id){
              firebase.firebaseNotification({
                     type: 'adminwishes',
                     user_id: user._id
                  })
  						pushNotification({
  							type    : 'adminwishes',
  							user_id : user._id,
                gender  : user.gender,
                name    : user.name
  						})
    				}
    			})
        }
  		})
  	}

  	function  pushNotification(input) {

  		var notificationObject = {   
  			notification_id   : new mongodb.ObjectId(),
  			notification_type : input.type,
  			is_new            : true,
  			date_created      : new Date(),
        user_name         : input.name,
        user_id           : input.user_id
  		}

      var adminads = db.get().collection('admin_ads')

      adminads.find({"status":'active',"ad_type":'birthday',"gender":input.gender}).toArray(function(errIN, resultIN){
        if(errIN)
          throw errIN
        if(resultIN.length > 0){
          notificationObject.image = resultIN[0]['350x250']
          notificationObject.adID  = resultIN[0]._id
          notificationObject.url   = resultIN[0].link

          users.update(
            {"_id"  : input.user_id},
            {
              $push : { 
                "notifications" :  notificationObject
              },
              $inc  : {
                 "meta_count.notifications" : 1 
              }
            },
            function(err, result) {
              if(err) {
                console.log(err)
              } 
              else {
                 // send web socket push   
                 var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
                 socket.emit('push_notification', { 
                    topic : input.user_id,
                  data    : {
                      notification: notificationObject
                  } 
                 })
              }
            }
          )
        }
        else{
          adminads.find({"status":'active',"ad_type":'birthday',"gender":'both'}).toArray(function(errINew, resultINew){
            if(errINew)
              throw errINew
            if(resultINew.length > 0){
              notificationObject.image = resultINew[0]['350x250']
              notificationObject.adID  = resultINew[0]._id
              notificationObject.url   = resultINew[0].link
                    
              users.update(
                {"_id" : input.user_id},
                {
                  $push : { 
                    "notifications" :  notificationObject
                  },
                  $inc  : {
                     "meta_count.notifications" : 1 
                  }
                },
                function(err, result) {
                  if(err) {
                    console.log(err)
                  } 
                  else{
                    // send web socket push   
                    var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
                    socket.emit('push_notification', { 
                      topic : input.user_id,
                      data  : {
                          notification: notificationObject
                      } 
                    })
                  }
                }
              )
            }
          })
        }
      })
    }
  })
})
}

module.exports = new GetAllbirthdays()
GetAllbirthdays.prototype.startProcess()