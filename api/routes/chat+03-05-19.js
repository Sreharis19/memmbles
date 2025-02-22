/*
 * @file
 * @desc Chat - Invite/ Block/ Unblock 
 * @author Deepak
 * @date 27 Oct 2017
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
 const config = require('config')


/**
 * @method
 * @return {json} Success or error message
 * @desc Follow/Unfollow a User
 */
 router.post('/', function(req, res){

 	var token = ''
 	if(req.headers.authorization) {
 		var token = req.headers.authorization.split(" ")[1]
 	}

 	verifyToken(token, res, function(decoded){

 		//req.body = common.trim(req.body)

    var userId = new mongodb.ObjectId(decoded.userId) 
    var inviteUserId = new mongodb.ObjectId(req.body.to) 

    switch(req.body.action) {

      case 'invite': 			
      invite(userId, inviteUserId, res)
      break
      case 'share':      
      share(userId, inviteUserId, res)
      break

      case 'block': 			
      block(userId, inviteUserId, res)
      break

      case 'unblock':        
      unblock(userId, inviteUserId, res)
      break

      case 'accept':        
      accept(userId, inviteUserId, res)
      break
      case 'tree-accept':        
      acceptShare(userId, inviteUserId, res)
      break
      case 'reject':        
      reject(userId, inviteUserId, res)
      break

      case 'save':
      saveFrom(userId, req.body.payload, inviteUserId, res)
      saveTo(userId, req.body.payload, inviteUserId, res)
      break

      case 'seen_status':
      updateSeenStatus(req.body.from, req.body.to, res)
      break

      case 'history':
      getHistory(userId, inviteUserId, req.body.offset, req.body.limit, res)
      break
    }
  })

 })


 function getHistory(from, to, offset, limit, res) {


   db.get().collection('chat_history').find({
    $or: [
    {
     $and: [
     { "from": to },
     { "to": from }
     ] 
   },
   {
     $and: [
     { "from": from },
     { "to": to }
     ] 
   }
   ]
 }
 )
   .sort({"server_time" : -1})
 //.skip( db.get().collection('chat_history').count()  - offset)
 .skip(+offset)
 .limit(+limit)
 .toArray(function(err, result){
  if(err){
   console.log(err)      
   throw err
 }

 console.log('========result=======')
 console.log(result)

 res.status(200).json( common.formatResponse({
   type: 'success',
   code: 'CHAT_HISTORY_SUCCESS',
   data: {
    message: "Chat history fetched",
    data: {
     history: result,
     from: from,
     to: to
   }
 }
}))

})



      // db.get().collection('users').find({ 
      //    "_id" : userId, 
      //    "chat_friends.user_id" : inviteUserId
      // })
      // .toArray(function (err, result) {

      //   if(err){
      //    console.log(err)      
      //    throw err
      // }
      // var data = result[0]

      // data.chat_history_data.sort(function(a, b) {
      //    return new Date(b.server_time) - new Date(a.server_time)
      // })

      // })

    }

    function updateSeenStatus(from, to, res) {

      console.log('---updateSeenStatus---')
      console.log('from: '+from)
      console.log('to: '+to)
      console.log('------------')

      var counter = {}
   var field = 'chat_history_meta.'+to // deepak.as
   counter[field] = 0

   var from = new mongodb.ObjectId(from) 
   var to = new mongodb.ObjectId(to) 

   console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",counter)

   var users = db.get().collection('users')

 var chat_history = db.get().collection('chat_history')
  


   users.update(
      {"_id" : from // deepak.reubro
    },{
      $set : counter
    }, function(err, result) {

      if(err) {
       console.log(err)
     } else {
       console.log('updated')


         
        db.get().collection('chat_history').find({
   "to" : from ,"tick_status": "twotick"
 }).toArray(function(err, result1){

  console.log("++++++++++++++++++++++++++++++++++++++++++++++",result1)
  if(result1){
    result1.forEach(function(doc){

      console.log("doc*************************",doc)
      db.get().collection('chat_history').update({
     "_id":doc._id
    },{
      $set: {
        "tick_status" :"bluetick"
      }
    }, function(err) {          

    })

  })

  }
  


})
  //      chat_history.find(
  //     {"to" : from ,"tick_status": "twotick"// deepak.reubro
  //   },{
  //     $set : {"tick_status": "bluetick"}
  //   }, function(err, result) {

  //      if(err) {
  //      console.log(err)
  
  //   } else {      
  //     console.log('inserted+++++++++++++++++++++++++++++',result)  
  //   }
  // })

       res.status(200).json( common.formatResponse({
        type: 'success',
        code: 'CHAT_SEEN_STATUS_SUCCESS',
        data: 'Chat seen status updated'
      }))

     }

   })
 }


 function insertToChatHistory(payload) {

  var chat_history = db.get().collection('chat_history')
  chat_history.insertOne( payload, function(err, result){
    if(err) {
      console.log(err)
    } else {      
      console.log('inserted')  
    }
  })

}


function saveTo(userId, payload, inviteUserId, res) {
  console.log("(((((((((((((((((((((((((((((((((((     save to  ))))))))))))))))))))))))))))))))))))))))))))")

  payload.from = new mongodb.ObjectId(payload.from)
  payload.to = new mongodb.ObjectId(payload.to)
  payload.server_time = new Date()
  payload.tick_status = payload.tick_status

  var inc = {}
  var field = 'chat_history_meta.'+payload.from
  inc[field] = 1
  
  db.get().collection('users').find({
   "_id" : payload.to
 }).forEach(function(doc) {

  console.log(doc)

  doc.chat_friends.map(function(n) {

   let uId = n.user_id.toString()
   let iId = payload.from.toString()

   console.log(uId+"=="+iId) 

   if(uId === iId) {
     console.log(n.is_blocked) 
     if(n.is_blocked == false){
      insertToChatHistory(payload)

    }
  }
})


})


   //insertToChatHistory(payload)

   var users = db.get().collection('users')
   users.update(
    {"_id" : payload.to
  },{
      // $push : { 
      //    "chat_history_data" :  payload
      // },
      $inc : inc
    }, function(err, result) {

      if(err) {
       console.log(err)
     } else {
       console.log('updated')
       console.log(payload)

       res.status(200).json( common.formatResponse({
        type: 'success',
        code: 'CHAT_SAVE_SUCCESS',
        data: 'Chat has been saved'
      }))

     }

   })
 }


 function saveFrom(userId, payload, inviteUserId, res) {
  console.log("(((((((((((((((((((((((((((((((((((     save from  ))))))))))))))))))))))))))))))))))))))))))))")

  payload.from = new mongodb.ObjectId(payload.from)
  payload.to = new mongodb.ObjectId(payload.to)
  payload.server_time = new Date()
  payload.tick_status = payload.tick_status


  var inc = {}
  var field = 'chat_history_meta.'+payload.to
  inc[field] = 1

  console.log(payload)


  db.get().collection('users').find({
   "_id" : payload.to
 }).forEach(function(doc) {

   doc.chat_friends.map(function(n) {

     let uId = n.user_id.toString()
     let iId = payload.from.toString() 
     console.log(uId+"=="+iId) 

     if(uId === iId) { 
       console.log(n.is_blocked) 
       
       if(n.is_blocked == false){
        getNotification(userId,inviteUserId)

        insertToChatHistory(payload)

      }
    }
  })


 })

 // var notificationObject = {   
 //   notification_id: new mongodb.ObjectId(),
 //   notification_type: "chat_message",
 //   user_id: user_id ,
 //   invite_user_id: inviteUserId,
 //   is_new: true,
 //   date_created: new Date()
 // }
 // var users = db.get().collection('users')


 // users.find({ "_id" : notificationObject.user_id }, {"password" : 0}).toArray(function(err, result){
 //  if(err)
 //   throw err
 // notificationObject.image = result[0].profile_image.thumbnail.small
 // notificationObject.user_name = result[0].name



 //            // send web socket push   
 //            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
 //            socket.emit('push_notification', { 
 //              topic: notificationObject.invite_user_id,
 //              data: {
 //               notification: notificationObject
 //             } 
 //           })
 

 //          })
  //insertToChatHistory(payload)
/*
   var users = db.get().collection('users')
   users.update(
      {"_id" : payload.from
   },{
      // $push : { 
      //    "chat_history_data" :  payload
      // },
    //  $inc : inc
 }, function(err, result) {

   if(err) {
      console.log(err)
   } else {
      console.log('updated')
      console.log(payload)

         // res.status(200).json( common.formatResponse({
         //    type: 'success',
         //    code: 'CHAT_SAVE_SUCCESS',
         //    data: 'Chat has been saved'
         // }))

      }

   })
   */
 }

 function getNotification(userId,inviteUserId){

  var notificationObject = {   
   notification_id: new mongodb.ObjectId(),
   notification_type: "chat_message",
   user_id: userId ,
   invite_user_id: inviteUserId,
   is_new: true,
   date_created: new Date()
 }
 var users = db.get().collection('users')


 users.find({ "_id" : notificationObject.user_id }, {"password" : 0}).toArray(function(err, result){
  if(err)
   throw err
 notificationObject.image = result[0].profile_image.thumbnail.small
 notificationObject.user_name = result[0].name



            // send web socket push   
            var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
            socket.emit('push_notification', { 
              topic: notificationObject.invite_user_id,
              data: {
               notification: notificationObject
             } 
           })
            

          })

}

function invite(userId, inviteUserId, res) {

 console.log('inside invite')

 checkAlreadyFriends(userId, inviteUserId, function(result) {

  if (result) {
   res.status(200).json( common.formatResponse({
    type: 'error',
    code: 'USER_ALREADY_CHAT_FRIEND',
    data: 'You are already a friend of this person'
  }))
   return
 } else{

   console.log('else')

   checkAlreadyInvited(userId, inviteUserId, function(result) {

    console.log('checkAlreadyInvited')
    console.log(result)

    if (result) {
      res.status(200).json( common.formatResponse({
       type: 'error',
       code: 'CHAT_USER_ALREADY_INVITED',
       data: 'You are already invited this person'
     }))
      return
    } else{

      console.log('else---')

      var data = {
        "code" : "CHAT_INVITE_SUCCESS",
        "message" : "Invitation has been sent"
      }

      pushNotification({
        type: 'chat_invite',
        user_id: userId,
        invite_user_id: inviteUserId
      })
      sendSuccessResponse(data, res)
    }
  })

 }
})
}


function share(userId, inviteUserId, res) {

 console.log('inside share')



 




 var data = {
  "code" : "TREE_SHARE_SUCCESS",
  "message" : "share tree has been sent"
}

pushNotification({
  type: 'tree_share',
  user_id: userId,
  invite_user_id: inviteUserId
})
sendSuccessResponse(data, res)





}

function accept(userId, inviteUserId, res) {

 console.log('----------checkAlreadyFriends----------')
 console.log('userId: '+userId)
 console.log('inviteUserId: '+inviteUserId)

 checkAlreadyFriends(userId, inviteUserId, function(result) {
  console.log('----------result----------')
  console.log(result)
  if (!result) {
   addToFreindsList(userId, inviteUserId, function(response) { })
 }
})

 checkAlreadyFriends(inviteUserId, userId, function(result) {
  if (!result) {
   addToFreindsList(inviteUserId, userId, function(response) { })
 }
})


 removeAcceptedNotification(userId, inviteUserId)

 pushNotification({
  type: 'chat_invite_accepted',
  user_id: userId,
  invite_user_id: inviteUserId
})

 pushNotification({
  type: 'chat_invite_accepted_by_user',
  user_id: inviteUserId,
  invite_user_id: userId
})

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'CHAT_INVITE_ACCEPTED_SUCCESS',
  data: 'Chat invitaion has been accepted'
}))
}



function acceptShare(userId, inviteUserId, res) {




 checkAlreadyInSharedList(userId, inviteUserId, function(result) {
  console.log('----------result----------')
  console.log(result)
  if (!result) {
   addToShareList(userId, inviteUserId, function(response) { })
 }
})
 

 checkAlreadyInSharedList(inviteUserId, userId, function(result) {
  if (!result) {
   addToShareList(inviteUserId, userId, function(response) { })
 }
})


 removeAcceptedNotification(userId, inviteUserId)

 pushNotification({
  type: 'chat_invite_accepted',
  user_id: userId,
  invite_user_id: inviteUserId
})

 pushNotification({
  type: 'chat_invite_accepted_by_user',
  user_id: inviteUserId,
  invite_user_id: userId
})

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'CHAT_INVITE_ACCEPTED_SUCCESS',
  data: 'Chat invitaion has been accepted'
}))
}

function reject(userId, inviteUserId, res) {

 pushNotification({
  type: 'chat_invite_rejected',
  user_id: userId,
  invite_user_id: inviteUserId
})
}

function addToFreindsList(userId, inviteUserId, callback) {

 console.log('_id: '+ userId)
 console.log('user_id: '+ inviteUserId)

 db.get().collection('users').update({
  "_id" : userId
},{
  $push : { 
   "chat_friends" : {
    user_id: inviteUserId,
    is_blocked: false
  }
}
}, function(err, result){

  if(err){
   console.log(err)
 }else{            
   callback(true)
 }
})

}

function addToShareList(userId, inviteUserId, callback) {

 console.log('_id: '+ userId)
 console.log('user_id: '+ inviteUserId)

 db.get().collection('users').update({
  "_id" : userId
},{
  $push : { 
   "tree-memmbers" : {
    user_id: inviteUserId
  }
}
}, function(err, result){

  if(err){
   console.log(err)
 }else{            
   callback(true)
 }
})

}


function block(userId, inviteUserId, res) {


 db.get().collection('users').find({
   "_id" : userId
 }).forEach(function(doc) {

   doc.chat_friends.map(function(n) {

     let uId = n.user_id.toString()
     let iId = inviteUserId.toString() 

     if(uId === iId) { n.is_blocked = true }
   })

   db.get().collection('users').update({
    "_id" : userId
  },{
    $set: {
     "chat_friends" : doc.chat_friends
   }
 }, function(err, count, updateResult) {          

 })

 })

 res.status(200).json( common.formatResponse({
   type: 'success',
   code: 'CHAT_USER_BLOCKED_SUCCESS',
   data: {
    message: 'User has been blocked successfully', 
    data: {
     userId: inviteUserId.toString()
   }
 }
}))

}



function unblock(userId, inviteUserId, res) {


 db.get().collection('users').find({
   "_id" : userId
 }).forEach(function(doc) {

   doc.chat_friends.map(function(n) {

     let uId = n.user_id.toString()
     let iId = inviteUserId.toString() 

     if(uId === iId) { n.is_blocked = false }
   })

   db.get().collection('users').update({
    "_id" : userId
  },{
    $set: {
     "chat_friends" : doc.chat_friends
   }
 }, function(err, count, updateResult) {          

 })

 })

 res.status(200).json( common.formatResponse({
   type: 'success',
   code: 'CHAT_USER_UNBLOCKED_SUCCESS',
   data: {
    message: 'User has been unblocked successfully', 
    data: {
      userId: inviteUserId.toString()
    }
  }
}))

}


function  pushNotification(input) {

  var notificationObject = {   
   notification_id: new mongodb.ObjectId(),
   notification_type: input.type,
   user_id: input.user_id ,
   invite_user_id: input.invite_user_id,
   is_new: true,
   date_created: new Date()
 }

   // Get user details
   var users = db.get().collection('users')

   users.find({ "_id" : notificationObject.user_id }, {"password" : 0}).toArray(function(err, result){
    if(err)
     throw err
   notificationObject.image = result[0].profile_image.thumbnail.small
   notificationObject.user_name = result[0].name

      // Add new notification
      users.update(
       {"_id" : notificationObject.invite_user_id
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
              topic: notificationObject.invite_user_id,
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
   * @param {ObjectId} inviteUserId 
   * @collection  users 
   * @desc Check if the user is already a chat friend of the person
   * @return {boolean} - TRUE if already a chat friend
   *
   */
   function checkAlreadyFriends(userId, inviteUserId, callback){

   	db.get().collection('users').find({ 
   		"_id" : userId, 
   		"chat_friends.user_id" : inviteUserId
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

   function checkAlreadyInSharedList(userId, inviteUserId, callback){

    db.get().collection('users').find({ 
      "_id" : userId, 
      "tree-memmbers.user_id" : inviteUserId
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


  function removeAcceptedNotification(userId, inviteUserId) {

    console.log('--removeAcceptedNotification--')

    db.get().collection('users').find({
     "_id" : userId
   }).forEach(function(doc) {

     doc.notifications.map(function(n) {

       let uId = n.user_id.toString()
       let iId = inviteUserId.toString() 
       let uUserId = userId.toString()

       console.log(iId +'==='+ uId +'&&'+ n.notification_type +'== "chat_invite"') 

       if(iId === uId && n.notification_type == "chat_invite") {

        console.log('====MATCH FOUND====')

        db.get().collection('users').update({"_id" : userId },
        { 
         $pull: { 
           notifications: {
             notification_id: n.notification_id
           }
         } 
       }, function(err, result) {
        if(err) {
          console.log(err)
        }else{
          console.log('notifcation deleted')
        }

      })


      }

    })
   })
 }


 function checkAlreadyInvited(userId, inviteUserId, callback) {

   var hasAlreadyInvited = false

   db.get().collection('users').find({
    "_id" : inviteUserId
  }).forEach(function(doc) {

    console.log('eachhhh')

    var total = doc.notifications.length
    var currentLength = 0

    doc.notifications.map(function(n) {

      console.log('notuiii')

      currentLength++

      let uId = n.user_id.toString()
      let iId = inviteUserId.toString() 
      let uUserId = userId.toString()

      if(uUserId === uId && n.notification_type == "chat_invite") {
        hasAlreadyInvited = true 
      }

      if(currentLength == total) {
        if(hasAlreadyInvited) {
         callback(true)
       }else{
         callback(false)
       }
     }

   })


    if(total == 0) {
      callback(false)
    }

  })

  //callback(false)

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


 module.exports = router