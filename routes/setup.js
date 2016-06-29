'use strict'
var FS = require('fs');
var CUSTOM_PHRASE_LOC = __dirname + '/../editorial_questions.json';

function setup(req, res) {
	console.log(req.body);
	console.log(CUSTOM_PHRASE_LOC.numberOFStories);
  	res.send('success');
  	FS.writeFile('helloworld.txt', 'Hello World!', function (err) {
	  if (err) return console.log(err);
	  console.log('Hello World > helloworld.txt');
	});
  	FS.writeFile(CUSTOM_PHRASE_LOC, JSON.stringify(req.body),null, function(err) {
      if (err) {
        console.error('Error while writing new serialized phrase object.');
        return callback(err);
      }
    });
}

exports.setup = setup;