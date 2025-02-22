/**
 * @file
 * @desc Report module
 * @author Jins
 * @date 10 aUGUST 2020
 */

 const express = require('express')
 const router = express.Router()
 const config = require('config')
 const db = require('../database/mongodb.js')
 const common = require('../functions/common.js')
 const mongodb = require('mongodb')
 var jwt = require('jsonwebtoken')


/**
 * @POST
 * @desc REPORT USER'S MEMMBLE/PHOTO/USER
 **/
 router.post('/', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    var payload = {
      reported_type: req.body.reportType,
      is_active: true,
      reported_rid: new mongodb.ObjectId(req.body.reportId),
      memmble_id: new mongodb.ObjectId(req.body.memmbleId) || "",
      reported_users: [],
      total_reports: 1,     
      date_created: new Date(),
      date_updated: new Date()

    }
    var userArray = {
    	_id: new mongodb.ObjectId(),
    	userId: userId,
    	is_acknowledged: false,
    	reported_reason: req.body.reportReason,
    	reported_date: new Date()
    }
    payload.reported_users.push(userArray)
    isInTheReportedList(req.body.reportId, function(isIdIn) {
    var reports = db.get().collection('reports')
    if(isIdIn){
    	reports.update({"reported_rid": new mongodb.ObjectId(req.body.reportId)},{
   		$push : { 
   			"reported_users" : userArray
   		},
   		$set : { "date_updated" : new Date() },
   		$inc : { "total_reports" : 1 }   
	   	}, function(err, result){
	   		if(err){
	   			res.status(500).json(common.formatResponse({
		          type: 'dbError',
		          code: 'DB_ERROR',
		          data: err
		        }))
	   		}else{   			
	   			reportedSuccessfully(res)
	   		}
	   	})
    }else{
    	reports.insert( payload, function(err, result) {
	      	if(err){
	      	res.status(500).json(common.formatResponse({
	          type: 'dbError',
	          code: 'DB_ERROR',
	          data: err
	        }))

	      	}else{   			
	   			reportedSuccessfully(res)
	   	  	}      
	    })
    }
    })    
  })
})



function reportedSuccessfully(res){
	res.status(200).json(common.formatResponse({
	    type: 'success',
	    code: 'REPORT_POSTED_SUCCESS',
	    data: {
	        message: 'Report posted successfully',
	        data: {}                                      
	    }
	}))
}

/**
   * @method
   * @param {ObjectId} reportId  
   * @collection  reports 
   * @desc Check already in the reported list
   * @return {boolean} - TRUE if there
   *
   */
   function isInTheReportedList(rid, callback){

   	db.get().collection('reports').find({ 
   		"reported_rid" : new mongodb.ObjectId(rid), 
   	})
   	.toArray(function (err, result) {

   		if (err) 
   			console.log(err)

   		if (result.length == 0) {
   			callback(false) 

   		} else {
   			callback(true)    		
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
    console.log(err)
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