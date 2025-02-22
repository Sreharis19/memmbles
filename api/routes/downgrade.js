/**
* @file 
* @desc Downgrade user to free plan
* @author Deepak
* @date 30 July 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
const crypto = require('crypto')
var mongodb = require('mongodb')
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var constants = require('../constants.js');
const config = require('config')
var SDKConstants = require('authorizenet').Constants;


/**
 * @callback
 * @param {string} 
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('got downgrade request')

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }


  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(decoded.userId)
    console.log('downn')
    console.log(userId)

    var totalMemmbles = req.body.totalMemmbles
    console.log('totalMemmbles '+totalMemmbles)

    if(totalMemmbles == 0) {
      updateUserSubscription(userId)
    } else {
     updateUserCollection(userId, totalMemmbles)
   }

    // sendSuccess()

  })


/**
 * @method
 * @param {ObjectId} userId 
 * @param {function} callback
 * @return {json} data
 * @desc Get Name of the User
 * @collection - users
 *
 */
 function getUserDetails(userId, callback){

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


/**
 * @database
 * @param {string} - paymentId 
 * @param {object} - paymentData 
 * @desc Update payment-subscription details of the user
 * @collection users
 *
 */
 function updateUserCollection(userId, totalMemmbles){

  var processedMemmble = 0

  db.get().collection('memmbles').find({
    "album.user_id": userId
  }).forEach(function(doc) {

    db.get().collection('memmbles').update({
      "_id": doc._id
    },{
      $set: {
        "album.visibility" : "public"
      }
    }, function(err, count, updateResult) {    

      if(err)
        console.log(err)

      processedMemmble++

      if(processedMemmble == totalMemmbles) {
        updateUserSubscription(userId)
      }

    })

  })

}

  /**
   * @method
   * @desc Change subscription to free
   *
   */
   function updateUserSubscription (userId) {
    db.get().collection('users').update({
      "_id" : userId
    },{
     $set : {
      "subscriptions.type" : "free"
    }
  }, function(err, result){
    if(err)
     console.log(err)
   getPaymentDetails(userId, function(data){  
    console.log("dataaaaaaaaaa",data)
    cancelSubscription(data,res)

  })
 })

  }


  /**
   * @method
   * @desc Send success response 
   *
   */
   
 })

 function getPaymentDetails(userId, callback){
  console.log("getPaymentDetails")

  db.get().collection('payments').find({
    "user_id" : userId
  }).sort({"payment_date":-1}).limit(1).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result[0]
    callback(data)
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




function sendSuccess(res) {

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'DOWNGRADE_TO_FREE_SUCCESS',
  data: {
    message: 'Successfully downgraded to free plan'
  }
}))
}




function sendError(res) {

 res.status(200).json( common.formatResponse({
  type: 'error',
  code: 'DOWNGRADE_TO_FREE_ERROR',
  data: {
    message: 'downgraded to free plan Failed'
  }
}))
}


function cancelSubscription(data,res){
  console.log("cancelSubscription")
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
  merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));


  var cancelRequest = new ApiContracts.ARBCancelSubscriptionRequest();
  cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
  cancelRequest.setSubscriptionId(data.payment_details.subscriptionId);

  console.log(JSON.stringify(cancelRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.ARBCancelSubscriptionController(cancelRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);

  ctrl.execute(function(){

    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.ARBCancelSubscriptionResponse(apiResponse);

    console.log(JSON.stringify(response, null, 2));

    if(response != null){
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
        console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
        console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
        sendSuccess(res)
      }
      else{
        console.log('Result Code: ' + response.getMessages().getResultCode());
        console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
        console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        sendError(res)
      }
    }
    else{
      console.log('Null Response.');
      sendError(res)

    }

  });
}



module.exports = router