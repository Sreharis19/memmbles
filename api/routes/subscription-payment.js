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
let date = require('date-and-time');
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
  
  // function roundToTwo(num) {
  //   return +(Math.round(num + "e+2")  + "e-2");
  // }


//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

function authorizeCreditCard(data){
  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(config.get('authorizenet.apiLoginKey'));
  merchantAuthenticationType.setTransactionKey(config.get('authorizenet.transactionKey'));

  var creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber(req.body.cnumber);
  creditCard.setExpirationDate(req.body.expiry);
  creditCard.setCardCode(req.body.cvv);

  var paymentType = new ApiContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  var orderDetails = new ApiContracts.OrderType();
  orderDetails.setInvoiceNumber(utils.getRandomString('Inv:'));
  orderDetails.setDescription('Description');

 /* var tax = new ApiContracts.ExtendedAmountType();
  tax.setAmount('4.26');
  tax.setName('level2 tax name');
  tax.setDescription('level2 tax');
  */
/*  var duty = new ApiContracts.ExtendedAmountType();
  duty.setAmount('8.55');
  duty.setName('duty name');
  duty.setDescription('duty description');

  var shipping = new ApiContracts.ExtendedAmountType();
  shipping.setAmount('8.55');
  shipping.setName('shipping name');
  shipping.setDescription('shipping description');*/

  var billTo = new ApiContracts.CustomerAddressType();
  billTo.setFirstName(data.name.first);
  billTo.setLastName(data.name.last);
/*  billTo.setCompany('Souveniropolis');
*/  
if(data.location.locality){
  billTo.setAddress(data.location.locality.long);
}
if(data.location.city){
  billTo.setCity(data.location.city.long);
}
if(data.location.state){
  billTo.setState(data.location.state.long);
}
if(data.location.country){
   billTo.setCountry(data.location.country.long);
}

//billTo.setAddress(data.location.locality.long);
// billTo.setCity(data.location.city.long);
// billTo.setState(data.location.state.long);
/*  billTo.setZip('44628');
*/  
//billTo.setCountry(data.location.country.long);

  /*var shipTo = new ApiContracts.CustomerAddressType();
  shipTo.setFirstName('China');
  shipTo.setLastName('Bayles');
  shipTo.setCompany('Thyme for Tea');
  shipTo.setAddress('12 Main Street');
  shipTo.setCity('Pecan Springs');
  shipTo.setState('TX');
  shipTo.setZip('44628');
  shipTo.setCountry('USA');*/

  var lineItem_id1 = new ApiContracts.LineItemType();
  lineItem_id1.setItemId('1');
  lineItem_id1.setName('plan');
  lineItem_id1.setDescription(' plan payment');
  lineItem_id1.setQuantity('1');
  lineItem_id1.setUnitPrice(req.body.amountToPay/100);

  /*var lineItem_id2 = new ApiContracts.LineItemType();
  lineItem_id2.setItemId('2');
  lineItem_id2.setName('vase2');
  lineItem_id2.setDescription('cannes logo2');
  lineItem_id2.setQuantity('28');
  lineItem_id2.setUnitPrice('25.00');*/

  var lineItemList = [];
  lineItemList.push(lineItem_id1);


  var lineItems = new ApiContracts.ArrayOfLineItem();
  lineItems.setLineItem(lineItemList);

/*  var userField_a = new ApiContracts.UserField();
  userField_a.setName('A');
  userField_a.setValue('Aval');

  var userField_b = new ApiContracts.UserField();
  userField_b.setName('B');
  userField_b.setValue('Bval');

  var userFieldList = [];
  userFieldList.push(userField_a);
  userFieldList.push(userField_b);

  var userFields = new ApiContracts.TransactionRequestType.UserFields();
  userFields.setUserField(userFieldList);

  var transactionSetting1 = new ApiContracts.SettingType();
  transactionSetting1.setSettingName('duplicateWindow');
  transactionSetting1.setSettingValue('120');

  var transactionSetting2 = new ApiContracts.SettingType();
  transactionSetting2.setSettingName('recurringBilling');
  transactionSetting2.setSettingValue('false');

  var transactionSettingList = [];
  transactionSettingList.push(transactionSetting1);
  transactionSettingList.push(transactionSetting2);

  var transactionSettings = new ApiContracts.ArrayOfSetting();
  transactionSettings.setSetting(transactionSettingList);*/

  var transactionRequestType = new ApiContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount(req.body.amountToPay/100);
  transactionRequestType.setLineItems(lineItems);
  /*transactionRequestType.setUserFields(userFields);*/
  transactionRequestType.setOrder(orderDetails);
/*  transactionRequestType.setTax(tax);
  transactionRequestType.setDuty(duty);
  transactionRequestType.setShipping(shipping);*/
  transactionRequestType.setBillTo(billTo);
/*  transactionRequestType.setShipTo(shipTo);
transactionRequestType.setTransactionSettings(transactionSettings);*/

var createRequest = new ApiContracts.CreateTransactionRequest();
createRequest.setMerchantAuthentication(merchantAuthenticationType);
createRequest.setTransactionRequest(transactionRequestType);

  //pretty print request
  console.log(JSON.stringify(createRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
  ctrl.setEnvironment(SDKConstants.endpoint.production);
  ctrl.execute(function(){

    var apiResponse = ctrl.getResponse();

    var response = new ApiContracts.CreateTransactionResponse(apiResponse);

    //pretty print response
    console.log("response############",response)
    console.log("response############")

    console.log(JSON.stringify(response, null, 2));
    responseData = JSON.stringify(response, null, 2);
    if(response != null){
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
        if(response.getTransactionResponse().getMessages() != null){


          if(response.getTransactionResponse().getResponseCode()==1){

            // response.amount=req.body.amountToPay
            // var params = {
            //   userId : data._id,
            //   paymentGateway : "authorize.net",
            //   paymentDetails : response,
            //   paymentDate : new Date()
            // }

            createSubscription(data)
            // insertPaymentCollection(params, function(paymentId){     
            //   console.log("paymentId......",paymentId)
            //   updateUserCollection(params, paymentId)
            //   sendMail(req)
            //   sendSuccess(accountBalance,res)
            // })



          }else{
            sendError(res)


            
          }
        }
        else {
          console.log("$$$$$$$$$$$$$$$$$")
          console.log('Failed Transaction.');
          if(response.getTransactionResponse().getErrors() != null){
            console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
            console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
            var errormsg = response.getTransactionResponse().getErrors().getError()[0].getErrorText()

            sendErrorMsg(res,errormsg)



          }
        }
      }
      else {

        console.log('Failed Transaction.');
        if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){
          console.log("%%%%%%%%%%%%%%%%%%%%%%")

          console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
          console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
          
          var errormsg = response.getTransactionResponse().getErrors().getError()[0].getErrorText()

          sendErrorMsg(res,errormsg)


        }
        else {
          console.log("*****************")

          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
          var errormsg = response.getMessages().getMessage()[0].getText()

          sendErrorMsg(res,errormsg)

        }
      }
    }
    else {
      console.log('Null Response.');
    }

  });
}




//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&










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

  var now = new Date();
  var next_month = date.addMonths(now, 1);
  var newDate= date.format(next_month, 'YYYY-MM-DD');
  console.log(newDate)
  paymentScheduleType.setStartDate(newDate);
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
    if(data.location.locality){
      nameAndAddressType.setAddress(utils.getRandomString(data.location.locality.long));}
    if(data.location.city){
      nameAndAddressType.setCity(utils.getRandomString(data.location.city.long));
    }
    if(data.location.state){
      nameAndAddressType.setState(utils.getRandomString(data.location.state.long));
    }
    if(data.location.country){
      nameAndAddressType.setCountry(data.location.country.long);
    }
  //nameAndAddressType.setAddress(utils.getRandomString(data.location.country.long));
  // nameAndAddressType.setCity(utils.getRandomString(data.location.city.long));
  // nameAndAddressType.setState(utils.getRandomString(data.location.state.long));
/*  nameAndAddressType.setZip('98004');
*/  //nameAndAddressType.setCountry(data.location.country.long);

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
    authorizeCreditCard(data)

    //createSubscription(data)

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
  console.log()

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
    "subscriptions.type" : paymentData.plan,
    "subscriptions.profile" : paymentData.paymentDetails.profile
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