/**
* @file
* @desc Applciation server
* @author Deepak
* @date 09 Feb 2017
*
*/

var express = require('express')
var bodyParser = require('body-parser')
var expressValidator = require('express-validator')
//var cronInterval = require('./routes/cronInterval.js')
var common = require('./functions/common.js')
// Import config module
const config = require('config')
var db = require('./database/mongodb.js')
var cors = require('cors')
process.env.NODE_ENV = "production";
var app = express()
const schedule = require('node-schedule')
const bday = require('./bdaylist.js')
const admbday = require('./admBirthwish.js')
const spWish  = require('./spcialWishes.js')



const multer = require('multer');  
const multerUpload = multer({dest:'/uploads'});
app.use(function(req, res, next){
var checkIp = require('check-ip')
var response = checkIp(req.headers.host.split(':')[0])
if (response.isValid) {
  next()
} else {
    const isNotSecure = (!req.get('x-forwarded-port') && req.protocol !== 'https') ||
      parseInt(req.get('x-forwarded-port'), 10) !== 443 &&
        (parseInt(req.get('x-forwarded-port'), 10) === parseInt(req.get('x-forwarded-port'), 10))

    if (isNotSecure) {
      return res.redirect(301, 'https://' + req.get('host') + req.url)
    }
   next()
 }
})


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(bodyParser.raw({  type: 'text/plain' }))

app.use(expressValidator())

/**
* @cors
* @desc Enable access control origin
*
*/
var corsOptions = {
  // origin: 'http://localhost:3000',
  origin: config.get('cors.origin'),
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

/**
* @module
* @desc Include login module
*
*/
var login = require('./routes/login')
app.use('/login', login)

/**
* @module
* @desc Include signup module
*
*/
var signup = require('./routes/signup')
app.use('/signup', signup)

/**
* @module
* @desc Include resend otp module
*
*/
var resendOtp = require('./routes/otpResend')
app.use('/otp/resend', resendOtp)

/**
* @module
* @desc Include verify otp module
*
*/
var verifyOtp = require('./routes/otpVerify')
app.use('/otp/verify', verifyOtp)

/**
* @module
* @desc Forgot password module
*
*/
var passwordForgot = require('./routes/passwordForgot')
app.use('/password/forgot', passwordForgot)

/**
* @module
* @desc Change password module
*
*/
var passwordChange = require('./routes/passwordChange')
app.use('/password/change', passwordChange)

/**
* @module
* @desc Upload Image to S3 module
*
*/
var imageUpload = require('./routes/imageUpload')
app.use('/image/upload', imageUpload)
var familyimageUpload = require('./routes/familyImageUpload')
app.use('/fimage/upload', familyimageUpload)

/**
* @module
* @desc User Profile
*
*/
var userProfile = require('./routes/userProfile')
app.use('/profile', userProfile)

/**
* @module
* @desc Photo Details
*
*/
var photoDetails = require('./routes/photoDetails')
app.use('/photo/details', photoDetails)

/**
* @module
* @desc Comment
*
*/
var comment = require('./routes/comment')
app.use('/comment', comment)

/**
* @module
* @desc Trigger upload completed
*
*/
var uploadCompleted = require('./routes/uploadCompleted')
app.use('/photo/upload/completed', uploadCompleted)

/**
* @module
* @desc Get/Add/Upate Memmble
*
*/
var memmble = require('./routes/memmble')
app.use('/memmble', memmble)

/**
* @module
* @desc Elastic search
*
*/
var search = require('./routes/elasticSearch')
app.use('/search', search)

/**
* @module
* @desc Follow/Unfollow a User
*
*/
var follow = require('./routes/follow')
app.use('/follow', follow)

/**
* @module
* @desc Feed of a User
*
*/
var feed = require('./routes/feed')
app.use('/feed', feed)

/**http://10.0.0.10:4300/feed
* @module
* @desc Feed of a User
*
*/
var explore = require('./routes/explore')
app.use('/explore', explore)

/**
* @module
* @desc Followers
*
*/
var followers = require('./routes/followers')
app.use('/followers', followers)

/**
* @module
* @desc Following
*
*/
var following = require('./routes/following')
app.use('/following', following)

/**
* @module
* @desc Get Like details of a memmble
*
*/
var likes = require('./routes/likes')
app.use('/likes', likes)

/**
* @module
* @desc Get details of a Tagged People in a memmble
*
*/
var taggedPeople = require('./routes/taggedPeople')
app.use('/tags', taggedPeople)

/**
* @module
* @desc Payment Subscriptions
*
*/
/*var payment = require('./routes/stripe-payment')
app.use('/payment', payment)*/

 /**
 * @module
 * @desc Increment View Count of a memmble
 *
 */
 var views = require('./routes/views')
 app.use('/views', views)

/**
* @module
* @desc Voice cover
*
*/
var voiceCover = require('./routes/voiceCover')
app.use('/voice/upload', voiceCover)

/**
* @module
* @desc Upload Video to S3 module
*
*/
// var videoUpload = require('./routes/videoUpload')
// app.use('/video/upload', videoUpload)
var videoUpload = require('./routes/s3VideoUpload')
app.use('/video/upload', videoUpload)

var videoUploadS3 = require('./routes/s3VideoUpload')
app.use('/videos3/uploads3', videoUploadS3)

/**
* @module
* @desc Upload Profile Picture to S3 module
*
*/
var profilePictureUpload = require('./routes/profilePictureUpload')
app.use('/profile/upload', profilePictureUpload)


/**
* @module
* @desc Increment View Count of a memmble
*
*/
var views = require('./routes/views')
app.use('/views', views)

/**
* @module
* @desc Video Details
*
*/
var videoDetails = require('./routes/videoDetails')
app.use('/video', videoDetails)


/**
* @module
* @desc Walkthrough hide
*
*/
var walkthrough = require('./routes/walkthrough')
app.use('/walkthrough', walkthrough)

/**
* @module
* @desc Notifications
*
*/
var notification = require('./routes/notification')
app.use('/notification', notification)

/**
* @module
* @desc Invite
*
*/
var invite = require('./routes/invite')
app.use('/invite', invite)

/**
* @module
* @desc Downgrade
*
*/
var downgrade = require('./routes/downgrade')
app.use('/downgrade', downgrade)

/**
* @module
* @desc Advertisements
*
*/
var ads = require('./routes/advertisement')
app.use('/mems', ads)

/**
* @module
* @desc Interests
*
*/
var interest = require('./routes/interest')
app.use('/interest', interest)

/**
* @module
* @desc Friends list
*
*/
var friends = require('./routes/friends')
app.use('/friends', friends)

/**
* @module
* @desc Invite/ Block/ Unblock chat
*
*/
var chat = require('./routes/chat')
app.use('/chat', chat)

/**
* @module
* @desc Send contact message to admin
*
*/
var contact = require('./routes/contact')
app.use('/contact', contact)

/**
* @module
* @desc Audio upload
*
*/
var audio = require('./routes/audioUpload')
app.use('/audio/upload', audio)

/**
* @module
* @desc Set language of a user
*
*/
var language = require('./routes/language')
app.use('/language', language)


/**
* @module
* @desc Ads
*
*/
var adv = require('./routes/adv')
app.use('/mem_s', adv)

var adDetail = require('./routes/adDetail')
app.use('/mems_detail', adDetail)

var manageAd = require('./routes/manage-adv')
app.use('/managemems', manageAd)

var searchAd = require('./routes/adSearch')
app.use('/mem', searchAd)

/**
* @module
* @desc Face
*
*/
var face = require('./routes/face')
app.use('/face', face)


/**
* @module
* @desc Set ads views and clicks
*
*/
var adsPerform = require('./routes/adsPerformance')
app.use('/mems/perform', adsPerform)



/**
* @module
* @desc Payment GATEWAY
*
*/
var payForAds = require('./routes/subPayment')
app.use('/pay', payForAds)



/**
* @module
* @desc Payment GATEWAY
*
*/
var payForPlan = require('./routes/subscription-payment')
app.use('/payment', payForPlan)

/**
* @module
* @desc test webhook
*
*/
var testWebhook = require('./routes/test-webhook')
app.use('/webhook', testWebhook)

/**
* @module
* @desc Payment Ads
*
*/
var adsPayment = require('./routes/adsPayment')
app.use('/mems/payment', adsPayment)


/**
* @module
* @desc Push notification
*
*/
var pushNote = require('./routes/push')
app.use('/push', pushNote)

/**
* @module
* @desc get card details
*
*/
var cardDetails = require('./routes/getCardDetails')
app.use('/card', cardDetails)
/**
* @module
* @desc change card details
*
*/
var changeCardDetails = require('./routes/changeCard')
app.use('/changecard', changeCardDetails)

/**
* @module
* @desc familytree
*
*/
var familytree = require('./routes/router')
app.use('/ftree', familytree)

var ftreeShare = require('./routes/familyTree')
app.use('/familytree', ftreeShare)



/**
* @module
* @desc events
*
*/

var event = require('./routes/events')
app.use('/events', event)

/**
* @module
* @desc bdayAds
*
*/

var bdayList = require('./routes/bdayList')
app.use('/bdaymems', bdayList)


/**
* @module
* @desc Delete Memmble By Admin
*
*/

var adminDelete = require('./routes/deleteMemmbleByAdmin')
app.use('/adminDelete', adminDelete)

/**
* @module
* @desc block user
*
*/
var block = require('./routes/block')
app.use('/userPost', block)

/**
* @module
* @desc firebase 
*
*/
var firebase = require('./routes/firebase')
app.use('/firebase', firebase)

/**
* @module
* @desc call notify 
*
*/
var callNotify = require('./routes/notifyCall')
app.use('/notifyCall', callNotify)

/**
* @module
* @desc call notify 
*
*/
var report = require('./routes/report')
app.use('/report', report)

/**
* @module
* @desc voip call 
*
*/
var voipCall = require('./routes/voipPush')
app.use('/voip', voipCall)


/**
 * @database
 * @desc Connect to mongodb server
 *
 */

  db.connect('mongodb://db1.memmbles.com,db2.memmbles.com/memmbles?replicaSet=memmbles-replica-set', function (err) {
//db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {

 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{

	    /**
        * @server
        * @desc Start server on the specified port
        *
        */

        app.listen(config.get('app.port'), function(req, res) {
        	console.log('Server started on port ' + config.get('app.port'))
          // schedule.scheduleJob("0 15 0 * * *", function() {       
          //         bday.startProcess()
          //       })
          // schedule.scheduleJob("0 30 0 * * *", function() {        
          //         admbday.startWishes()
          //       })
          // schedule.scheduleJob("0 45 0 * * *", function() {        
          //         spWish.startProcess()
          //       })
          

        })

      }
    })
