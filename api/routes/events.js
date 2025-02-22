/**
 * @file
 * @desc events
 * @author jins
 * @date 13 Dec 2018
 *
 */

 var express = require('express')
 var router = express.Router()
 var PythonShell = require('python-shell')
 var common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 var db = require('../database/mongodb.js')
 var jwt = require('jsonwebtoken')
 var formidable = require('formidable')
 var fs = require('fs')
 const config = require('config')
 var io = require('socket.io-client')

 var mongodb = require('mongodb')
 var request = require('request')
 const crypto = require('crypto')

 var AWS = require('aws-sdk')
 AWS.config.update({
 	accessKeyId: config.get('s3.access_key'),
 	secretAccessKey: config.get('s3.secret_key'),
 	region: config.get('s3.region')
 })
 const s3 = new AWS.S3({
 	apiVersion: config.get('s3.api_version')
 })
 const sns = new AWS.SNS({
 	apiVersion: config.get('sns.api_version')
 })


 router.get('/', function(req, res){
 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}
 	verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    var followersList = []
    getUserDetails(userId, function(data){
     if(data.following){
      let count = 0
      data.following.forEach(function(frnd) {
       getUserDetails(frnd, function(data1){
        count = count+1
        delete data1.following
        followersList.push(data1)
        if(count==data.following.length){
         res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'FRIENDS_GET_SUCCESS',
          data: {
           message: 'Friends list get successfully',
           data: followersList										
         }
       }))
       }
     })
     })
    }
  })
  })
 })



router.get('/blistt', function(req, res){
  console.log("hlooooooooooooo")
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    var today = new Date()
    var a1 = {$addFields:{
    today:{$dateFromParts:{year:{$year:today},month:{$month:today},day:{$dayOfMonth:today}}},
    birthdayThisYear:{$dateFromParts:{year:{$year:today}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}, 
    birthdayNextYear:{$dateFromParts:{year:{$add:[1,{$year:today}]}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}
    }};
    var a2 = {$addFields:{
        nextBirthday:{$cond:[ {$gte:[ "$birthdayThisYear", "$today"]}, "$birthdayThisYear", "$birthdayNextYear"]}
    }};
    var p1 = {$project:{
        name:1, 
        birthday:1, 
        nextBirthday:1,
        daysTillNextBirthday:{$divide:[ 
            {$subtract:["$nextBirthday", "$today"]}, 
            24*60*60*1000  /* milliseconds in a day */
         ]}, 
        _id:1,
        profile_image:1
    }};
    var p0 = {$project:{
        name:1, 
        birthday:1, 
        nextBirthday:1,
        daysTillNextBirthday:1, 
        _id:1,
        profile_image:1
    }};
    var s1 = {$sort:{daysTillNextBirthday:1}};
    var m2 = { $match : {  daysTillNextBirthday : { $lt : 1 } } }
    var m3 = { $match : { $and: [ {daysTillNextBirthday : { $gte : 1 } }, {daysTillNextBirthday : { $lte : 352 } } ] } }
    var m4 = { $match : { $and: [ {daysTillNextBirthday : { $gte : 353 } }, {daysTillNextBirthday : { $lte : 366 } } ] } }

    var user = db.get().collection('users')
    user.aggregate([{"$match":{"_id" : userId}},
    { "$lookup": {
      "from": "users",
      "as": "today",
      "let": { "following": "$following" },
      "pipeline": [{ "$match":
                  { "$expr":
                      { "$in":["$_id","$$following"]
                      }
                  }
              },a1, a2, p1,s1,m2]
    }},
    { "$lookup": {
      "from": "users",
      "as": "recent",
      "let": { "following": "$following" },
      "pipeline": [{ "$match":
                  { "$expr":
                      { "$in":["$_id","$$following"]
                      }
                  }
              },a1, a2, p1,s1,m4]
    }},
    { "$lookup": {
      "from": "users",
      "as": "upcoming",
      "let": { "following": "$following" },
      "pipeline": [{ "$match":
                  { "$expr":
                      { "$in":["$_id","$$following"]
                      }
                  }
              },a1, a2, p1,s1,m3]
    }},
    { "$project": {"upcoming.m0._id":1,"today._id":1, "today.name":1, "today.profile_image":1, "today.birthday":1,"today.daysTillNextBirthday":1,"today.nextBirthday":1,
                  "recent._id":1, "recent.name":1, "recent.profile_image":1, "recent.birthday":1,"recent.daysTillNextBirthday":1,"recent.nextBirthday":1,
                  "upcoming._id":1, "upcoming.name":1, "upcoming.profile_image":1, "upcoming.birthday":1,"upcoming.daysTillNextBirthday":1,"upcoming.nextBirthday":1} 
    }]).toArray(function(err,result){
        console.log(err,result)
        res.status(200).json(common.formatResponse({
                type: 'success',
                code: 'FRIENDS_GET_SUCCESS',
                data: {
                 message: 'Friends list get successfully',
                 data: result                    
               }
             }))
    })
  })
})

 router.get('/blist', function(req, res){
  console.log("hlooooooooooooo")
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    //var today = new Date();
    var m1 = { "$match" : {  "birthday" : { "$exists" : true, "$ne" : '' } } }; 
    var p1 = { 
        "$project" : {
            "_id" : 0,
            "name" : 1,
            "birthday" : 1,
            "profile_image":1,         
            "todayDayOfYear" : { "$dayOfYear" : today }, 
            "dayOfYear" : { "$dayOfYear" : "$birthday" }
        } 
    };
    var p2 = { 
    "$project" : {
        "name" : 1,
        "birthday" : 1,
        "month": {"$month": "$birthday"},
        "profile_image":1,
        "daysTillBirthday" : { "$subtract" : [
             { "$add" : [ 
                     "$dayOfYear",
             { "$cond" : [{"$lt":["$dayOfYear","$todayDayOfYear"]},365,0 ] }
             ] },
             "$todayDayOfYear"
        ] }
    } 
};
// var p3 = {
//   "$in":{
//      following
//   }
// }

// if ( showcase == 'today' ) {
    var m2 = { "$match" : {  "daysTillBirthday" : { "$lt" : 1 } } }; // lt:1 = Today Birthdays
// } else if ( showcase == 'upcoming' ) {
     var m3 = { "$match" : {  "daysTillBirthday" : { "$lt" : 60 } } }; // lt:60 = Next 60 days Upcoming Birthdays 
// } else if ( showcase == 'past' ) {
     var m2 = { "$match" : {  "daysTillBirthday" : { "$gt" : 60 } } }; // gt = Past 60 days Birthdays
     var s1 = {"$sort":{"daysTillBirthday":1}};
// }


var today = new Date();
var a1 = {$addFields:{
    today:{$dateFromParts:{year:{$year:today},month:{$month:today},day:{$dayOfMonth:today}}},
    birthdayThisYear:{$dateFromParts:{year:{$year:today}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}, 
    birthdayNextYear:{$dateFromParts:{year:{$add:[1,{$year:today}]}, month:{$month:"$birthday"}, day:{$dayOfMonth:"$birthday"}}}
}};
var a2 = {$addFields:{
    nextBirthday:{$cond:[ {$gte:[ "$birthdayThisYear", "$today"]}, "$birthdayThisYear", "$birthdayNextYear"]}
}};
var pp = {$project:{
    name:1, 
    birthday:1, 
    nextBirthday:1,
    daysTillNextBirthday:{$divide:[ 
        {$subtract:["$nextBirthday", "$today"]}, 
        24*60*60*1000  /* milliseconds in a day */
     ]}, 
    _id:0
}};
var ss = {$sort:{daysTillNextBirthday:1}};
// var user = db.get().collection('users')
// user.aggregate([m1, p1, p2,s1]).toArray(function(err,result){
var user = db.get().collection('users')
user.aggregate([a1, a2, pp,ss]).toArray(function(err,result){
  console.log(err,result)
  res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'FRIENDS_GET_SUCCESS',
          data: {
           message: 'Friends list get successfully',
           data: result                    
         }
       }))
})

  })
 })



 router.get('/notnum', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId("5c763a944e97e354419b8c50")
var user = db.get().collection('users')
user.aggregate([{"$match":{"_id" : userId}},
{
  $project: {
            _id: 1,
            name: 1,
            profile_image:1,
            chat_history_meta: { $objectToArray: "$chat_history_meta" }
         }
 },
 {
  $project: {
            _id: 0,
            name: 1,
            profile_image:1,
            notiTotal: { $sum: "$chat_history_meta.v" }
         }
 }
   ]).toArray(function(err,result){     
        if(err){
        console.log(err)      
        throw err
      }

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'CARDS_GET_SUCCESS',
        data: {
         message: 'Cards list get successfully',
         data: result                                        
       }
     }))
    })



  })
})

 router.get('/cards', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    db.get().collection('card_images').find().toArray(function(err, result){
      if(err){
        console.log(err)      
        throw err
      }

      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'CARDS_GET_SUCCESS',
        data: {
         message: 'Cards list get successfully',
         data: result                                        
       }
     }))
    })



  })
})


 router.get('/:userId', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(req.params.userId.trim())
    var userIdOrg = new mongodb.ObjectId(decoded.userId)
    getBlockUsers(userIdOrg, function(blist){
    var blockList = blist.notInarray        
    getAllEventsByUser(userId,blockList, function(data){
      var c = 0
      var i = -1
      console.log("dataaaaaaaaa",data)
      if(data.length>0){

        data.forEach(function(event) {
          i++
          getUserDetailsById(event.posted_from,i, function(userInfo,value){

            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",userInfo)
            if (userInfo) {
              data[value]['posted_from_by_name'] = userInfo.name.first + ' ' + userInfo.name.last
              data[value]['posted_from_proImage'] = userInfo.profile_image.thumbnail.small
            } else {
              data[value]['posted_from_by_name'] = ""
              data[value]['posted_from_proImage'] = ""
            }
            c++
            if (c == data.length) {
              res.status(200).json(common.formatResponse({
                type: 'success',
                code: 'EVENTS_GET_SUCCESS',
                data: {
                 message: 'Event list get successfully',
                 data: data                                      
               }
             }))
            }
          })
        })
      }else{
            res.status(200).json(common.formatResponse({
                type: 'success',
                code: 'EVENTS_GET_SUCCESS',
                data: {
                 message: 'Event list get successfully',
                 data: data                                      
               }
             }))
      }
    })
    })
  })
})

 router.post('/', function(req, res){
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    getBlockUsers(userId, function(blist){
    var blockList = blist.notInarray
    // blockList.push(new mongodb.ObjectId("5ba249531ef1f06900a94f63"))
    var newData = []
    if(blockList){
      blockList.forEach((item)=>  newData.push(item.toString()))
    }
    console.log(blockList)
    console.log("blockList.indexOf(userId)",newData.indexOf(req.body.posted_to))
    if(newData.indexOf(req.body.posted_to) == -1){
    var payload = {
      title: req.body.title,
      image: req.body.image,
      video: req.body.video,
      videoThumbnail: req.body.thumbnail||"",
      type: req.body.type,
      posted_to : new mongodb.ObjectId(req.body.posted_to),
      posted_from : userId,
      likes: [],
      comments: [],
      meta_count: {
        likes: 0
      },
      date_created: new Date()
    }
    console.log("payload",payload)
    var events = db.get().collection('events')
    events.insert( payload, function(err, result) {
      if(err)
        res.status(500).json( common.formatResponse({
          type: 'dbError',
          code: 'DB_ERROR',
          data: err
        }))

      pushNotification({
        type: 'birthday_wish_send',
        user_id: userId,
        frnd_user_id: payload.posted_to
      })
      
      if(decoded.userId != req.body.posted_to){
      pushNotification({
        type: 'birthday_wish_received',
        user_id: payload.posted_to,
        frnd_user_id: userId
      })
    }
      res.status(200).json(common.formatResponse({
        type: 'success',
        code: 'WISHES_POSTED_SUCCESS',
        data: {
         message: 'Birthday wishes posted successfully',
         data: {}                                      
       }
     }))
    })
    }
  })
  })
})


 router.put('/', function (req, res) {
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){

    //   if(req.body.children){
    //     req.body.children = []
    //   }
    var events = db.get().collection('events')
    console.log("req.body",req.body)
    // process.exit(1)
    events.update({
      _id: new mongodb.ObjectId(req.body.id)
    }, {$set: {title: req.body.title, image: req.body.image}}, function (err) {
        if (err) return console.error(err);
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'WISHES_UPDATED_SUCCESS',
          data: {
           message: 'Post updated successfully',
           data: {}                                      
         }
       }))
      })
  });
});


  router.delete('/:eventId', function (req, res) {
    // console.log("eventId",eventId)
    // process.exit(1)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
        var eventId = new mongodb.ObjectId(req.params.eventId.trim())


    console.log("eventId",eventId)
    // process.exit(1)
    var events = db.get().collection('events')
        events.remove({
          _id: new mongodb.ObjectId(eventId)
        }, function (err) {
        if (err) return console.error(err);
        res.status(200).json(common.formatResponse({
          type: 'success',
          code: 'WISHES_DELETED_SUCCESS',
          data: {
           message: 'Post deleted successfully',
           data: {}                                      
         }
       }))
      })
  });
});



 function  pushNotification(input) {
  console.log("helllllllllllllllllloooooo")

  var notificationObject = {   
    notification_id: new mongodb.ObjectId(),
    notification_type: input.type,
    user_id: input.user_id ,
    frnd_user_id: input.frnd_user_id,
    is_new: true,
    date_created: new Date()
  }

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.frnd_user_id }, {"password" : 0}).toArray(function(err, result){
    if(err)
      throw err
    notificationObject.image = result[0].profile_image.thumbnail.small
    notificationObject.follower_user_name = result[0].name

      // Add new notification
      users.update(
        {"_id" : notificationObject.user_id
      },{
        $push : { 
          "notifications" :  notificationObject
        },
        $inc : {
          "meta_count.notifications" : 1 
        }
      }, function(err, result) {
        if(err) {
          console.log(err)
        } else {
          console.log('updated')
          console.log(notificationObject)

            // send web socket push   
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', { 
              topic: notificationObject.user_id,
              data: {
                notification: notificationObject
              } 
            })
            

          }
        })
    })
 }
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
 	},{"_id":1,"name":1,"following":1,"birthday":1,"profile_image":1}).toArray(function(err, result){
 		if(err){
 			console.log(err)      
 			throw err
 		}

 		let data = result[0]
 		callback(data)
 	})
 }

 function getUserDetailsById(userId, value,callback){

  db.get().collection('users').find({
    "_id" : userId
  }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result[0]
    callback(data,value)
  })
}

function getAllEventsByUser(userId,blockList, callback){

  db.get().collection('events').find({
    "posted_to" : userId,
    "posted_from" : { $nin : blockList }
  }).sort( { date_created: -1 } ).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result
    callback(data)
  })
}
 /**
 * @method
 * @param {object} res - Response object
 * @param {json} data
 * @return {json}
 * @desc Send Success response
 *
 */
 function sendSuccessResponseTree(data, res){

 	res.status(200).json( common.formatResponse({
 		type: 'success',
 		code: 'TREEMEMMBERS_SUCCESS',
 		data: {
 			message:'Tree Memmbers fetched successfully', 
 			data: { 
 				details : data
 			} 
 		}
 	}))
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
 			data: {} 
 		}
 	}))
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
    callback(data)
  })
}












 module.exports = router