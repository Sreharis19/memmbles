/**
* @file
* @desc amazon sns functions
* @author Jins
* @date 12 Nov 2020
*
*/
const config = require('config')
var db = require('../database/mongodb.js')
const AWS = require('aws-sdk');
// Amazon SNS module
AWS.config.update({
  accessKeyId     : config.get('s3.access_key'),
  secretAccessKey : config.get('s3.secret_key'),
  region          : 'us-east-1'
});

var amazonSNS             =   new AWS.SNS();
// AWS.config.update({ region: 'us-east-1' });
// AWS.config.update({
//   accessKeyId: config.get('s3.access_key'),
//   secretAccessKey: config.get('s3.secret_key'),
//   region: 'us-east-1'
// })
// AWS.config.apiVersions = {
//   pinpoint: '2016-12-01',
//   // other service API versions
// };



function PushAmazonSNS() {};

/**
* @method
* @param {string} type -set sns Notification and push
* @param {string} code
* @param {object} data
* @return {object} response
*
*/
PushAmazonSNS.prototype.snsNotification = function(input) {

	var deviceVoipToken = "2d5092671938fa7be93990c9905f6c033460f12a09983082e6cd2e6e23a883"  // Obtaining the device VoIP token from the request object

  	amazonSNS.createPlatformEndpoint({
    // App in Sandboxmode (ie running on device directly from Xcode)
    PlatformApplicationArn: "arn:aws:sns:us-east-1:635106248610:app/APNS_VOIP_SANDBOX/Memmbles",
    // App in Production mode (ie running on device after archiving and installed on device with a provisioning profile)
    //PlatformApplicationArn: "arn:aws:sns:us-west-2:xxxxxxxxxxxx:app/APNS_VOIP/CurieVoip",
    Token: deviceVoipToken


  	}, function(err, data) {
	    if (err) {
	      console.log(err.stack);
	      return;
	    }
	    var endpointArn = data.EndpointArn;
	    console.log("endpointArn",endpointArn)
	    var payload = {
		    default   : 'Hello World, default payload',
		    APNS_VOIP : {
		      aps: {
		        alert: 'Hi there',
		        sound: 'default',
		        badge: 1
		      }
		    }
		};
		  // first have to stringify the inner APNS object...
		  payload.APNS_VOIP = JSON.stringify(payload.APNS_VOIP);
		  // then have to stringify the entire message payload
		  payload = JSON.stringify(payload);

		  console.log('sending push'); 
		  amazonSNS.publish({
		    MessageStructure  : 'json',
		    Message           : payload,
		    MessageAttributes:{
                            "AWS.SNS.MOBILE.APNS.PRIORITY":{"DataType":"String","StringValue":"10"}, 
                            "AWS.SNS.MOBILE.APNS.PUSH_TYPE":{"DataType":"String","StringValue":"voip"} 
                        },
		    TargetArn         : endpointArn
		  }, function(err, data) {
		    if (err) {
		      console.log("Error stack: "+err.stack);
		      return;
		    }
		     var params = {
			    EndpointArn: endpointArn /* required */
			  };

			  amazonSNS.deleteEndpoint(params, function(err, data) {
			    if (err){
			      var message = "Unable to deleteEndpointArn, with error: "+err.stack;
			      console.log(message)
			    }
			    else{
			      var message = "Deleted endpointArn successfully";
			      console.log(message)

			    }
			  });
		  });  
	})


}
module.exports = new PushAmazonSNS()