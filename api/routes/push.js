/*
 * @file
 * @desc Push notification 
 * @author jins
 * @date 07 june 2018
 *
 */

 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var jwt = require('jsonwebtoken')
 var db = require('../database/mongodb.js')
 var mongodb = require('mongodb')
 var io = require('socket.io-client')
 const config = require('config')

 router.post('/', function(req, res){
   console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
   console.log("inside push post")
   var token = ''
   if(req.headers.authorization) {
      var token = req.headers.authorization.split(" ")[1]
   }

   verifyToken(token, res, function(decoded){
      var userId = new mongodb.ObjectId(decoded.userId) 

      var notificationObject = {   
         notification_id: new mongodb.ObjectId(),
         notification_type: "pushNotification",
         user_id: userId,
         is_new: true,
         date_created: new Date()
      }

      console.log('updated')
      console.log(notificationObject)

      console.log("socket emited @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")

            // send web socket push   
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', { 
              topic: notificationObject.user_id,
              data: {
               notification: notificationObject
            } 
         })
            //res.status(200).end()

            res.status(200).json( common.formatResponse({
               type: 'success',
               code: 'PUSH_NOTIFICATION_SUCCESS',
               data: {
                  message: 'push notification success', 
                  data: {}
               }
            }))


         })
})


 function verifyToken(token, res, callback){
   try{
      var decoded = jwt.verify(token, common.getSecret())
      callback(decoded)
   }catch(err){
      sendAuthError(res)
   }
}


function sendAuthError(res){
   res.status(401).json( common.formatResponse({
      type: 'authorizationError',
      code: 'INVALID_TOKEN',
      data: 'User authentication failed'
   }))
   return
}

module.exports = router