var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var formidable = require('formidable')
var fs = require('fs')




router.put('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	try{
 		var decoded = jwt.verify(token, common.getSecret())

 		console.log(decoded)

 		switch(req.body.action){

 			case "deactivate" :
      console.log(req.body.action)
      console.log(req.body.advertisementId)
 			deactivateAdvertisement(req.body.advertisementId)
 			break

 			case "activate" :
      console.log(req.body.advertisementId)
 			activateAdvertisement(req.body.advertisementId)
 			break
 		}

            /**
            * @method
            * @param {string} userId
            * @return {json} success or error message
            * @desc Suspend a user Account
            *
            */
            function deactivateAdvertisement(adId){
              console.log("executioon of deactivate")
             var ads = db.get().collection('ad_detail')

             ads.update({ "_id" : new mongodb.ObjectID(adId) },
             {  
              $set : {
               status : "inactive"
             }
           }, function(err, result){

            res.status(200).json( common.formatResponse({
             type: 'success',
             code: 'ADS_DEACTIVATE_SUCCESS',
             data: {
              message: 'Advertisement has been deactivated', 
              data: ''
            }
          }))
          })

           }

           function activateAdvertisement(adId){
              console.log("executioon of activate")
             var ads = db.get().collection('ad_detail')

             ads.update({ "_id" : new mongodb.ObjectID(adId) },
             {  
              $set : {
               status : "active"
             }
           }, function(err, result){

            res.status(200).json( common.formatResponse({
             type: 'success',
             code: 'ADS_ACTIVE_SUCCESS',
             data: {
              message: 'Advertisement has been activated', 
              data: ''
            }
          }))
          })

           }


         } catch(err) {
           console.log(err)
           sendAuthError(res)
         }

       })

router.delete('/:deleteAdId', function(req, res) {

  console.log("inside delete")
  console.log(req.params)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  console.log(req.params.deleteAdId)

  try{
    console.log("try del")
    var decoded = jwt.verify(token, common.getSecret())
    console.log(decoded)
    var advertisementId = new mongodb.ObjectId(req.params.deleteAdId.trim())

    console.log("ADiD"+advertisementId)

    var advertisements = db.get().collection('ad_detail')
    advertisements.remove( { "_id": advertisementId}, function (err, result) {

      if(err) 
        res.status(500).json( common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      res.status(200).json( common.formatResponse({
        type: 'success',
        code: 'ADS_DELETE_SUCCESS',
        data: {
          message:'Advertisement deleted successfully', 
          data: {} 
        }
      }))

    })

  } catch(err){
    sendAuthError(res)
  }

 })


function sendAuthError(res){
  res.status(401).json( common.formatResponse({
    type: 'authorizationError',
    code: 'INVALID_TOKEN',
    data: 'User authentication failed'
  }))
  return
 }

 module.exports = router