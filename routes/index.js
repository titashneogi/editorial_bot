var express = require('express');
var router = express.Router();
var slackbot   = require('./editorial_bot.js');
var controller 		= require('./setup.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/setup', controller.setup);

module.exports = router;