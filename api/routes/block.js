/**
 * @file
 * @desc Block module
 * @author Jins
 * @date 22 June 2020
 */

 const express = require('express')
 const router = express.Router()
 const config = require('config')
 const db = require('../database/mongodb.js')
 const common = require('../functions/common.js')
 var validator = require('../functions/validator.js')
 const mongodb = require('mongodb')
 var jwt = require('jsonwebtoken')


/**
 * @POST
 * @desc Block a user
 **/
 router.post('/block', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    validator.validateData('block', req);
    var errors = req.validationErrors()
    if(errors) {

      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
    var block_user_id = new mongodb.ObjectId(req.body.block_user_id)
    var user = db.get().collection('users')
    user.find({
      _id: block_user_id
    }).toArray(function(err, result) {
      if(result){
       isAlreadyBlocked(userId, block_user_id, function(result){
        if(result){

          updateUserDoc(userId, block_user_id, function(output){

           updateBlockUserDoc(userId, block_user_id, function(output){

            removeUserPost(userId, block_user_id, function(output){
            })

            removeUserPost(block_user_id, userId, function(output){
            })

            removeTagsAndLikes(userId, block_user_id, function(output){
            })

            removeTagsAndLikes(block_user_id, userId, function(output){
            })

            getUserMemmbles(userId,function(memIds){
              removeComments(block_user_id,memIds, function(output){
              })
            })

            getUserMemmbles(block_user_id,function(memIds){
              removeComments(userId,memIds, function(output){
              })
            })

            userFollowStatus(userId, block_user_id, function(output){ 
              console.log(output.hasfollowing)
              if(output.hasfollowing){
                removeUserFromFollowingList(userId,block_user_id,function(data){
                  console.log("removeUserFromFollowingList1 ",data)
                })
              }
              if(output.hasfollower){
                removeUserFromFollowerList(userId,block_user_id,function(data){
                  console.log("removeUserFromFollowerList1 ",data)
                })
              }

            })

            userFollowStatus(block_user_id, userId, function(output){ 
              console.log(output.hasfollowing)
              if(output.hasfollowing){
                removeUserFromFollowingList(block_user_id,userId,function(data){
                  console.log("removeUserFromFollowingList2 ",data)

                })
              }
              if(output.hasfollower){
                removeUserFromFollowerList(block_user_id,userId,function(data){
                  console.log("removeUserFromFollowerList2 ",data)

                })
              }

            })          

            res.status(200).json(common.formatResponse({
              type: 'success',
              code: 'BLOCK_USER_POST_SUCCESS',
              data: {
                message: "You have successfully blocked this account"
              }
            }))
          })
         })

        }
        else{
          res.status(200).json(common.formatResponse({
            type: 'error',
            code: 'BLOCK_USER_POST_ERROR',
            data: 'You have already blocked this account'
          }))
        }
      })
     }else{
      if(typeof errors === "boolean"){
        errors=[]
      }
      errors.push({ param: 'block_user_id',
        msg: 'Invalid block user id, no matching records found',
        value: req.body.block_user_id })
      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
  })


  })

})




/**
 * @POST
 * @desc UNBLOCK USER POST
 **/
 router.post('/unblock', function(req, res) {
  console.log(req.body)
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    validator.validateData('block', req);
    var errors = req.validationErrors()
    if(errors) {

      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
    var block_user_id = new mongodb.ObjectId(req.body.block_user_id)
    var user = db.get().collection('users')
    user.find({
      _id: block_user_id
    }).toArray( function(err, result) {
      console.log(err,result)
      if(result){
       isAlreadyBlocked(userId, block_user_id, function(result){
        console.log(result)
        if(!result){
          updateUserDocPull(userId, block_user_id, function(output){

           updateBlockUserDocPull(userId, block_user_id, function(output){

            res.status(200).json(common.formatResponse({
              type: 'success',
              code: 'UNBLOCK_USER_POST_SUCCESS',
              data: {
                message: "You have successfully unblocked this account"
              }
            }))
          })
         })
        }
        else{
          res.status(200).json(common.formatResponse({
            type: 'error',
            code: 'UNBLOCK_USER_POST_ERROR',
            data: 'Sorry, The user is not in your Blocklist'
          }))
        }
      })
     }else{
      if(typeof errors === "boolean"){
        errors=[]
      }
      errors.push({ param: 'block_user_id',
        msg: 'Invalid block user id, no matching records found',
        value: req.body.block_user_id })
      res.status(400).json( common.formatResponse({
        type: 'validationError',
        code: 'BAD_PARAMETERS',
        data: errors
      }))
      return
    }
  })

  })

})



/**
 * @POST
 * @desc BLOCKED USERS LIST
 **/
 router.get('/blockList', function(req, res) {
  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }
  verifyToken(token, res, function(decoded){
    var userId = new mongodb.ObjectId(decoded.userId)
    var user = db.get().collection('users')
    user.find({
      _id: userId
    },{_id:0,"blocked_users":1}).toArray(function(err,result){
      console.log(err,result)
      var c = 0
      var i = -1
      var data = []
      if(result[0].blocked_users){
      if(result[0].blocked_users.length){
        console.log("result[0].blocked_users",result[0].blocked_users)
        result[0].blocked_users.forEach((blockId)=>{
          console.log(blockId)
          i++
          getUserDetailsById(blockId,i, function(userInfo,value){
            console.log("userInfo",userInfo)
            data.push(userInfo)
            c++
            if (c == result[0].blocked_users.length) {
             res.status(200).json(common.formatResponse({
              type: 'success',
              code: 'BLOCK_USER_LIST_SUCCESS',
              data: {
                message: "Block list get successfully ",
                data: data
              }
            }))

           }        

         })

        })

      }else{
            // send response
            res.status(200).json(common.formatResponse({
              type: 'success',
              code: 'BLOCK_USER_LIST_SUCCESS',
              data: {
                message: "Empty block list",
                data: ""
              }
            }))

          }
    }else{
            // send response
            res.status(200).json(common.formatResponse({
              type: 'success',
              code: 'BLOCK_USER_LIST_SUCCESS',
              data: {
                message: "Empty block list",
                data: ""
              }
            }))

          }

        })


  })

})


/**
 * @method
 * @param {string} userId - Request Object
 * @param {function} callback
 * @desc get user details by id
 *
 */

 function getUserDetailsById(userId, value,callback){

  db.get().collection('users').find({
    "_id" : new mongodb.ObjectId(userId)
  },{"name": 1,"profile_image":1 }).toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result[0]
    callback(data,value)
  })
}

/**
 * @method
 * @param {json} param - Request Object
 * @param {function} callback
 * @desc check the user is in blocked list
 *
 */

 function isAlreadyBlocked(userId,block_user_id,callback){

  var user = db.get().collection('users')
  user.find({
    _id: userId,
    blocked_users: { $in: [block_user_id] },
  })
  .count((err,count)=>{
    if(count==1){
        callback(false)//user is in blocked list
      }else{
        callback(true)// user not in blocked list
      }

    });
}

/**
   * @method
   * @param {ObjectId} userId  
   * @param {ObjectId} followUserId 
   * @collection  users 
   * @desc Remove the followUserId from following list and decrement Following count of the Logged In User
   * @return {json} error
   * @return {boolean} true - if success 
   *
   */

   function removeUserFromFollowingList(userId, followUserId,callback){

    db.get().collection('users').update({
      "_id" : userId
    },{
      $pull : { 
        "following" : followUserId
      },
      $inc : { "meta_count.following" : -1 }   
    }, function(err, result){

      if(err){
        console.log(err)
      }else{        
        callback(true)
      }
    })

  }

  function removeUserFromFollowerList(userId, followUserId,callback){

    db.get().collection('users').update({
      "_id" : userId
    },{
      $pull : { 
        "followers" : followUserId
      },
      $inc : { "meta_count.followers" : -1 }   
    }, function(err, result){

      if(err){
        console.log(err)
      }else{        
        callback(true)
      }
    })

  }

function userFollowStatus(userId,block_user_id,callback){
   var user = db.get().collection('users')
   user.aggregate([{"$match":{"_id" : userId}},
   {
    $project: {
      "hasfollowing" : {
        $in: [block_user_id, "$following"]
      },
      "hasfollower" : {
        $in: [block_user_id,"$followers"]
      }
    }
  }

  ]).toArray(function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(result[0])
    }

  })
}

function updateBlockUserDoc(userId,block_user_id,callback){
  var user = db.get().collection('users')
  user.update({
    "_id" : block_user_id
  },{
    $push : { 
      "blocked_by" : userId
    }
  }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}

function updateBlockUserDocPull(userId,block_user_id,callback){
  var user = db.get().collection('users')
  user.update({
    "_id" : block_user_id
  },{
    $pull : { 
      "blocked_by" : userId
    }
  }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}

function updateUserDoc(userId,block_user_id,callback){
  var user = db.get().collection('users')
  user.update({
    "_id" : userId
  },{
    $push : { 
      "blocked_users" : block_user_id
    }
  }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}


function updateUserDocPull(userId,block_user_id,callback){
  var user = db.get().collection('users')
  user.update({
    "_id" : userId
  },{
    $pull : { 
      "blocked_users" : block_user_id
    }
  }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}


function removeUserPost(userId,block_user_id,callback){
  var events = db.get().collection('events')
  events.remove({
      posted_to: userId,
      posted_from: block_user_id
    }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}


function removeTagsAndLikes(userId,block_user_id,callback){
  var memmbles = db.get().collection('memmbles')
  
      memmbles.findOneAndUpdate(
        {"album.user_id": userId ,"likes": { $elemMatch: { $eq: block_user_id } } },
        { $inc: {"album.meta_count.likes": -1} },
        { multi: true }, function(err, result){
          if(err){
            console.log(err)
          }else{ 
            memmbles.update(
              {"album.user_id": userId },
              { $pull: { "album.people":  block_user_id.toString(), "likes": block_user_id }},
              { multi: true }, function(err, result){
              if(err){
                console.log(err)
              }else{ 

                callback(true)
              }
            })
          }
  })
}

function removeComments(block_user_id,memIds,callback){
  var comments = db.get().collection('comments')
  comments.remove({
    "author.user_id": block_user_id,
    "memmble_id": { $in: memIds}
    }, function(err, result){
    if(err){
      console.log(err)
    }else{ 
      callback(true)
    }

  })
}


function getUserMemmbles(userId, callback) {

  var memmbles = db.get().collection('memmbles')
  memmbles.find({
    "album.user_id": userId
  },{"_id" : 1}).toArray(function(err, result) {
    if (err) {
      console.log(err)
      throw err
    }
    var details = result
    callback(details)
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