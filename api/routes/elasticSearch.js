/**
* @file 
* @desc Elastic Search
* @author Deepak
* @date 02 May 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var formidable = require('formidable')
var fs = require('fs')
const crypto = require('crypto')
var mongodb = require('mongodb')
var request = require('request')
const config = require('config')


/**
 * @method
 * @return {json} Success or error message
 * @desc Get list of Memmbles of a User
 *
 */
 router.get('/search_history', function(req, res){

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)
    var search_result = db.get().collection('search_result')
    search_result.find({
      user_id: userId
    }).sort({date_created: -1}).limit(15).toArray(function(err,result){
      var output = {
        "users" : [],
        "memmbles" : [],
        "photos" : []
      }
      if (result.length > 0) {
        getBlockUsers(userId, function(blist){
        var blockList = blist.notInarray
        var newData = []
        if(blockList){
          blockList.forEach((item)=>  newData.push(item.toString()))
        }
        var processedCount = 0
        for(item of result){

              if(item._type == "user"){

                var isBlocked = newData.indexOf(item._id)
                if(isBlocked == -1){
                  output.users.push(item)
                }
                 
              } 
              if(item._type == "album") {
                var isBlocked = newData.indexOf(item._source.userId)
                if(isBlocked == -1){
                  output.memmbles.push(item)
                }
              }
              if(item._type == "photo") {
                var desc = item._source.description
                if(desc == "") {
                  if(item._source.hasOwnProperty("tags")) {
                    item._source.description = item._source.tags.join(", ")
                  }
                }
                output.photos.push(item)    
              }
            processedCount++


            if (result.length == processedCount) {
              var pcount = 0
              var photolen = output.photos.length
              if(output.photos.length){
                output.photos.forEach((out,index) =>{
                if(out._type == "photo"){
                  getMemmbleById(out._source.memmbleId,out, (result,out)=>{
                  if(result){
                    var isBlocked = newData.indexOf(result[0].album.user_id.toString())
                    pcount++
                    if(isBlocked != -1){
                      output.photos.splice(output.photos.indexOf(out), 1)
                      if (photolen == pcount) {
                        sendSuccess(output,res)
                      }
                    }else if(photolen == pcount){
                      sendSuccess(output,res)
                    }
                  }
                  })
                }
              })

              }else{
                sendSuccess(output,res)

              }
            }

          }

        })
      }else{
        sendSuccess(output,res)
      }
    })
    
  }catch(err) {
    sendAuthError(res)
  }
})

 /**
 * @method
 * @return {json} Success or error message
 * @desc post search result of the user
 *
 */
 router.post('/saveSearch', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)
    validator.validateData('saveSearch', req);
    var errors = req.validationErrors()
    if(errors) {

      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
    const query = { _id: new mongodb.ObjectId(req.body.searchItem) };
    const update = { 
      user_id: userId,
      _type: req.body.searchType, //user | album | photo
      _id: new mongodb.ObjectId(req.body.searchItem),
      _source: req.body.source,
      date_created: new Date()
    };
    const options = { upsert: true };

    var search_result = db.get().collection('search_result')
    search_result.updateOne(query, update, options, function(err, result) {
      res.status(200).json( common.formatResponse({
        type: 'success',
        code: 'SEARCH_RESULT_INSERTED',
        data: {
              message: 'Search result inserted successfully',
        }
      }))
    })
    
  }catch(err) {
    sendAuthError(res)
  }
})

  /**
 * @method
 * @return {json} Success or error message
 * @desc delete search history of the user
 *
 */
 router.post('/deleteSearch', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)
    validator.validateData('deleteSearch', req);
    var errors = req.validationErrors()
    if(errors) {

      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
    const query = { _id: new mongodb.ObjectId(req.body.searchId) };

    var search_result = db.get().collection('search_result')
    search_result.remove(query, function(err, result) {
      res.status(200).json( common.formatResponse({
        type: 'success',
        code: 'SEARCH_RESULT_DELETE',
        data: {
              message: 'Search result deleted successfully',
        }
      }))
    })
    
  }catch(err) {
    sendAuthError(res)
  }
})


/**
 * @callback
 * @param {string} firstName
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{
    var decoded = jwt.verify(token, common.getSecret())

    switch(req.body.action) {
      case 'search':
      getSearchResult(decoded, req.body.query)
      saveSearchKeyword(decoded, req.body.query)
      break

      case 'globalSearch':
      getGlobalSearchResult(decoded, req.body.query)
      saveSearchKeyword(decoded, req.body.query)
      break
    }

  } catch(err){
    console.log(err)
    res.status(401).json( common.formatResponse({
     type: 'authorizationError',
     code: 'INVALID_TOKEN',
     data: 'User authentication failed'
   }))
    return
  }

  function saveSearchKeyword(decoded, searchKeyword) {

    var payload = {
      user_id: new mongodb.ObjectId(decoded.userId),
      keyword: searchKeyword,
      date_created: new Date()  
    }

    var search_history = db.get().collection('search_history')

    search_history.insert( payload, function(err, result) {
      if(err)
        res.status(500).json( common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))
    })
  }

  function getSearchResult(decoded, searchKeyword) {
    request.post(config.get('searchResultUrl'),
    {
      json:  {        
        query : {       
          multi_match : {
            fields : ["first_name^2", "last_name", "email"],
            query : searchKeyword,
            type : "cross_fields"
          }
        }
      }
    }, function (error, response, body) {
      console.log(error)
      if (!error && response.statusCode == 200) {
        var data =response.body.hits.hits
        var processedCount = 0
        var userIdOrg = new mongodb.ObjectId(decoded.userId)
        getBlockUsers(userIdOrg, function(blist){
          var blockList = blist.notInarray
          var newData = []
          if(blockList){
            blockList.forEach((item)=>  newData.push(item.toString()))
          }
          if(data.length > 0){
            data.forEach((pep,index)=>{
              processedCount++
              var isBlocked = newData.indexOf(pep._id)
              if(isBlocked != -1){
                data.splice(index,1)
              }
              if (data.length == processedCount) {
              res.status(200).json( common.formatResponse({
                type: 'success',
                code: 'SEARCH_RESULT',
                data: {
                  message: 'Search result retrieved',
                  data: data
                }
              }))
              }
            })             
          }else{

            res.status(200).json( common.formatResponse({
            type: 'success',
            code: 'SEARCH_RESULT',
            data: {
              message: 'Search result retrieved',
              data: data
            }
            }))
          }
          return
        
        })
      } else {
        res.status(200).json( common.formatResponse({
          type: 'error',
          code: 'SEARCH_ERROR',
          data: 'Error retrieving search result'
        }))
        return
      }       
    })
  }

  function getGlobalSearchResult(decoded, query) {

        //     query : {
        //   match_phrase_prefix : {
        //     _all : query
        //   }
        // }

        var output = {
          "users" : [],
          "memmbles" : [],
          "photos" : []
        }

      //     json:  {
      //   query : {
      //     multi_match : {
      //       query : query,
      //       type : "phrase_prefix",
      //       fields : ["description", "title", "first_name", "last_name", "email"],
      //       operator: "and"
      //     }
      //   }
      // }

      console.log('inside getGlobalSearchResult '+ query,config.get('globalSearchResultUrl'))
      request.post(config.get('globalSearchResultUrl'),
      {
        json:  {
          query: {
            bool: {
              should: [{
                multi_match: {
                  query: query,
                  type: "cross_fields",
                  fields: ["first_name", "last_name"],
                  minimum_should_match: "50%"
                }
              },{
                multi_match: {
                  query: query,
                  type: "phrase_prefix",
                  fields : ["description", "title", "first_name", "last_name", "email", "tags"]
                }
              }]
            }
          }
        }
      }, function (error, response, body) {
        console.log("inside function")
        console.log(response.body.hits.hits)
        if (!error && response.statusCode == 200) {

          var result = response.body.hits.hits
          var processedCount = 0
          var blockList = []

          if (result.length > 0) {
            var userIdOrg = new mongodb.ObjectId(decoded.userId)

            getBlockUsers(userIdOrg, function(blist){
            var blockList = blist.notInarray
            var newData = []


            if(blockList){
              blockList.forEach((item)=>  newData.push(item.toString()))
            }
            // console.log("newwwwdata",newData)
            // newData.push('5c7d14d9e4a771079279b67c')
            // console.log("newwwwdata",newData)
            for(item of result){

              if(item._type == "user"){

                var isBlocked = newData.indexOf(item._id)
                if(isBlocked == -1){
                  output.users.push(item)
                }
                 
              } 
              if(item._type == "album") {
                var isBlocked = newData.indexOf(item._source.userId)
                if(isBlocked == -1){
                  output.memmbles.push(item)
                }
              }
              if(item._type == "photo") {
                      var desc = item._source.description
                      if(desc == "") {
                        if(item._source.hasOwnProperty("tags")) {
                          item._source.description = item._source.tags.join(", ")
                        }
                      }
                      output.photos.push(item)

                
             }
            processedCount++


            if (result.length == processedCount) {
              var pcount = 0
              var photolen = output.photos.length
              if(output.photos.length){
                output.photos.forEach((out,index) =>{
                if(out._type == "photo"){
                  getMemmbleById(out._source.memmbleId,out, (result,out)=>{
                  if(result){
                    var isBlocked = newData.indexOf(result[0].album.user_id.toString())
                    pcount++
                    if(isBlocked != -1){
                      output.photos.splice(output.photos.indexOf(out), 1)
                      if (photolen == pcount) {
                        sendSuccess(output,res)
                      }
                    }else if(photolen == pcount){
                      sendSuccess(output,res)
                    }
                  }
                  })
                }
              })

              }else{
                sendSuccess(output,res)

              }
            }

          }
        })

        } else {
          sendSuccess(output,res)
        }

        return
      } else {
        res.status(200).json( common.formatResponse({
          type: 'error',
          code: 'SEARCH_ERROR',
          data: 'Error retrieving search result'
        }))
        return
      }
    })

    }


  

})

/**
   * @method
   * @param {json} output
   * @desc Send success response 
   *
   */
   function sendSuccess(output,res) {

    res.status(200).json( common.formatResponse({
      type: 'success',
      code: 'SEARCH_RESULT',
      data: {
        message: 'Search result retrieved',             
        data: output
      }
    }))
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



function getMemmbleById(memmbleId,item, callback) {
    
    var memmbles = db.get().collection('memmbles')
    memmbles.find({
      "_id": new mongodb.ObjectId(memmbleId)
    },{"album.user_id":1})
    .toArray(function(err, result) {
      if (err) {
        console.log(err)
        throw err
      }
      var details = result
      callback(details,item)
    })
  }



  function getBlockUsers(userId, callback){
  db.get().collection('users').aggregate(
   [
        { $match: { "_id" : userId } },
        { $project : {
            "blocked_users": { $ifNull: [ "$blocked_users", [] ] },
            "blocked_by": { $ifNull: [ "$blocked_by", [] ] }



          }
        },
        {
           $project: {
             "notInarray": {
                 $reduce: {
                    input: [ "$blocked_by" ],
                    initialValue: "$blocked_users",
                    in: { $concatArrays : ["$$value", "$$this"] }
                 }
              }
            }
          }
  ]).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    console.log(result)
    let data = result[0]
    console.log("users not in array11111111111111111111111111111111",data)
    callback(data)
  })
}

module.exports = router
