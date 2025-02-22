/**
* @file 
* @desc Subscription Payment via authorizenet
* @author Jins
* @date 30 April 2018
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

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var constants = require('../constants.js');
var SDKConstants = require('authorizenet').Constants;

/*var stripe = require('stripe')('sk_test_SUYTYnLJ8K2kQuqcooypuN77')
*/

/**
 * @callback
 * @param {string} 
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('Helloooooooooo.............. got request')

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
//=====================================================

function createSubscription(data) {
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
  merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));
  /*merchantAuthenticationType.setName('9Rrhs65Km8m');
  merchantAuthenticationType.setTransactionKey('93E35hZz8yhNYS2k');*/

  var interval = new ApiContracts.PaymentScheduleType.Interval();
  interval.setLength(1);
  interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

  var paymentScheduleType = new ApiContracts.PaymentScheduleType();
  paymentScheduleType.setInterval(interval);
  paymentScheduleType.setStartDate(utils.getDate());
  paymentScheduleType.setTotalOccurrences(9999);
  paymentScheduleType.setTrialOccurrences(0);

  var creditCard = new ApiContracts.CreditCardType();
  creditCard.setExpirationDate(req.body.expiry);
  creditCard.setCardNumber(req.body.cnumber);
  creditCard.setCardCode(req.body.cvv);


  var payment = new ApiContracts.PaymentType();
  payment.setCreditCard(creditCard);

  var orderType = new ApiContracts.OrderType();
  orderType.setInvoiceNumber(utils.getRandomString('Inv:')); 
  orderType.setDescription(utils.getRandomString('Description'));

/*  var customer = new ApiContracts.CustomerType();
  customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
  customer.setId(utils.getRandomString('Id'));
  customer.setEmail(utils.getRandomInt()+'@test.anet.net');
  customer.setPhoneNumber('1232122122');
  customer.setFaxNumber('1232122122');
  customer.setTaxId('911011011');*/

  var nameAndAddressType = new ApiContracts.NameAndAddressType();
  nameAndAddressType.setFirstName(utils.getRandomString(data.name.first));
  nameAndAddressType.setLastName(utils.getRandomString(data.name.last));
  /*nameAndAddressType.setCompany(utils.getRandomString('Company'));*/
  nameAndAddressType.setAddress(utils.getRandomString(data.location.locality.long));
  nameAndAddressType.setCity(utils.getRandomString(data.location.city.long));
  nameAndAddressType.setState(utils.getRandomString(data.location.state.long));
/*  nameAndAddressType.setZip('98004');
*/  nameAndAddressType.setCountry(data.location.country.long);

var arbSubscription = new ApiContracts.ARBSubscriptionType();
arbSubscription.setName(utils.getRandomString('Name'));
arbSubscription.setPaymentSchedule(paymentScheduleType);
arbSubscription.setAmount(req.body.amountToPay/100);
arbSubscription.setTrialAmount(req.body.amountToPay/100);

arbSubscription.setPayment(payment);
arbSubscription.setOrder(orderType);
/*  arbSubscription.setCustomer(customer);
*/  arbSubscription.setBillTo(nameAndAddressType);
arbSubscription.setShipTo(nameAndAddressType);

var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
createRequest.setMerchantAuthentication(merchantAuthenticationType);
createRequest.setSubscription(arbSubscription);

console.log(JSON.stringify(createRequest.getJSON(), null, 2));

var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());
ctrl.setEnvironment(SDKConstants.endpoint.production);

ctrl.execute(function(){

  var apiResponse = ctrl.getResponse();

  var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

  console.log(JSON.stringify(response, null, 2));

  if(response != null){
    if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
      //if(response.getTransactionResponse().getMessages() != null){
      response.amount=req.body.amountToPay
      var params = {
        userId : data._id,
        paymentGateway : "authorize.net",
        paymentDetails : response,
        paymentDate : new Date(), 
        plan : req.body.plan
      }
      getPaymentDetails(data._id, function(data){

        if(data){

          console.log("############# dataaaaaaaaaa ############")
          console.log(data)
          getSubscription(data,function(response){

            console.log("^^^^^^^^^^^^^^^^ status ^^^^^^^^^^^^^^^^^^^",response.getSubscription().getStatus())
            if(response.getSubscription().getStatus()=="active"){
              console.log("############# inside active ############")

              cancelSubscription(data,res,params,req)

            }else{
              subCreation(params,req,res)

            }

          })

        }  

        else{

          subCreation(params,req,res)


          console.log('Subscription Id : ' + response.getSubscriptionId());

          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());

          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());

        }

      })
      // }
      //   else {
      //     console.log("$$$$$$$$$$$$$$$$$")
      //     console.log('Failed Transaction.');
      //     if(response.getTransactionResponse().getErrors() != null){
      //       console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
      //       console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
      //       var errormsg = response.getTransactionResponse().getErrors().getError()[0].getErrorText()

      //       sendErrorMsg(res,errormsg)



      //     }
      //   }

    }
    else{
      console.log('Result Code: ' + response.getMessages().getResultCode());
      console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
      console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
      var errormsg = response.getMessages().getMessage()[0].getText()
      sendErrorMsg(res,errormsg)
    }
  }
  else{
    console.log('Null Response.');
  }



  /*callback(response);*/
});
}




//=====================================================

verifyToken(token, res, function(decoded){

  var userId = new mongodb.ObjectId(decoded.userId)

  getUserDetails(userId, function(data){  

    console.log(data)
    createSubscription(data)

/*      // Create a new customer and then a new charge for that customer: 
      stripe.customers.create({
        email: req.body.stripeEmail,
        source : req.body.stripeToken
      })
      .then(customer =>
        stripe.charges.create({
          amount: req.body.amount,
          description: "Subscription Charge",
          currency: 'usd',
          customer: customer.id
        })
        ).then(function(charge) {
          // New charge created on a new customer          

          if (charge.status == "succeeded") {

            var params = {
              userId : userId,
              paymentGateway : "stripe",
              paymentDetails : charge,
              paymentDate : new Date(), 
              plan : req.body.plan
            }

            insertPaymentCollection(params, function(paymentId){     

              updateUserCollection(params, paymentId)
              sendMail(req)
              sendSuccess()
            })

          }else{
            res.status(200).json( common.formatResponse({
              type: 'paymentError',
              code: 'PAYMENT_ERROR',
              data: 'Payment failed'
            }))
          }

        }).catch(function(err) {
          // Deal with an error 
          console.log("error")
          console.log(err)
        })

        // sendSuccess(data)*/
      })


  /**
   * @method
   * @desc Send success response 
   *
   */
/*   function sendSuccess() {

     res.status(200).json( common.formatResponse({
      type: 'success',
      code: 'PAYMENT_SUCCESS',
      data: {
        message: 'Payment completed successfully'
      }
    }))
  }*/

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
 * @database
 * @param {object} - paymentData 
 * @param {function} - callback  
 * @desc Insert payment details of the user
 * @collection payments
 *
 */
 function insertPaymentCollection(paymentData, callback){

   var payload = {
    user_id : paymentData.userId,
    gateway : paymentData.paymentGateway,
    plan : paymentData.plan,
    payment_date : paymentData.paymentDate,
    payment_details : paymentData.paymentDetails 
  }

  db.get().collection('payments').insert(payload, function(err, result){
    if(err)
      res.status(500).json( common.formatResponse({
        type: 'dbError',
        code: 'DB_ERROR',
        data: err
      }))

    if (result) {
      callback(result.insertedIds[0])
    }

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
 function updateUserCollection(paymentData, paymentId){

  var payload = {
    subscription_id : new mongodb.ObjectId(paymentId),
    gateway : paymentData.paymentGateway,
    subscription_date : paymentData.paymentDate,
    plan : paymentData.plan
  }

  db.get().collection('users').update({
    "_id" : paymentData.userId
  },{
   $set : {
    "subscriptions.type" : paymentData.plan
  },
  $push : {
    "subscriptions.history" : payload
  }   
}, function(err, result){
  if(err)
   console.log(err)

})

}

/**
 * @email 
 * @desc Update payment-subscription details of the user
 *
 */
 function sendMail(req){

  common.sendEmail({
    from: config.get('email.from'),
    to: req.body.email,
    subject: 'Memmbles - Payment Success',
    template: 'payment_success.html',
    data: {  
    }
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
  code: 'PAYMENT_SUCCESS',
  data: {
    message: 'Payment completed successfully'
  }
}))
}


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

function getSubscription(data,callback) {
  console.log("$$$$$$$$$$$$ inside getSubscription $$$$$$$$$$$$$$")
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
  merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));

  var getRequest = new ApiContracts.ARBGetSubscriptionRequest();
  getRequest.setMerchantAuthentication(merchantAuthenticationType);
  getRequest.setSubscriptionId(data.payment_details.subscriptionId);

  console.log(JSON.stringify(getRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.ARBGetSubscriptionController(getRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);

  ctrl.execute(function(){
    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.ARBGetSubscriptionResponse(apiResponse);

    console.log(JSON.stringify(response, null, 2));
    
    if(response != null){
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
        console.log('Subscription Name : ' + response.getSubscription().getName());
        console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
        console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
      }
      else{
        console.log('Result Code: ' + response.getMessages().getResultCode());
        console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
        console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
      }
    }
    else{
      console.log('Null Response.');
    }

    console.log("%%%%%%%%%%%%%%%%%% response %%%%%%%%%%%%%%%%%%%")
    console.log(response)
    callback(response);
  });
}

function cancelSubscription(data,res,params,req){
  console.log("&&&&&&&&&&&&&&&&&&&&&& cancelSubscription &&&&&&&&&&&&&&&&&&")
  console.log(data)
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

        subCreation(params,req,res)


        console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
        console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());

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

function subCreation(params,req,res){

  insertPaymentCollection(params, function(paymentId){     

    updateUserCollection(params, paymentId)

    sendMail(req)

    sendSuccess(res)

  })


}


function sendError(res) {

 res.status(200).json( common.formatResponse({
  type: 'error',
  code: 'SUBSCRIPTION_PAYMENT_ERROR',
  data: {
    message: 'Payment was Unsuccessful'
  }
}))
}




function sendErrorMsg(res,errormsg){
  console.log(errormsg)
  res.status(200).json( common.formatResponse({
    type: 'error',
    code: 'SUBSCRIPTION_PAYMENT_ERROR_MSG',
    data: {
      message: errormsg
      
    }
  }))

}


module.exports = router