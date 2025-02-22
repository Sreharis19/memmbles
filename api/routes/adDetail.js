var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var formidable = require('formidable')
var fs = require('fs')


router.get('/detail:offset/:limit', function(req, res){
  console.log("Got AdDetail")

    console.log("offset : " + +req.params.offset)
    console.log("limit : " + +req.params.limit)

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }


  try{

    console.log("try")
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)


    getAd(req.params.offset,req.params.limit, userId,function(ads){ 

      getAdsTags(function(allTags){

        console.log('=============')
        console.log(ads)
        console.log('=============')

        ads.forEach(function(ad, index){
          var tagArray = [] 
          ad.tag.forEach(function(adsTagId){
            allTags.forEach(function(mainTag){
        //console.log( 'if '+mainTag._id+' == '+adsTagId)

        if(mainTag._id == adsTagId){
          console.log('match found')
          tagArray.push(mainTag.tag)
               
              }
            })
          })
          
          ads[index].tag = tagArray
          })

        sendSuccessResponseAd(ads,res)
      })
    })


    

  }catch(err){
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

function getAdsTags (callback) {
 
  db.get().collection('ads_tags').find({})
  .toArray(function(err, ads){
    if(err){
      console.log(err)      
      throw err
    }
    callback(ads) 
  })
}

function getAd(offset, limit, userId, callback){

    //console.log("inside offset : " + +offset)
    // console.log("inside limit : " + +req.params.limit)
  db.get().collection('ad_detail').find({
    "user_id": userId
  })
  .skip(+offset)
  .limit(+limit)
  .toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    callback(result) 

  })

}



function sendSuccessResponseAd(data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'AD_DETAILS_SUCCESS',
    data: {
      message:'Ad details fetched successfully', 
      data: { 
        details : data
      } 
    }
  }))
}
module.exports = router