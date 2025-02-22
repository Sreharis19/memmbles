/**
* @file 
* @desc create birthday greeting video
* @author Jins
* @date 08 january 2019
*
*/

var express = require('express')
var router = express.Router()
// var common = require('../functions/common.js')
// var validator = require('../functions/validator.js')
var db = require('./database/mongodb.js')
var jwt = require('jsonwebtoken')
var mongodb = require('mongodb')
var cron = require('node-cron')
var CronJob = require('cron').CronJob
var moment = require('moment');
const config = require('config')
var io = require('socket.io-client')
var videoshow = require('videoshow')
// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// const ffmpeg = require('fluent-ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * @method
 * @return {json}
 * @desc Get birthday notification
 */
 db.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles', function (err) {
 	if(err) {
 		console.log('Error establishing database connection')
 		console.log(err)
 		process.exit(1)
 	}else{
 		console.log('connection established')
 		var images = [
  'step_1.png',
  'step_2.png',
  'step_3.png',
  'step_4.png'
]

var videoOptions = {
  fps: 25,
    loop: 5,
    transition: true,
    transitionDuration: 1,
    videoBitrate: 1024,
    videoCodec: "libx264",
    size: "640x?",
    audioBitrate: "128k",
    audioChannels: 2,
    format: "mp4",
    subtitleStyles: {
      Fontname: "Verdana",
      Fontsize: "26",
      PrimaryColour: "11861244",
      SecondaryColour: "11861244",
      TertiaryColour: "11861244",
      BackColour: "-2147483640",
      Bold: "2",
      Italic: "0",
      BorderStyle: "2",
      Outline: "2",
      Shadow: "3",
      Alignment: "1",
      MarginL: "40",
      MarginR: "60",
      MarginV: "40"
}
}
videoshow(images, videoOptions)
  .audio('song.mp3')
  .save('video.mp4')
  .on('start', function (command) {
    console.log('ffmpeg process started:', command)
  })
  .on('error', function (err, stdout, stderr) {
    console.error('Error:', err)
    console.error('ffmpeg stderr:', stderr)
  })
  .on('end', function (output) {
    console.error('Video created in:', output)
  })

 	}

})
