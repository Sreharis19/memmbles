/**
* @file 
* @desc Notify Call module
* @author Jins
* @date 18 Aug 2020
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
const mongodb = require('mongodb')
const config = require('config')
var firebase = require('../functions/pushFirebase.js')
var pushVoip = require('../functions/applePush.js')
// var pushVoip = require('../functions/amazonSns.js')
// var pinpoint = require('../functions/amazonPinpointPushNotification.js')

/**
* @callback
* @param {string} token
* @return {json} success or error message
*
*/

router.post('/', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  var to = new mongodb.ObjectId(req.body.to) 
  console.log(to)

  firebase.firebaseNotification({
                     type: 'notifyCall',
                     user_id: to,
                     from_id: req.body.from,
                     chat_type: req.body.chat_type,
                     call_from: req.body.first_name
                  })
  sendSuccessResponse(res)

 })
})

router.post('/voip', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  var to = new mongodb.ObjectId(req.body.to) 
  console.log(to)
  pushVoip.voipNotification({
                     type: 'notifyCall',
                     user_id: to,
                     from_id: req.body.from,
                     chat_type: req.body.chat_type,
                     call_from: req.body.first_name
                  })
  sendSuccessResponse(res)

 })
})

router.post('/answer', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  firebase.firebaseNotification({
                     type: 'answerCall',
                     user_id: userId,
                     chat_type: req.body.chat_type
                  })
  sendSuccessResponse(res)
 })
})
router.post('/reject', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)

  firebase.firebaseNotification({
                     type: 'rejectCall',
                     user_id: userId,
                     chat_type: req.body.chat_type,
                     call_from: req.body.first_name
                  })
  sendSuccessResponse(res)

 })
})

router.post('/autoend', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  var to = new mongodb.ObjectId(req.body.to) 

  firebase.firebaseNotification({
                     type: 'autoendCall',
                     user_id: to,
                     chat_type: req.body.chat_type,
                     call_from: req.body.first_name
                  })
  sendSuccessResponse(res)
 })
})

router.post('/endcall', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
  var userId = new mongodb.ObjectId(decoded.userId)
  firebase.firebaseNotification({
                     type: 'endCall',
                     user_id: userId,
                     chat_type: req.body.chat_type,
                     call_from: req.body.first_name
                  })
  sendSuccessResponse(res)
 })
})


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
    console.log(err)
    sendAuthError(res)
  }
 }


/**
 * @method
 * @param {object} res - Response object
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponse(res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'NOTIFY_SUCCESS',
    data: {
      message:'Notify successfully', 
      data: ""
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


module.exports = router