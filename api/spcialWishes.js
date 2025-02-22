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

function GetTodaysWish() {};

GetTodaysWish.prototype.startProcess = function() {
  schedule.scheduleJob("0 45 0 * * *", function() {        
  db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {
    if(err) {
    	console.log('Error establishing database connection')
    	console.log(err)
    	process.exit(1)
    }
    else{
    	console.log('connection established')
      var d         = new Date()
      var n         = d.toLocaleDateString()
      var day       = n.split("-")[2]
      var month     = n.split("-")[1]
    	var adminAds  = db.get().collection('admin_ads')
      adminAds.find({
        "post_month" : month,
        "post_day"   : day,
        "status"     : 'active',
        "post_date_specified" :true,
        "ad_type"    : 'All celebration',
        "gender"     :'male'
      }).toArray(function(err, result){
  			if(err){
  				console.log(err)      
  				throw err
  			}
        if(result.length > 0){
      		result.forEach(function(ads) {
      			if(ads._id){
   						pushNotificationMale({
   							type  : 'specialwishes',
   							ad_id : ads._id,
                image : ads['350x250'],
                link  : ads.link
   						})
      			}
      		})
        }
        else{
          adminAds.find({
            "post_month" : month,
            "post_day"   : day,
            "status"     : 'active',
            "post_date_specified" :true,
            "ad_type"    : 'All celebration',
            "gender"     : 'both'
          }).toArray(function(err, result){
            if(err){
              console.log(err)      
              throw err
            }
            if(result.length > 0){
              result.forEach(function(ads) {
                if(ads._id){
                  pushNotificationMale({
                    type  : 'specialwishes',
                    ad_id : ads._id,
                    image : ads['350x250'],
                    link  : ads.link
                  })
                }
              })
            }
          })
        }
    	})
      // for female
      adminAds.find({
        "post_month" : month,
        "post_day"   : day,
        "status"     : 'active',
        "post_date_specified" :true,
        "ad_type"    : 'All celebration',
        "gender"     : 'female'
      }).toArray(function(err, result){
        if(err){
          console.log(err)      
          throw err
        }
        if(result.length > 0){
          result.forEach(function(ads) {
            if(ads._id){
              pushNotificationfeMale({
                type  : 'specialwishes',
                ad_id : ads._id,
                image : ads['350x250'],
                link  : ads.link
              })
            }
          })
        }
        else{
          adminAds.find({
            "post_month" : month,
            "post_day"   : day,
            "status"     : 'active',
            "post_date_specified" :true,
            "ad_type"    : 'All celebration',
            "gender"     : 'both'
          }).toArray(function(err, result){
            if(err){
              console.log(err)      
              throw err
            }
            if(result.length > 0){
              result.forEach(function(ads) {
                if(ads._id){
                  pushNotificationfeMale({
                    type  : 'specialwishes',
                    ad_id : ads._id,
                    image : ads['350x250'],
                    link  : ads.link
                  })
                }
              })
            }
          })
        }
      })
    }

    function  pushNotificationMale(input){

    	var notificationObject = {   
    		notification_id   : new mongodb.ObjectId(),
    		notification_type : input.type,
    		is_new            : true,
    		date_created      : new Date(),
        adID              : input.ad_id,
        image             : input.image,
        link              : input.link
    	}

      var users = db.get().collection('users')
      users.find().toArray(function(err,result){
        if(err){
          console.log(err)      
          throw err
        }
        result.forEach(function(theuser) {
          if(theuser._id){
            notificationObject.user_name = theuser.name
            notificationObject.user_id = theuser._id
            users.update(
              {
                "_id"    : theuser._id,
                "gender" : 'male'
              },
              {
                $push : { 
                  "notifications" :  notificationObject
                },
                $inc  : {
                  "meta_count.notifications" : 1 
                }
              },function(err, result) {
                if(err) {
                  console.log(err)
                } 
                else { 
                  var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
                  socket.emit('push_notification', { 
                    topic : theuser._id,
                    data  : {
                      notification : notificationObject
                    } 
                  })
                }
              }
            )
          }
        })
      })
    }  

    function  pushNotificationfeMale(input){

      var notificationObject = {   
        notification_id   : new mongodb.ObjectId(),
        notification_type : input.type,
        is_new            : true,
        date_created      : new Date(),
        adID              : input.ad_id,
        image             : input.image,
        link              : input.link
      }

      var users = db.get().collection('users')
      users.find().toArray(function(err,result){
        if(err){
          console.log(err)      
          throw err
        }
        result.forEach(function(theuser) {
          if(theuser._id){
            notificationObject.user_name = theuser.name
            notificationObject.user_id   = theuser._id
            users.update(
              {
                "_id"    : theuser._id,
                "gender" : 'female'
              },
              {
                $push : { 
                  "notifications" :  notificationObject
                },
                $inc  : {
                  "meta_count.notifications" : 1 
                }
              },function(err, result) {
                if(err) {
                  console.log(err)
                } 
                else { 
                  var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
                  socket.emit('push_notification', { 
                    topic : theuser._id,
                    data  : {
                      notification : notificationObject
                    } 
                  })
                }
              }
            )
          }
        })
      })
    }
  })
  })
}
module.exports = new GetTodaysWish()
GetTodaysWish.prototype.startProcess()