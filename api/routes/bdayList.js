/**
 * @file
 * @desc events
 * @author jins
 * @date 13 Dec 2018
 *
 */

 var express = require('express')
 var router = express.Router()
 var PythonShell = require('python-shell')
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var formidable = require('formidable')
 var fs = require('fs')
 const config = require('config')
 var io = require('socket.io-client')

 var mongodb = require('mongodb')
 var request = require('request')
 const crypto = require('crypto')

 var AWS = require('aws-sdk')
 AWS.config.update({
 	accessKeyId: config.get('s3.access_key'),
 	secretAccessKey: config.get('s3.secret_key'),
 	region: config.get('s3.region')
 })
 const s3 = new AWS.S3({
 	apiVersion: config.get('s3.api_version')
 })
 const sns = new AWS.SNS({
 	apiVersion: config.get('sns.api_version')
 })


 router.get('/', function(req, res){
  console.log("kkkkkkkkkkk")
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}
 	verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    getUserDetails(function(data){
      console.log("data",data)
         res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'FRIENDS_GET_SUCCESS',
          data: {
           message: 'Friends list get successfully',
           data: data                    
         }
       }))
   
  })
  })
 })

  function getUserDetails(callback){
  var today=new Date();
  db.get().collection('users').aggregate([
    { "$project" : {
            _id : 1,
            "name" : 1,
            "birthday" : 1,
            "followers" : 1,
            "profile_image": 1,
            "todayDayOfYear" : { "$dayOfYear" : today }, 
            "dayOfYear" : { "$dayOfYear" : "$birthday"}
}},
    { "$project" : {
        _id: 1,
        "name" : 1,
        "birthday" : 1,
        "followers" : 1,
         "profile_image": 1,
        "daysTillBirthday" : { "$subtract" : [
             { "$add" : [ 
                     "$dayOfYear",
             { "$cond" : [{"$lt":["$dayOfYear","$todayDayOfYear"]},365,0 ] }
             ] },
             "$todayDayOfYear"
        ] }
} },
    { "$match" : { "daysTillBirthday" : { "$lt" : 31 } } }
    ]).toArray(function(err, result){
      if(err){
        console.log(err)      
        throw err
      }
      callback(result)
  })
 }



  router.post('/', function(req, res){



  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    var bdayUserId = new mongodb.ObjectId(req.body.bdayUserId)
 getUserDetails1(userId, function(data){
  console.log("heeeeeeee",req.body)
  if(data.ads_balance >= req.body.total){
    console.log("hloooo",data.ads_balance)
    getUserDetails1(bdayUserId, function(user){
        if(user.followers){
          user.followers.forEach(function(frnd) {
            console.log("frndddddddddddddd",frnd)
            pushNotification({
              type: 'birthdayADS',
              user_id: userId,
              frnd_user_id: frnd,
              link: req.body.link,
              business_name: data.name,
              business_image: data.profile_image.thumbnail.small,
              bdayuserId: bdayUserId,
              birthday: req.body.birthDay
            })
          })

        }
          })
         db.get().collection('users').update(
      { "_id": userId }, 
      { $inc: { ads_balance: req.body.total*-1 } }, function(err, count, updateResult) {  

       res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'ADS_POST_SUCCESS',
  data: {
    message: "Your Advertisement has been sent"
  }
}))        
      })


  }else{
    console.log("hololololo")
sendError(res)
  }
 })
   
  

  })
})
 function getUserDetails1(userId, callback){

  db.get().collection('users').find({
    "_id" : userId
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result[0]
    callback(data)
  })
 }

    function  pushNotification(input) {
    console.log("helllllllllllllllllloooooo")

    var notificationObject = {   
      notification_id: new mongodb.ObjectId(),
      notification_type: input.type,
      user_id: input.frnd_user_id ,
      birthday_user_id: input.bdayuserId,
      business_user_id: input.user_id,
      business_user_name: input.business_name,
      business_image: input.business_image,
      adsLink: input.link,
      birthday: input.birthday,
      is_new: true,
      date_created: new Date()
    }

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.birthday_user_id }, {"password" : 0}).toArray(function(err, result){
    if(err)
      throw err
    console.log("result[0]",result[0])
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
 * @method
 * @param {json} result
 * @param {json} res - Response object
 * @desc Send success response
 *
 */
 function sendSuccessResponse(result, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: result.code,
    data: {
      message: result.message, 
      data: {} 
    }
  }))
 }

 function sendError(res) {

 res.status(200).json( common.formatResponse({
  type: 'error',
  code: 'PLEASE_RECHARGE_ERROR',
  data: {
    message: "You don't have enough balance. please recharge first"
  }
}))
}
 module.exports = router