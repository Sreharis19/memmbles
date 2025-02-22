var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var formidable = require('formidable')
var fs = require('fs')


router.post('/search', function(req, res) {
  console.log("Searching Ads...")

  var token = ''
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  console.log(req.body)
  console.log(req.body.query)


  try {

    console.log("try")
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)

    console.log(decoded)

    getAd(req.body.query, userId, function(ads) {

      console.log("getAd")

      getAdsTags(function(allTags) {

        console.log('=============')
        console.log(ads)
        console.log('=============')

        ads.forEach(function(ad, index) {
          var tagArray = []
          ad.tag.forEach(function(adsTagId) {
            allTags.forEach(function(mainTag) {

              if (mainTag._id == adsTagId) {
                console.log('match found')
                tagArray.push(mainTag.tag)

              }
            })
          })

          ads[index].tag = tagArray
        })

        sendSuccessResponseAd(ads, res)
      })
    })




  } catch (err) {
    sendAuthError(res)
  }
})

function sendAuthError(res) {
  res.status(401).json(common.formatResponse({
    type: 'authorizationError',
    code: 'INVALID_TOKEN',
    data: 'User authentication failed'
  }))
  return
}

function getAdsTags(callback) {

  db.get().collection('ads_tags').find({})
    .toArray(function(err, ads) {
      if (err) {
        console.log(err)
        throw err
      }
      callback(ads)
    })
}

function getAd(query, userId, callback) {
  console.log("fun1")
  db.get().collection('ad_detail').find({
      "user_id": userId,
      "name": {
        $regex: query
      }
    })
    .toArray(function(err, result) {
      if (err) {
        console.log(err)
        throw err
      }
      callback(result)

    })

}



function sendSuccessResponseAd(data, res) {

  res.status(200).json(common.formatResponse({
    type: 'success',
    code: 'SEARCH_SUCCESS',
    data: {
      message: 'Ad search successfully',
      data: {
        details: data
      }
    }
  }))
}
module.exports = router
