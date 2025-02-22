/**
* @file 
* @desc Subscription Payment via Stripe
* @author Ajith
* @date 07 June 2017
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

var stripe = require('stripe')('sk_test_SUYTYnLJ8K2kQuqcooypuN77')


/**
 * @callback
 * @param {string} 
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('got request')

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }


  verifyToken(token, res, function(decoded){

    var userId = new mongodb.ObjectId(decoded.userId)

    getUserDetails(userId, function(data){  

      // Create a new customer and then a new charge for that customer: 
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

        // sendSuccess(data)
      })


  /**
   * @method
   * @desc Send success response 
   *
   */
   function sendSuccess() {

     res.status(200).json( common.formatResponse({
      type: 'success',
      code: 'PAYMENT_SUCCESS',
      data: {
        message: 'Payment completed successfully'
      }
    }))
   }

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
    from: '"Memmbles " <info@apidemo.in>',
    to: req.body.stripeEmail,
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

module.exports = router