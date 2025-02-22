/**
* @file
* @desc amazon pinpoint functions
* @author Jins
* @date 10 Nov 2020
*
*/
const config = require('config')
var db = require('../database/mongodb.js')
const AWS = require('aws-sdk');
// Specify that you're using a shared credentials file, and specify the
// IAM profile to use.
var credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
AWS.config.credentials = credentials;

// Specify the AWS Region to use.
// AWS.config.update({ region: 'us-east-1' });
AWS.config.update({
  accessKeyId: config.get('s3.access_key'),
  secretAccessKey: config.get('s3.secret_key'),
  region: 'us-east-1'
})
AWS.config.apiVersions = {
  pinpoint: '2016-12-01',
  // other service API versions
};



function PushAmazonPinpoit() {};

/**
* @method
* @param {string} type -set pinpoit Notification and push
* @param {string} code
* @param {object} data
* @return {object} response
*
*/
PushAmazonPinpoit.prototype.pinpointNotification = function(input) {
// PushAmazonPinpoit.prototype.pinpointNotification = function() {
// 	var input = {
//                      "type": "notifyCall",
//                      "user_id": "to123",
//                      "from_id": "from123",
//                      "chat_type": "voice",
//                      "call_from": "arjun"
//                   }

   	// Get user details
   	// var users = db.get().collection('users')
   	// users.find({ "_id" : input.user_id }, {"profile_image" : 1,"name":1,"pinpoint":1}).toArray(function(err, result){
    //   	if(err)
    //      	throw err
    //     if(result[0].hasOwnProperty("pinpoint")){
            // const pinpointToken = result[0].pinpoint.token || ""
            // const pinpointService = result[0].pinpoint.service || ""
            var pinpointToken = '2d50b592671938fa7be93990c9905f6c033460f12a09983082e6cd2e6e23a883' || ""
            var pinpointService = 'APNS' || ""
            if(pinpointToken){
				// An object that contains the unique token of the device that you want to send 
				// the message to, and the push service that you want to use to send the message.
				var recipient = {
				  'token': pinpointToken,
				  'service': pinpointService
				}
				// The AWS Region that you want to use to send the message. For a list of
				// AWS Regions where the Amazon Pinpoint API is available, see
				// https://docs.aws.amazon.com/pinpoint/latest/apireference/
				const region = 'us-east-1'
				// The title that appears at the top of the push notification.
				var title = 'Memmbles'
				// The content of the push notification.
				var message = 'Incoming '+input.chat_type+" call from "+input.call_from
				// The Amazon Pinpoint project ID that you want to use when you send this 
				// message. Make sure that the push channel is enabled for the project that 
				// you choose.
				var applicationId = 'e8c9e3fe5fa64398917de829a3dfdcf9';
				// The action that should occur when the recipient taps the message. Possible
				// values are OPEN_APP (opens the app or brings it to the foreground),
				// DEEP_LINK (opens the app to a specific page or interface), or URL (opens a
				// specific URL in the device's web browser.)
				var action = 'URL';
				// This value is only required if you use the URL action. This variable contains
				// the URL that opens in the recipient's web browser.
				var url = 'https://www.example.com';
				// The priority of the push notification. If the value is 'normal', then the
				// delivery of the message is optimized for battery usage on the recipient's
				// device, and could be delayed. If the value is 'high', then the notification is
				// sent immediately, and might wake a sleeping device.
				var priority = 'high';

				// The amount of time, in seconds, that the push notification service provider
				// (such as FCM or APNS) should attempt to deliver the message before dropping
				// it. Not all providers allow you specify a TTL value.
				var ttl = 30;

				// Boolean that specifies whether the notification is sent as a silent
				// notification (a notification that doesn't display on the recipient's device).
				var silent = false;
				switch(input.type){
               		case "notifyCall"://notifyCall.js
               		var token = recipient['token'];
					var service = recipient['service'];
					var messageRequest = CreateMessageRequest();
					var params = {
					    "ApplicationId": applicationId,
					    "MessageRequest": messageRequest
					  };

					  // Try to send the message.
					  console.log(params)
					  //Create a new Pinpoint object.
					  var pinpoint = new AWS.Pinpoint();
					  pinpoint.sendMessages(params, function(err, data) {
					    if (err) console.log(err);
					    else     ShowOutput(data);
					  });


		                break 
		            		
               	}
            }
    //     }
    // })

	function CreateMessageRequest() {
	  var token = recipient['token'];
	  var service = recipient['service'];
	  if (service == 'GCM') {
	    var messageRequest = {
	      'Addresses': {
	        [token]: {
	          'ChannelType' : 'GCM'
	        }
	      },
	      'MessageConfiguration': {
	        'GCMMessage': {
	          'Action': action,
	          'Body': message,
	          'Priority': priority,
	          'SilentPush': silent,
	          'Title': title,
	          'TimeToLive': ttl,
	          'Url': url
	        }
	      }
	    };
	  } else if (service == 'APNS') {
	    var messageRequest = {
	      'Addresses': {
	        [token]: {
	          'ChannelType' : 'APNS'
	        }
	      },
	      'MessageConfiguration': {
	        'APNSMessage': {
	          'Action': action,
	          'Body': message,
	          'Priority': priority,
	          'SilentPush': silent,
	          'Title': title,
	          'TimeToLive': ttl,
	          'Url': url
	        }
	      }
	    };
	  } 

	  return messageRequest
	}

    function ShowOutput(data){
	  if (data["MessageResponse"]["Result"][recipient["token"]]["DeliveryStatus"]
	      == "SUCCESSFUL") {
	    var status = "Message sent! Response information: ";
	  } else {
	    var status = "The message wasn't sent. Response information: ";
	  }
	  console.log(status);
	  console.dir(data, { depth: null });
	}

}
module.exports = new PushAmazonPinpoit()