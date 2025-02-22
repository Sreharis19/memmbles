// Model
var Person = require('./person.model');
var _ = require('underscore');
var express = require('express')
var router = express.Router()
var common = require('../functions/common.js')
var jwt = require('jsonwebtoken')
var db = require('../database/mongodb.js')
var mongodb = require('mongodb')


//module.exports = function (app) {
  // select all
  router.get('/persons', function (req, res) {


    var token = ''
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){
      db.get().collection('users').find({ "_id" : new mongodb.ObjectId(decoded.userId) }, {"password" : 0}).toArray(function(err, result){
        console.log("hliiooooooo",decoded)

        Person.find({"familyId": result[0].familyShareId})
        .populate('parent')
        .lean()
        .exec()
        .then(
          persons => {
            console.log("-------------------------")
            console.log(persons)
            console.log("-------------------------")

            return res.json(persons)
          }
          )
        .catch(err => {
          return console.log(err);
        })

      // db.get().collection('users').find({
      //   "_id" : new mongodb.ObjectId(decoded.userId)
      // },{
      //   "tree_memmbers": 1
      // })
      // .populate('parent')
      // .lean()
      // .exec()
      // .then(
      //   persons => {
      //     console.log("-------------------------")
      //     console.log(persons)
      //     console.log("-------------------------")

      //     return res.json(persons)
      //   }
      //   )
      // .catch(err => {
      //   return console.log(err);
      // })
    })
    });
  });



router.get('/persons/:id', function (req, res) {


    var token = ''
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){
      
        Person.find({"familyId": req.params.id})
        .populate('parent')
        .lean()
        .exec()
        .then(
          persons => {
            console.log("-------------------------")
            console.log(persons)
            console.log("-------------------------")

            return res.json(persons)
          }
          )
        .catch(err => {
          return console.log(err);
        })

      // db.get().collection('users').find({
      //   "_id" : new mongodb.ObjectId(decoded.userId)
      // },{
      //   "tree_memmbers": 1
      // })
      // .populate('parent')
      // .lean()
      // .exec()
      // .then(
      //   persons => {
      //     console.log("-------------------------")
      //     console.log(persons)
      //     console.log("-------------------------")

      //     return res.json(persons)
      //   }
      //   )
      // .catch(err => {
      //   return console.log(err);
      // })
    })
    
  });

  // count all
  router.get('/persons/count', function (req, res) {
    Person.count(function (err, count) {
      if (err) return console.error(err);
      res.json(count);
    });
  });

  // create
  router.post('/person', function (req, res) {
    var token = ''
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){
      db.get().collection('users').find({ "_id" : new mongodb.ObjectId(decoded.userId) }, {"password" : 0}).toArray(function(err, result){
        console.log("poooosssssssssstttttttt mmmmmmmeeeeee",decoded.userId)
        console.log("req.body",req.body)
        var person = {
          _id : new mongodb.ObjectId(),
          familyId: result[0].familyShareId,
          is_root: req.body.is_root,
          is_patner: req.body.is_patner,
          f_pro_image: req.body.f_pro_image,
          fname: req.body.data.fname,
          data: {
            deletable: req.body.data.deletable,
            name: req.body.data.name,
            node_open: req.body.node_open
          },
          parent: req.body.parent,
          children: []
        }
        let obj = new Person(person);
      // console.log("obj",obj)
      obj.save(function (err, doc) {
        if (err) return console.error(err);


        console.log("doooooooooocccccccccccccccccccc       ",doc)
        res.json(doc);
      });



  //     db.get().collection('users').update(
  //      {"_id" : new mongodb.ObjectId(decoded.userId)
  //    },{
  //      $push : { 
  //       "tree_memmbers" :  person
  //     }
  //   }, function(err, result) {
  //    if(err) {
  //     console.log(err)
  //   } else {
  //     console.log('updated')
  //     console.log(result)
  //     res.json(person);

  //   }
  // })

})

    });
  });

  // find by id
  router.get('/person/:id', function (req, res) {
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){
    Person.findOne({
      _id: req.params.id
    }, function (err, obj) {
      if (err) return console.error(err);
      res.json(obj);
    })
  });
});
  // updateTree by id
  router.put('/person/:id', function (req, res) {
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){

      console.log("reeeeeeeeeeqqqqqqqqqqqqqqqqqqqq",req.body)
      if(req.body.children){
        req.body.children = []
      }
    Person.findOneAndUpdate({
      _id: req.params.id
    }, req.body, function (err) {
      if (err) return console.error(err);
      res.sendStatus(200);
    })
  });
});
  // delete by id
  router.delete('/persons/:id/:nodes', function (req, res) {
    if(req.headers.value) {
      var token = req.headers.value.split(" ")[1]
      console.log("token",token)
    }
    verifyToken(token, res, function(decoded){
      Person.find({
        _id: req.params.id
      })
      .lean()
      .exec()
      .then(
        doc => {
          let nodes = req.params.nodes.split(',');
          console.log(nodes);
          console.log("doc.parent doc.parent doc.parent doc.parent doc.parent",doc[0].parent)
          if (doc[0].parent == null) {
            if(doc[0].tree_memmbers){


              console.log("doc.tree_memmbers doc.tree_memmbers doc.tree_memmbers doc.tree_memmbers doc.tree_memmbers",doc[0].tree_memmbers)
              doc[0].tree_memmbers.forEach(function(item) {
                console.log(item)
                db.get().collection('users').update(
                 {"_id" : new mongodb.ObjectId(item.user_id)
               },{
                 $set : { 
                  "familyShareId" :  ""
                }
              }, function(err, result) {
               if(err) {
                console.log(err)
              } else {
                console.log('updated')


              }
            })

              })
            }

          }
          _.each(nodes, (node_id) => {
            Person.findOneAndRemove({
              _id: node_id
            }, function (err) {
              if (err) return console.error(err);
            });
          });
          if (doc.parent !== null) {
            Person.findOneAndUpdate({
              children: req.params.id
            }, {
              $pull: {
                _id: req.params.id
              }
            }, function (err) {});
          }

          res.sendStatus(200);
        }
        )
      .catch(err => {
        return console.log(err);
      })
    });
  });

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
//}
module.exports = router