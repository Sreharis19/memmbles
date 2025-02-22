/**
* @file 
* @desc get payment details  via authorizenet
* @author Jins
* @date 10 October 2018
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
const config = require('config')
let date = require('date-and-time');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var constants = require('../constants.js');
var SDKConstants = require('authorizenet').Constants;



/**
 * @callback
 * @param {string} 
 * @return {json} success or error message
 *
 */
 router.get('/', function(req, res) {

  console.log('Helloooooooooo.............. got request')
      console.log("req.headers.authorization",req.headers.authorization)


  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
    console.log("req.headers.authorization",req.headers.authorization)
  }
  


  function getCustomerPaymentProfile(data){
    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
    merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));

    var getRequest = new ApiContracts.GetCustomerPaymentProfileRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setCustomerProfileId(data.subscriptions.profile.customerProfileId);
    getRequest.setCustomerPaymentProfileId(data.subscriptions.profile.customerPaymentProfileId);

  //pretty print request
  //console.log(JSON.stringify(createRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);
  ctrl.execute(function(){

    var apiResponse = ctrl.getResponse();
    console.log("@@@@@@@@@@ apiResponse @@@@@@@@")
    console.log(apiResponse.paymentProfile)
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")

    var response = new ApiContracts.GetCustomerPaymentProfileResponse(apiResponse);

    //pretty print response
    //console.log(JSON.stringify(response, null, 2));
    console.log("@@@@@@@@@@ response @@@@@@@@")
    console.log(response.paymentProfile.payment.creditCard.cardNumber)
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
    // var cardNumber = response.paymentProfile.CustomerPaymentProfileMaskedType.payment.PaymentMaskedType.cardNumber;


    //  console.log(cardNumber)
    if(response != null) 
    {
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK)
      {
        console.log('Customer Payment Profile ID : ' + response.getPaymentProfile().getCustomerPaymentProfileId());
        console.log('Customer Name : ' + response.getPaymentProfile().getBillTo().getFirstName() + ' ' +
          response.getPaymentProfile().getBillTo().getLastName());
        console.log('Address : ' + response.getPaymentProfile().getBillTo().getAddress());
        sendSuccess(res,response.paymentProfile.payment.creditCard)
      }
      else
      {
        //console.log('Result Code: ' + response.getMessages().getResultCode());
        console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
        console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        var errormsg = response.getMessages().getMessage()[0].getText()

        sendErrorMsg(res,errormsg)

      }
    }
    else
    {
      console.log('Null response received');
    }

    //callback(response);
  });
  

}






//=====================================================

verifyToken(token, res, function(decoded){

  var userId = new mongodb.ObjectId(decoded.userId)

  getUserDetails(userId, function(data){  

    console.log(data)
    getCustomerPaymentProfile(data)

  })


})

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
 * @method
 * @param {string} token - Auth Token
 * @param {json} res - Response Object
 * @param {function} callback
 * @desc verify auth token
 *
 */
 function verifyToken(token, res, callback){

  console.log("tokenNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",token)
  try{
    var decoded = jwt.verify(token, common.getSecret())
    callback(decoded)
  }catch(err){
    console.log("errrrrrrrrrrrrrrrrrrrrrrrrrr",err)
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


function sendSuccess(res,data) {

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'PAYMENT_PROFILE_SUCCESS',
  data: {
    message: 'Payment profile fetched successfully',
    data: data
  }
}))
}

function sendErrorMsg(res,errormsg){
  console.log(errormsg)
  res.status(200).json( common.formatResponse({
    type: 'error',
    code: 'PAYMENT_PROFILE_NOT_SUCCESS',
    data: {
      message: errormsg
      
    }
  }))

}

module.exports = router