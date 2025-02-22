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
 router.post('/', function(req, res) {

  console.log('Helloooooooooo.............. got request')
  console.log("req.headers.authorization",req.headers.authorization)


  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
    console.log("req.headers.authorization",req.headers.authorization)
  }
  


  function getCustomerPaymentProfile(data){
    // console.log("req.body.cnumber",req.body.cnumber)
    // console.log("req.body.expiry",req.body.expiry)
    // console.log("req.body.cvv",req.body.cvv)



    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
    merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));

    var creditCardForUpdate = new ApiContracts.CreditCardType();
    creditCardForUpdate.setCardNumber(req.body.cnumber);
    creditCardForUpdate.setExpirationDate(req.body.expiry);

    var paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCardForUpdate);

    var customerAddressType = new ApiContracts.CustomerAddressType();
    customerAddressType.setFirstName(data.name.first);
    customerAddressType.setLastName(data.name.last);
    customerAddressType.setAddress(data.location.locality.long);
    customerAddressType.setCity(data.location.city.long);
    customerAddressType.setState(data.location.state.long);
    customerAddressType.setZip('00000');
    customerAddressType.setCountry(data.location.country.long);
    //customerAddressType.setPhoneNumber('222-222-2222');

    var customerForUpdate = new ApiContracts.CustomerPaymentProfileExType();
    customerForUpdate.setPayment(paymentType);
    // customerForUpdate.setDefaultPaymentProfile(true);

  customerForUpdate.setCustomerPaymentProfileId(data.subscriptions.profile.customerPaymentProfileId);
  customerForUpdate.setBillTo(customerAddressType);

  var updateRequest = new ApiContracts.UpdateCustomerPaymentProfileRequest();
  updateRequest.setMerchantAuthentication(merchantAuthenticationType);
  updateRequest.setCustomerProfileId(data.subscriptions.profile.customerProfileId);  
  updateRequest.setPaymentProfile(customerForUpdate);
  updateRequest.setValidationMode(ApiContracts.ValidationModeEnum.LIVEMODE);

  validateCustomerPaymentProfile(data.subscriptions.profile.customerProfileId, data.subscriptions.profile.customerPaymentProfileId, req.body.cvv, function(){
  //pretty print request
  console.log(JSON.stringify(updateRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.UpdateCustomerPaymentProfileController(updateRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);

  ctrl.execute(function(){

    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.UpdateCustomerPaymentProfileResponse(apiResponse);

    //pretty print response
    //console.log(JSON.stringify(response, null, 2));
    console.log("@@@@@@@@@@ response @@@@@@@@")
    console.log(response)
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")

    if(response != null) 
    {
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK)
      {
        console.log('Successfully updated a customer payment profile with id: ' + data.subscriptions.profile.customerPaymentProfileId);
        sendSuccess(res)
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


function validateCustomerPaymentProfile(customerProfileId, customerPaymentProfileId,cvv, callback) {
  console.log("customerProfileId",customerProfileId)
  console.log("customerPaymentProfileId",customerPaymentProfileId)
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
  merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));

  var validateRequest = new ApiContracts.ValidateCustomerPaymentProfileRequest();
  validateRequest.setMerchantAuthentication(merchantAuthenticationType);
  validateRequest.setCustomerProfileId(customerProfileId);  
  validateRequest.setCustomerPaymentProfileId(customerPaymentProfileId);
  validateRequest.setValidationMode(ApiContracts.ValidationModeEnum.LIVEMODE);
  validateRequest.setCardCode(cvv);

  //pretty print request
  //console.log(JSON.stringify(createRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.ValidateCustomerPaymentProfileController(validateRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);

  ctrl.execute(function(){

    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.ValidateCustomerPaymentProfileResponse(apiResponse);

    //pretty print response
    console.log(JSON.stringify(response, null, 2));

    if(response != null) 
    {
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK)
      {
        console.log('Successfully validated the customer payment profile with id : ' + customerPaymentProfileId);
      }
      else
      {
        //console.log('Result Code: ' + response.getMessages().getResultCode());
        console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
        console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
      }
    }
    else
    {
      console.log('Null response received');
    }

    callback(response);
  });
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


function sendSuccess(res) {

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'PAYMENT_PROFILE_UPDATE_SUCCESS',
  data: {
    message: 'Payment profile updated successfully'
  }
}))
}

function sendErrorMsg(res,errormsg){
  console.log(errormsg)
  res.status(200).json( common.formatResponse({
    type: 'error',
    code: 'PAYMENT_PROFILE_UPDATE_NOT_SUCCESS',
    data: {
      message: errormsg
      
    }
  }))

}

module.exports = router