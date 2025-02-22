var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var formidable = require('formidable')
const config = require('config')


var fs = require('fs')

var AWS = require('aws-sdk')
AWS.config.update({
  accessKeyId: config.get('s3.access_key'),
  secretAccessKey: config.get('s3.secret_key'),
  region: config.get('s3.region')
})
const s3 = new AWS.S3({ apiVersion: config.get('s3.api_version')})
const sns = new AWS.SNS({ apiVersion: config.get('sns.api_version')})



router.post('/', function(req, res) {

  console.log('got request')

  console.log(req.body)

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{

    console.log('try')
    console.log(token)

    var decoded = jwt.verify(token, common.getSecret())
    var userId = new mongodb.ObjectId(decoded.userId)
    
    var form = new formidable.IncomingForm()

    var params = {
      "user_id": userId,
      "name" : "",
      "link" : "",
      "gender" : "",
      "tag" : [],
      "interest" : [],
      "any_interest": false,
      "all_location": false,
      "locations": [],
      "age_min": 0,
      "age_max": 0,
      "budget": 0,
      "start": "",
      "end": "",
      "350x250" : "",
      "350x350" : "",
      "450x450" : "",
      "600x450" : "",
      "status": "inactive",
      "approved": false,
      "date_created": new Date() 
    }

    var counter = 0
    var errors = []

    console.log('--image1--')


    form.on('field', function(name, value) {

      console.log('on field--'+name+' : '+value)

      counter++

      switch(name) {
        case 'name' : 
        params.name = value.trim().toLowerCase()
        if(params.name=="undefined"){              
          errors.push({
            param : "name",
            msg : "Please enter a name"
          })
        } 
        break
        case 'link' : 
        params.link = value.trim().toLowerCase()
        if(params.link == "undefined"){              
          errors.push({
            param : "link",
            msg : "Please enter a link"
          })

        }
        break
        case 'gender' : 
        params.gender = value.trim().toLowerCase()
        if(params.gender == "undefined"){              
          errors.push({
            param : "gender",
            msg : "Please enter a gender"
          })
        }
        break
        case 'tag' : 
        if(value != "") {
          params.tag = value.split(",")
        }
        if(params.tag.length == 0){     
          errors.push({
            param : "tag",
            msg : "Please enter atleast one tag"
          })
        }

        break
        case 'any_interest' : 
        params.any_interest = value
        // if(!params.any_interest){              
        //   errors.push({
        //     param : "Any_Interest",
        //     msg : "Please enter interest"
        //   })
        // }
        break

        case 'all_location' : 
        if(value == 'true'){
          params.all_location = true
        }else{
          params.all_location = false
        }
        
        // if(!params.all_location){              
        //   errors.push({
        //     param : "Any_Location",
        //     msg : "Please enter all location"
        //   })
        // }
        break

        case 'location' : 
        params.locations = JSON.parse(value)
        if(!params.locations){              
          errors.push({
            param : "Location",
            msg : "Please enter location"
          })
        }
        break

        case 'interest' : 
        params.interest = value.split(",")
        if(params.interest.length == 0){              
          errors.push({
            param : "interest",
            msg : "Please enter atleast one interest"
          })
        }
        case 'min' : 
        params.age_min = parseInt(value)
        if(params.age_min == 'undefined'){              
          errors.push({
            param : "age_min",
            msg : "Please enter Minimum age limit"
          })
        }
        break
        case 'max' : 
        params.age_max = parseInt(value)
        if(params.age_max == 'undefined'){              
          errors.push({
            param : "age_max",
            msg : "Please enter Maximum age limit"
          })
        }

        if(params.age_max < params.age_min){
          errors.push({
            param : "age_max_min",
            msg : "Maximum age should be greater than minmum age"
          })
        }
        break
        case 'budget' : 
        params.budget = parseFloat(value)
        if(params.budget == 'undefined'){              
          errors.push({
            param : "budget",
            msg : "Please enter the budget"
          })
        }
        if(params.budget<=0){              
          errors.push({
            param : "budget_negative",
            msg : "Please enter a valid budget"
          })
        }
        break
        case 'start' : 
        params.start = new Date(value)
        if(params.start == "undefined"){              
          errors.push({
            param : "start",
            msg : "Please enter start date of Ad"
          })
        }
        break
        case 'end' : 
        params.end = new Date(value)
        if(params.end == "undefined"){              
          errors.push({
            param : "end",
            msg : "Please enter end date of Ad"
          })
        }
        if(params.end < params.start){
          errors.push({
            param : "date_start_end",
            msg : "End date should be greater than Start date"
          })
        }
        break

      }

      console.log("counter: "+counter)
      if (counter == 17) {
        console.log("counter====")
        received(params) 
      }

    })

// every time a file has been uploaded successfully,
    // rename it to it's orignal name

    form.on('file', function(field, file) {

      console.log('file')
      console.log(field)


      var fileType = file.type.split("/")[1]
      var supportedFileTypes = ['jpeg', 'png']

      var fileSize = file.size // in bytes
      var maxAllowedFileSize = config.get('maxAllowedFileSize_advt') // in bytes

      if ( supportedFileTypes.indexOf(fileType) == '-1' ) {

        res.status(400).json( common.formatResponse({
         type: 'error',
         code: 'INVALID_FILE_FORMAT',
         data: {
          message: 'You can upload only JPEG and PNG files',
          data: {
            file: file
          }
        } 
      }))

      }else if(fileSize > maxAllowedFileSize) {

        res.status(400).json( common.formatResponse({
         type: 'error',
         code: 'INVALID_FILE_SIZE',
         data: {
          message: 'Image size cannot exceed '+ Math.floor(maxAllowedFileSize * 0.000001)+' MB',
          data: {
            file: file
          }
        } 
      }))

      }else{      

        fs.readFile(file.path, function(err, data) {

          if(err) {
            throw err
          }else{
           console.log(data)

           console.log("errors")
           console.log(errors)

           if(errors.length > 0) {

             counter++
             if( counter == 17){
              received(params) 
            }

            // res.status(400).json( common.formatResponse({
            //   type: 'validationError',
            //   code: 'BAD_PARAMETERS',
            //   data: errors
            // }))
            // return false
          } else {

           uploadToBucket(data, file, field, function(data, callbackField){
             params[callbackField] = data.Location
             //console.log(params)
             // params.date_created = new Date()
             // params.status = "active"

              // insertToAdCollection(params)
              // sendSuccess()
              counter++

              console.log("counter: "+counter)
              if( counter == 17){
                console.log("counter====")
                received(params) 
              }



            })
         }

       }

     })

      }



    })

    form.parse(req);

  } catch(err){
    res.status(401).json( common.formatResponse({
     type: 'authorizationError',
     code: 'INVALID_TOKEN',
     data: 'User authentication failed'
   }))
    return
  }

  function received(params) {

    console.log("All params received")
    console.log("params")
    console.log(params)

    if(!params.all_location) {
      if((params.locations.country.length + params.locations.state.length + params.locations.city.length) == 0){
       errors.push({
        param : "location",
        msg : "All location or Atlest one location needed"
      })
     }
   }

   if(isNaN(params.age_min)){              
    errors.push({
      param : "age_min",
      msg : "Please enter Minimum age limit"
    })
  }
  if(isNaN(params.age_max)){              
    errors.push({
      param : "age_min",
      msg : "Please enter Maximum age limit"
    })
  }

  if(params.age_max < params.age_min){
    errors.push({
      param : "age_max_min",
      msg : "Maximum age should be greater then minmum age"
    })
  }


  if(params["350x250"] == ""){              
    errors.push({
      param : "350x250",
      msg : "Please upload an image for size 350x250"
    })
  }

  if(params["350x350"] == ""){              
    errors.push({
      param : "350x350",
      msg : "Please upload an image for size 350x350"
    })
  }

  if(params["450x450"] == ""){              
    errors.push({
      param : "450x450",
      msg : "Please upload an image for size 450x450"
    })
  }

  if(params["600x450"] == ""){              
    errors.push({
      param : "600x450",
      msg : "Please upload an image for size 600x450"
    })
  }


  if(isNaN(params.budget)){              
    errors.push({
      param : "budget",
      msg : "Please enter a budget"
    })
  }
  if(params.budget<=0){              
    errors.push({
      param : "budget_negative",
      msg : "Please enter a valid budget"
    })
  }
  console.log("************************************************************************************")

console.log(params.start)
console.log("****************************************************************************************")


  if(params.start == "Invalid Date"){              
    errors.push({
      param : "start",
      msg : "Please enter a valid start date. The field is incomplete or has an invalid start date"
    })
  }

  if(params.end == "Invalid Date"){              
    errors.push({
      param : "end",
      msg : "Please enter a valid end date. The field is incomplete or has an invalid end date"
    })
  }
  if(params.end < params.start){
    errors.push({
      param : "date_start_end",
      msg : "End date should be greater than Start date"
    })
  }
  if(errors.length > 0) {

    res.status(400).json( common.formatResponse({
      type: 'validationError',
      code: 'BAD_PARAMETERS',
      data: errors
    }))
    return
  } else {

    insertToAdCollection(params)
    sendSuccess()

  }

}


function uploadToBucket(inputBuffer, file, field, callback){
  console.log('uploading to S3 bucket...')
  console.log(decoded.userId)

  var currentTime = new Date().getTime()
  var encFileName = 'mems/' + common.hashString( decoded.userId+':'+currentTime+':'+file.name )

  s3.upload({
    Bucket: config.get('s3.bucket'),
    Key: encFileName,
    ContentType: file.type,
    Body: inputBuffer,
    ACL: 'public-read'
  }, function(err, data) {
    if (err) {
      console.log('There was an error uploading your photo: ')
      console.log(err.message)
    } else{
     console.log('Successfully uploaded photo.')
        // console.log(data)   

        callback(data, field)
      }
    })

}

function insertToAdCollection(params){


  var advertisements = db.get().collection('ad_detail')

  advertisements.insertOne(params, function(err, result){
   if(err) 
    console.log(err)

  console.log('image insert id')
  console.log(result.insertedId)
})
}     

// test

function sendSuccess(){

 res.status(200).json( common.formatResponse({
  type: 'success',
  code: 'AD_ADDED_SUCCESS',
  data: {
    message: 'Ad added successfully', 
    data: ""
  }
}))
}

})

router.get('/tags', function(req, res){
  console.log("Got TAG")

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{

    console.log("try")
    var decoded = jwt.verify(token, common.getSecret())


    getTags(function(result){ 
      sendSuccessResponseTag(result, res)
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

function getTags(callback){

  db.get().collection('ads_tags').find({}).sort({"tag" :1})
  .toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result
    callback(data)
  })
}

function sendSuccessResponseTag(data, res){

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'TAG_DETAILS_SUCCESS',
    data: {
      message:'Tags details fetched successfully', 
      data: { 
        details : data
      } 
    }
  }))
}


router.get('/int', function(req, res){
  console.log("Got interest")

  var token = ''
  if(req.headers.authorization) {
    var token = req.headers.authorization.split(" ")[1]
  }

  try{

    console.log("try int")
    var decoded = jwt.verify(token, common.getSecret())


    getAllInterests(function(result){ 
      sendSuccessResponse(result, res)
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

function getAllInterests(callback) {

  db.get().collection('interests').find({})
  .sort({"interest":1})
  .toArray(function(err, result){
    if(err){
      console.log(err)      
      throw err
    }

    let data = result
    callback(data)
  })
}

function sendSuccessResponse(result, res) {

  res.status(200).json( common.formatResponse({
    type: 'success',
    code: 'INTEREST_DETAILS_SUCCESS',
    data: {
      message:'Interest details fetched successfully', 
      data: result
    }
  }))
}

module.exports = router