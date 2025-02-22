/**
* @file 
* @desc Elastic Search Insertion Manually
* @author Jins
* @date 4 October 2019
*
*/

var express = require('express')
var router = express.Router()
var common = require('./functions/common.js')
// var validator = require('../functions/validator.js')
var db = require('./database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var jwt = require('jsonwebtoken')
var request = require('request')
const config = require('config')


/**
 * @method
 * @return {json}
 * @desc Get birthday notification
 */
 function PostElasticSearch() {};

 PostElasticSearch.prototype.startProcess = function(req,res) {
 db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {
 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
 		console.log('connection established')
    var memmbles = db.get().collection('memmbles')
 		memmbles.aggregate().toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}
      console.log("result",result)

 		console.log("result length",result.length)
      //var c=0
      result.forEach(function(doc){
         addToElasticSearch( doc)
         
         // addToElasticSearch( doc ,function(){
         //    c++
         //    console.log(c)
         //    if (c == result.length) {
         // console.log(c+"==="+result.length)
         // console.log("ffffffffffffiiiiiiinished")

         // // res.status(200).json( common.formatResponse({
         // //          type: 'success',
         // //          code: 'ELASTICSEARCH_ADDED_SUCCESS',
         // //          data: {
         // //             message: 'User data added to elastic search successfully' 
                     
         // //          }
         // //       }))
        
         //    }

         // })
         


      })
      





 		})

 	}


   function addToElasticSearch(memmble){

    let memmbleData = {
          memmbleId: memmble._id,
          userId: memmble.album.user_id,
          title: memmble.album.title,
          description: memmble.album.description,
          image: memmble.album.cover_image.thumbnail.medium
        }

   request.put(config.get('memmbleToElasticSearchUrl') + memmbleData.memmbleId + '/_create',
      { json :  memmbleData }, function(err, response){
         if(err){
            console.log("err")
            console.log(err)
         }

         if(response){
            console.log("response")
            console.log(response.body)
         }  
      })
}




})
}
module.exports = new PostElasticSearch()
PostElasticSearch.prototype.startProcess()