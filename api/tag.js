/**
* @file 
* @desc Tag CRON
* @author Deepak
* @date 11 Aug 2017
*
*/

var express = require('express')
var common = require('./functions/common.js')
var db = require('./database/mongodb.js')
var mongodb = require('mongodb')

var app = express()
var processedUsers = 0


/**
 * @database
 * @desc Connect to mongodb server
 *
 */
 db.connect('mongodb://52.42.239.43:27017/memmbles', function (err) {

 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
    console.log('connection established')

    var users = db.get().collection('users')
    users.find({}).toArray(function(err, result){
      if(err){
        console.log(err)      
        throw err
      }

      var processedUserCount = 0
      for(user of result) {

       processedUserCount++
       processUser(user._id, result.length)

       if(processedUserCount == result.length) {
        // all users processed, exit
       // process.exit(1)
     }

   }

 })

    //process.exit(1)
  }

})


 function processUser(userId, totalUsers) {

  var userId = new mongodb.ObjectId(userId)
  var memmbles = db.get().collection('memmbles')

  memmbles.aggregate(
    [
    { $match: {
     $or: [
     { 
      "album.user_id": userId 
    },
    { 
      "likes": userId 
    }
    ]
  }
},
{
  $unwind: "$tags" 
},
{
  "$group" : {
    _id: "$tags",
    count: {
      $sum:1
    }
  }
},
{ $sort: {
  count: -1
}
},
{ 
  $limit : 25
}
]).toArray(function(err, result){
  if(err){
    console.log(err)      
    throw err
  }

  processedUsers++

  var tags = []
  var processedCount = 0

  for(tag of result) {
    processedCount++
    tags.push(tag._id)

    if(processedCount == result.length) {
      //console.log(tags)
        // Insert tags to user
        updateTags(userId, tags, processedUsers, totalUsers)
      }
    }

    if(result.length == 0) {
      exitProcess(processedUsers, totalUsers)
    }

    //console.log(result)
  })

}


function updateTags(userId, tags, processedUsers, totalUsers) {

  console.log('userId '+userId)
  console.log(tags)

  var users = db.get().collection('users')
  users.update({
    "_id" : userId 
  },{
    $set : { 
      "tags": tags
    } 
  } , function(err, result) {
    if(err)
      console.log(err)
    //
    exitProcess(processedUsers, totalUsers)
    //
  })

}

function exitProcess(processedUsers, totalUsers) {
  console.log('processedUsers', processedUsers)
  console.log('totalUsers', totalUsers)
  if(processedUsers == totalUsers) {
    console.log('EXIT--')
    process.exit(1)
  }
}
