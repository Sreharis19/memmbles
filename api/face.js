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
var PythonShell = require('python-shell')
var fs = require('fs')
var app = express()
var moment = require('moment')

var AWS = require('aws-sdk')

const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
})

var processedCount = 0
var totalCount = -1
/**
 * @database
 * @desc Connect to mongodb server
 *
 */
 function GetFacePackage() {};

 GetFacePackage.prototype.startProcess = function() {
  db.connect('mongodb://52.42.239.43:27017/memmbles', function (err) {
    if(err) {
      console.log('Error establishing database connection')
      console.log(err)
      process.exit(1)
    }else{
      console.log('connection established')
      var config_data = db.get().collection('config_data')
      config_data.find().toArray(function(err, result){
        if(err){
          console.log(err)      
          throw err
        }
        console.log("config_data",result)
        var end =new moment()
        console.log("end",end)
        var start = result[0].last_executed
        console.log("start",start)
        var duration = moment.duration(end.diff(start));
        var diff_hours = duration.get('hours');
        var diff_minutes = duration.get('minutes');
        for(i=1;i<=24;i++){
          if(i==diff_hours){
            diff_minutes=i*60+diff_minutes
          }
          else{
            diff_minutes= diff_minutes
          }

        }
        console.log("diff_hours",diff_hours)
        console.log("diff_minutes",diff_minutes)
        if(diff_minutes >= result[0].delay ){
          console.log("inside if")
          GetFacePackage.prototype.faceCollection(result[0].batch)
          var ldate =new Date()
          config_data.update({"_id":result[0]._id},{
            $set: {
              "last_executed": ldate
            }},function(err, result) {
              if (err)
                console.log(err)
            })
        } else {
          console.log('EXIT--')
          process.exit(1)
        }
      })
    }
  })

}

GetFacePackage.prototype.faceCollection = function(batch) {
 db.connect('mongodb://52.42.239.43:27017/memmbles', function (err) {

  if(err) {
    console.log('Error establishing database connection')
    console.log(err)
    process.exit(1)
  }else{
    console.log('connection established')
    console.log(parseInt(batch))

    var temp_queue = db.get().collection('temp_queue')
    temp_queue.find({
      "is_processed": false
    }).limit(parseInt(batch)).toArray(function(err, result){
      if(err){
        console.log(err)      
        throw err
      }
      console.log("temp_queue",result)
      //result=result[0]
      //totalCount = result.length
      if(result.length == 0) {
        totalCount = result.length
      }
      for(item of result) {
        let pid = new mongodb.ObjectId(item.pid)
        let _id = new mongodb.ObjectId(item._id)
        getFaces(item.file, item.type, pid, _id, result)  
        updateStatus(_id)
      }
      

    //   var processedUserCount = 0
    //   for(user of result) {

    //    processedUserCount++
    //    processUser(user._id)

    //    if(processedUserCount == result.length) {
    //     // all users processed, exit
    //    // process.exit(1)
    //   }

    // }

  })

    //process.exit(1)
  }

})



 // check processed count
 setInterval(function() {
  console.log(processedCount+' == '+totalCount)
  if(totalCount != -1) {
   if(processedCount == totalCount) {
        // all users processed, exit
        process.exit(1)
      }      
    }
  }, 1000)

 function getFaces(file, type, pid, temp_id, result) {
  console.log("@@@@@@@@@@@@@@@@@process started@@@@@@@@@@@@@@@@@")
  console.log("file",file)
  console.log("type",type)
  console.log("pid",pid)
  var options = {
    mode: 'text',
    pythonPath: 'python3',
    pythonOptions: ['-u'],
    scriptPath: '/home/ubuntu/faces',
      args: [file.path, type, pid] // full path to the image, image_id
    }

    PythonShell.run('get_faces.py', options, function(err, results) {
      if (err) throw err
        console.log('results', results)
      var output = JSON.parse(results)
      console.log('output++++++++++++++++++++++++', output)
      if(output != null) {
        if(totalCount == -1) {
          totalCount = output.length
        } else {
          totalCount = totalCount + output.length
        }
        output.forEach(function(face) {
          var vector = {
            image_id: new mongodb.ObjectId(face.image_id),
            image_type: face.image_type,
            image_path: face.image_path
          }
          var index = 1
          for (item of face.vector) {
            vector['v_' + index] = item
            index++
          }
          console.log(vector)
          uploadFace(vector, file, temp_id)
        })
      } else {
        if(totalCount == -1) {
          totalCount = result.length
        }
        processedCount++
      }
    })
  }


  function uploadFace(vector, file, temp_id) {

    console.log('upload FACE started..')
    fs.readFile(vector.image_path, function(err, inputBuffer) {
      if (err)
        throw err
      console.log('uploading FACE to S3 bucket...')

      var currentTime = new Date().getTime()
      var encFileName = common.hashString(vector.image_id + ':' + currentTime + ':' + file.name)

      s3.upload({
        Bucket: 'memmbles-dev',
        Key: encFileName,
        ContentType: file.type,
        Body: inputBuffer,
        ACL: 'public-read'
      }, function(err, data) {
        if (err) {
          console.log(err.message)
        } else {
          console.log('Successfully uploaded photo', data)
          vector.image_url = data.Location
          var faces = db.get().collection('faces')
          faces.insertOne(vector, function(err, result) {
            if (err)
              console.log(err)
            console.log('Face data inserted successfully')
            deleteFromQueue(temp_id)
          })
        }
      })
    })
  }
  function updateStatus(temp_id){
   var temp_queue = db.get().collection('temp_queue')
   temp_queue.update({
    "_id": new mongodb.ObjectId(temp_id)
  }, {
    $set: {
      "is_processed": true
    },
    $inc: {
      "re_try": 1
    }
  }, function(err, result) {
    if (err)
      console.log(err)
  })
   console.log("data updated succefully")
 }


 function deleteFromQueue(temp_id){

  var temp_queue = db.get().collection('temp_queue')
  temp_queue.remove({
    _id: new mongodb.ObjectId(temp_id)
  }, function(err, result) {
    if (err)
      console.log(err)
  })
  console.log("data deleted succefully from temp_queue")
  processedCount++
}





function processUser(userId) {

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

  var tags = []
  var processedCount = 0

  for(tag of result) {
    processedCount++
    tags.push(tag._id)

    if(processedCount == result.length) {
      //console.log(tags)
        // Insert tags to user
        updateTags(userId, tags)
      }
    }

    //console.log(result)
  })

}


function updateTags(userId, tags) {

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
  })

}
}



module.exports = new GetFacePackage()

GetFacePackage.prototype.startProcess()
