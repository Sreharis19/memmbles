var express = require('express')
let date = require('date-and-time');
function GetFacePackage() {};

GetFacePackage.prototype.startProcess = function() {
	var now = new Date();
	var next_month = date.addMonths(now, 6);
	var newDate= date.format(next_month, 'YYYY-MM-DD');
	console.log(newDate)
}
module.exports = new GetFacePackage()

GetFacePackage.prototype.startProcess()