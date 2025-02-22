/**
* @file 
* @desc Upload Completred 
* @author Deepak
* @date 07 Apr 2017
*
*/

var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var validator = require('../functions/validator.js')
var db = require('../database/mongodb.js')
var bodyParser = require('body-parser')
var io = require('socket.io-client')
const config = require('config')

/**
 * @callback
 * @param {string} message
 * @return {json} success or error message
 *
 */
 router.post('/', function(req, res) {

  console.log('RESIZE_COMPLETED Posted by SNS')
  console.log(req.body)

  //body = JSON.parse( req.body.toString('utf8') )
  let message = req.body//JSON.parse(body)

console.log(message)

  let s3BucketLocation = 'https://'+message.image.bucket+'.s3-'+config.get('s3.region')+'.amazonaws.com/'
  var uploadedFileLocation = s3BucketLocation+message.size.resizedFileName
  console.log(uploadedFileLocation)


  // send web socket push   
  var socket = io.connect(config.get('socket.host')+':'+config.get('socket.port'))
  socket.emit('photo_uploaded', { 
    topic: message.image.userId,
    data: {
      message: message, 
      url: uploadedFileLocation,
      meta: message.size
    } 
  })

    console.log('socket emitted')



 })

 module.exports = router