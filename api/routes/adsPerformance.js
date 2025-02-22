/*
 * @file
 * @desc Ads Performance
 * @author Deepak
 * @date 09 Jan 2018
 *
 */

 var express = require('express')
 var router = express.Router()
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var jwt = require('jsonwebtoken')
 var db = require('../database/mongodb.js')
 var mongodb = require('mongodb')
 var io = require('socket.io-client')

/**
 * @method
 * @return {json} Success or error message
 * @desc Record view/clicks for an ads
 */
 router.post('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		req.body = common.trim(req.body)
    console.log("-------------------------------------------------                    req.body                                         --------------------------------------------------------------------------------")
    console.log(req.body)
    var data = {}

    console.log('Performance')

    console.log(req.body)

    data.userId = new mongodb.ObjectId(decoded.userId)
    data.adsId = new mongodb.ObjectId(req.body.adsId.trim())
    data.action = req.body.action.trim()
    db.get().collection('ad_detail').find({"_id":data.adsId})
    .toArray(function(err, advt){

      console.log(advt)
      data.adsUserId = new mongodb.ObjectId(advt[0].user_id)
      console.log(data)
      recordAction(data, function(result){
        var output = {
         "data":{},
         "code" : "ADS_ACTION_RECORDED",
         "message" : "Action was successful"
       }
       sendSuccessResponse(output, res)
     })
    })

  })

 })


 /**
 * @method
 * @return {json} Success or error message
 * @desc Record view/clicks for an ads
 */
 router.get('/:adsId', function(req, res) {

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded) {

    var adsId = new mongodb.ObjectId(req.params.adsId)

    getTotalViews(adsId, function(totalViews) {

      //console.log(totalViews)

      getTotalClicks(adsId, function(totalClicks) {

        //console.log(totalClicks)

        getViewGraph(adsId, function(viewGraph) {

          //console.log(viewGraph)

          getClickGraph(adsId, function(clickGraph) {

            //console.log(clickGraph)

            var viewCountList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            var clickCountList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            var labelList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

            if(viewGraph.viewCountList.length < 10) {
              var itemIndex = 10
              viewGraph.viewCountList.reverse().forEach((item)=>{
                itemIndex--
                viewCountList[itemIndex] = item
              })
            }

            if(clickGraph.clickCountList.length < 10) {
              var itemIndex = 10
              clickGraph.clickCountList.reverse().forEach((item)=>{
                itemIndex--
                clickCountList[itemIndex] = item
              })
            }

            if(viewGraph.labelList.length < 10) {

              for(var days=9; days>=0; days--) {
                console.log(days)
                var date = new Date()
                var last = new Date(date.getTime() - (days * 24 * 60 * 60 * 1000))
                var day =last.getDate()
                var month=last.getMonth()+1
                var year=last.getFullYear()
                let prevDay = day+'-'+month+'-'+year
                labelList[days] = prevDay
              }
            }

            labelList = labelList.reverse()

            let data = {
              totalViews: totalViews,
              totalClicks: totalClicks,
              labels: labelList,
              viewCountList: viewCountList,
              clickCountList: clickCountList
            }
            var output = {
              "data": data,
              "code" : "ADS_PERFORMANCE_SUCCESS",
              "message" : "Ads performance data fetched successfully"
            }
            sendSuccessResponse(output, res)

          })

        })

      })
     //  var output = {
     //   "data":{},
     //   "code" : "ADS_PERFORMANCE_SUCCESS",
     //   "message" : "Action was successful"
     // }
     // sendSuccessResponse(output, res)


   })

  })
})


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


 function getViewGraph(adsId, callback) {

   db.get().collection('ads_performance').aggregate(
    [{
      $match: { 
        ads_id: adsId,
        action: 'view'
      }
    },
    {
      $group:
      {
        _id: { day: { $dayOfMonth: "$date_recorded"}, month: { $month: "$date_recorded" }, year: { $year: "$date_recorded" } },
        count: { $sum: 1 }
      }
    },
    { $sort : { "_id.year" : -1,  "_id.month" : -1,  "_id.day" : -1 } },
    { $limit : 10 }
    ]).toArray(function(err, result){

      result = result.reverse()

      var output = {
        labelList: [],
        viewCountList: []
      }
      var viewCountList = []
      var labelList = []
      var processedCount = 0

      result.forEach((item)=> {

        processedCount++
        let label = item._id.day+'-'+item._id.month+'-'+item._id.year
        labelList.push(label)
        viewCountList.push(item.count)
        if(processedCount == result.length) {
          output.labelList = labelList
          output.viewCountList = viewCountList
          callback(output)
        }
      })

      if(result.length == 0) {
       callback(output)
     }

   })

  }



  function getClickGraph(adsId, callback) {

   db.get().collection('ads_performance').aggregate(
    [{
      $match: { 
        ads_id: adsId,
        action: 'click'
      }
    },
    {
      $group:
      {
        _id: { day: { $dayOfMonth: "$date_recorded"}, month: { $month: "$date_recorded" }, year: { $year: "$date_recorded" } },
        count: { $sum: 1 }
      }
    },
    { $sort : { "_id.year" : -1,  "_id.month" : -1,  "_id.day" : -1 } },
    { $limit : 10 }
    ]).toArray(function(err, result){

      result = result.reverse()

      var output = {
        labelList: [],
        clickCountList: []
      }
      var clickCountList = []
      var labelList = []
      var processedCount = 0

      result.forEach((item)=> {

        processedCount++
        let label = item._id.day+'-'+item._id.month+'-'+item._id.year
        labelList.push(label)
        clickCountList.push(item.count)
        if(processedCount == result.length) {
          output.labelList = labelList
          output.clickCountList = clickCountList
          callback(output)
        }
      })
      
      if(result.length == 0) {
       callback(output)
     }

   })

  }


  function getTotalViews(adsId, callback) {

    db.get().collection('ads_performance').aggregate( [
    { 
      $match: {
        ads_id: adsId,
        action: 'view'
      }
    },
    { 
      $group: {
        _id: '',
        count: { $sum: 1 }
      }
    }
    // , function(err, result){
    ]).toArray(function(err, result){


      let count = 0
      if(result.length > 0) {
        count = result[0].count
      }
      callback(count)
    })
  }


  function getTotalClicks(adsId, callback) {

    db.get().collection('ads_performance').aggregate( [
    { 
      $match: {
        ads_id: adsId,
        action: 'click'
      }
    },
    { 
      $group: {
        _id: '',
        count: { $sum: 1 }
      }
    }
    // , function(err, result){
    ]).toArray(function(err, result){


      let count = 0
      if(result.length > 0) {
        count = result[0].count
      }
      callback(count)
    })
  }


/**
 * @method
 * @param {json} data
 * @param {function} callback
 * @collection ads_performance
 * @desc Record views, clicks to collection
 *
 */
 function recordAction(data, callback){

   var payload = {
    "user_id" : data.adsUserId,
    "ads_id" : data.adsId,
    "action": data.action,
    "price": 0,
    "date_recorded" : new Date()
  }

  var ads_performance = db.get().collection('ads_performance')
  ads_performance.insertOne(payload, function(err, result){
   if(err) 
    throw err
  console.log("resultttttttttt",result)
  let actionId = result.insertedId
  console.log("resultttttttttt iddddddddddd",actionId)
  deductBalance(data.adsUserId, data.action, actionId)
  callback(result)
})
}


/**
 * @method
 * @param {json} data
 * @param {function} callback
 * @collection users
 * @desc Deduct amount from user
 *
 */
 function deductBalance(userId, action, actionId) {

  /* 100 views => $1 => $0.01 per view
   * 10 clicks => $1 => $0.10 per click
   */
   getPriceDetails(userId, function(data){
    console.log("userId+DATA========",data)
    if(data.length!=0){
      getActionPrice(userId,data, actionId)
    }
    else{
      getPriceBWDates(function(data){
        if(data.length!=0){
          getActionPrice(userId,data, actionId)
        }else{
          getDefaultPrice(function(data){
            if(data.length!=0){
              getActionPrice(userId,data, actionId)
            }

          })
        }
      })
    }
  })
   function getActionPrice(userId,data, actionId){
    console.log("inside getActionPrice",userId)
    data=data[0]
    console.log(data)
    var amountPerClick =parseFloat(data.click_price)*-1
    var amountPerView = parseFloat(data.view_price)*-1
    var amountToDeduct = 0
    console.log(amountPerClick)
    switch(action){
      case 'view':
      amountToDeduct = amountPerView
      break
      case 'click':
      amountToDeduct = amountPerClick
      break
    }
    db.get().collection('users').update(
      { "_id": userId }, 
      { $inc: { ads_balance: amountToDeduct } }, function(err, count, updateResult) {          
      })
// update price
db.get().collection('ads_performance').update(
  { "_id": new mongodb.ObjectId(actionId) }, 
  { $set: { price: amountToDeduct*-1 } }, function(err, count, updateResult) {          
  })

}

}


function getPriceDetails(userId, callback){
  console.log('userId', userId)
  db.get().collection('ads_prices').find({
    "user_id" : userId
  },{
    "click_price" : 1,
    "view_price" : 1
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }
    console.log('result', result)
    let data = result
    callback(data)
  })
}

function getPriceBWDates(callback){
  console.log("inside getPriceBWDates ")
  var tdate = new Date()

  db.get().collection('ads_prices').find({


    "start_date": {
      "$lte": tdate
    },
    "end_date": {
      "$gte": tdate
    }  


  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    console.log('result', result)
    let data = result
    callback(data)
  })

}

function getDefaultPrice(callback){
  console.log("inside getDefaultPrice ")
  db.get().collection('ads_prices').find({"is_default": true})
  .toArray(function(err, result){
   if(err){
    console.log(err)      
    throw err
  }
  console.log('result', result)
  let data = result
  callback(data)
})

}





/**
 * @method
 * @param {json} result
 * @param {json} res - Response object
 * @desc Send success response
 *
 */
 function sendSuccessResponse(result, res){

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: result.code,
 		data: {
 			message: result.message, 
 			data: { 
 				details : result.data 			
 			} 
 		}
 	}))
 }


 module.exports = router