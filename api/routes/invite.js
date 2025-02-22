/**
* @file 
* @desc Send invitation
* @author Deepak
* @date 29 Jul 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
const config = require('config')

 /**
 * @method
 * @return {json} Success or error message
 * @desc POST  - Clear notification details of a user
 *
 */
 router.post('/', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(req.body.userId)

    if(req.body.hasOwnProperty("email")) {
      var email = req.body.email.toLowerCase()
    } else {
      var email = ""
    }

    console.log(email)
    console.log(req.body)

    if(validateEmail(email)) {

      if(req.body.userEmail.toLowerCase() == email) {

        res.status(200).json( common.formatResponse({
          type: 'error',
          code: 'INVITE_SELF_INVITE',
          data: {
            message: "Enter your friend's email, not yours"
          }
        }))

      }else{

        userAlreadyExist(email, function(data) {
         if(!data) {
          inviteFriend(userId, req.body.userName, email, res)
        } else {
          res.status(200).json( common.formatResponse({
            type: 'error',
            code: 'INVITE_INVALID_EMAIL',
            data: {
              message: "Your friend is already on memmbles. Please use the search option."
            }
          }))
        }
      })
        
      }
    } else {

      res.status(200).json( common.formatResponse({
        type: 'error',
        code: 'INVITE_INVALID_EMAIL',
        data: {
          message: 'Enter a valid email to invite'
        }
      }))
    }

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
    sendAuthError(res)
  }
}

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email)
}


function userAlreadyExist(email, callback) {

  db.get().collection('users').find({
    "email" : email
  }).toArray(function(err, result){
    if(err)
      throw err
    if(result.length == 0) {
      callback(false)
    } else {
      callback(true)
    }

  })

}


function inviteFriend(userId, userName, email, res) {

  db.get().collection('users').find({
    "_id" : userId,
    "invited" : { $in : [email.trim()]}
  },{
    "invited" : 1,
    "_id" : 0
  })
  .toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    var invitedList = []

    if (result.length !=0) {
      invitedList = result[0].invited
    }

    if(invitedList.length !=0) {

      res.status(200).json( common.formatResponse({
        type: 'error',
        code: 'INVITE_ALREADY_INVITED',
        data: {
          message: 'You have already invited this friend'
        }
      }))

    } else {

   // Insert new entry
   db.get().collection('users').update({
    "_id" :userId
  },{
    $push : { 
      "invited" :  email.trim()
    }
  }, function(err, result){

   if(err)
    console.log(err)
  
  // Send email
  common.sendEmail({
    from: config.get('email.from'),
    to: email.trim(),
    subject: 'Memmbles - Invitation',
    template: 'invite.html',
    data: {
      name: userName
    }
  })

  // Send success
  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'INVITE_SUCCESS',
    data: {
      message: 'Invitation has been sent'
    }
  }))

})
 }

})
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