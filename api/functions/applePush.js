/**
* @file
* @desc apple push functions
* @author Jins
* @date 12 Nov 2020
*
*/
const config = require('config')
var db = require('../database/mongodb.js')


const http2 = require('http2');
const fs = require('fs');
const mongodb = require('mongodb')

function PushApple() {};

/**
* @method
* @param {string} type -set apple Notification and push
* @param {string} code
* @param {object} data
* @return {object} response
*
*/
PushApple.prototype.voipNotification = function(input) {
    //Get user details
    var users = db.get().collection('users')
    users.find({ "_id" : input.user_id }, {"profile_image" : 1,"name":1,"voip":1}).toArray(function(err, result){
       if(err)
           throw err
        if(result[0].hasOwnProperty("voip")){
            const voipToken = result[0].voip.token || ""
            if(voipToken){
              var fromId = new mongodb.ObjectId(input.from_id)
              getUserDetails(fromId,function(result){

                /* 
                  Use 'https://api.push.apple.com' for production build
                */

                host = 'https://api.push.apple.com'
                path = '/3/device/'+voipToken

                /*
                Using certificate converted from p12.
                The code assumes that your certificate file is in same directory.
                Replace/rename as you please
                */

                const client = http2.connect(host, {
                  key: fs.readFileSync(__dirname + '/newfile.key.pem'),
                  cert: fs.readFileSync(__dirname + '/newfile.crt.pem')
                });

                client.on('error', (err) => console.error("client on",err));

                body = {
                  "aps": {
                    "alert" : {
                            "title" : "Memmbles",
                            "body" : 'Incoming '+input.chat_type+' call from '+input.call_from,
                            "action-loc-key" : "PLAY"
                        },
                    "content-available": 1
                  },
                  "acme-to_id" : input.user_id,
                  "acme-from_id" : input.from_id,
                  "acme-chat_type" : input.chat_type,
                  "acme-first_name" : input.call_from,
                  "acme-full_name" : result.name.first+" "+result.name.last,
                  "acme-profile_image" : result.profile_image.thumbnail.small
                }
                headers = {
                  ':method': 'POST',
                  'apns-topic': 'com.memmble.Memmbles.voip', //you application bundle ID
                  'apns-push-type' : 'voip',
                  ':scheme': 'https',
                  ':path': path
                }

                const request = client.request(headers);

                request.on('response', (headers, flags) => {
                  for (const name in headers) {
                    console.log(`${name}: ${headers[name]} headers`);
                  }
                });

                request.setEncoding('utf8');

                let data = ''
                request.on('data', (chunk) => { data += chunk; });
                request.write(JSON.stringify(body))
                request.on('end', () => {
                console.log(`\n${data} ended`);
                client.close();
                });
                request.end();
            })
          }
        }
    })

    function getUserDetails(userId,callback){
      db.get().collection('users').find({
        "_id" : userId
      },{
        "name" : 1,
        "profile_image" : 1,
        "_id" : 1
      }).toArray(function(err, result){
        if(err){
            console.log(err)      
            throw err
        }
        let data = result[0]
        callback(data)
      })
    }




}
module.exports = new PushApple()
