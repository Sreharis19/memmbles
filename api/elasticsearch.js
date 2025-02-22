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
 		var users = db.get().collection('users')
 		users.aggregate().toArray(function(err, result){
 			if(err){
 				console.log(err)      
 				throw err
 			}
 		//console.log("result",result)
      var c=0
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


   function addToElasticSearch(userData){

   var data = {
      first_name : userData.name.first,
      last_name : userData.name.last,
      email : userData.email,
      image : userData.profile_image.thumbnail.small 
   }

   request.put(config.get('updateProfileImageElasticSearchUrl')+userData._id+'/_create',
      { json :  data }, function(err, response){
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