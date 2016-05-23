'use strict'

var Botkit        = require('botkit');
var STAMPLAY      = require('stamplay');
var STAMPLAYAPI   = new STAMPLAY('editorial', '014c500eb36e454abaeb872a571fc036fda47b7073ebcf5581ca001af9d75419');
var HTTP          = require('request');

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: false
});

var bot = controller.spawn({
  token: process.env.token
})

var message = {
  channel: 'D1936NDCK',
  user: 'U192U70G3'
};

bot.startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }/* else {
    controller.startConversation(bot, message, function(err, convo) {
      convo.say("Awesome.");
    });
  }*/
});

controller.hears(['pizzatime'], ['ambient'], function(bot, message) {
  console.log("====message====",message);
  var user = message.user;
  var token = 'xoxp-43005705041-43096238547-43189021925-8d4beed37d';
  HTTP({
    url: 'https://slack.com/api/users.info',
    qs: {token: token, user: user},
    method: 'GET'
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response);
    } else {
      body = JSON.parse(body);
      console.log("===email===",body.user.profile.email);
      console.log("===username===",body.user.name);
      STAMPLAYAPI.User.get({'email': body.user.profile.email}, function(err, res) {
        if(err) return console.log(err);
        var result = JSON.parse(res);
        if(result.data.length === 0) {
          console.log("===============",result);
          var signup_credentials = {
            email : body.user.profile.email,
            password: 'password',
            username: body.user.name,
            slackUserId: user
          };
          STAMPLAYAPI.User.save(signup_credentials, function(error, userResult) {
            if(error) {
              console.log("====user=error====",error);
            }
            console.log("=====user create====",userResult);
            var userResult = JSON.parse(userResult);
            bot.startPrivateConversation(message, askStory);
          })
        } else {
          bot.startPrivateConversation(message, askStory);
        }
      })
    }
  });
});

function askStory(response, convo) {
  console.log("==========askStory==============");
  convo.ask("How many stories will you do this week?", function(response, convo) {
    convo.say("Awesome.");
    var num = parseInt(response.text);
    console.log("========num====",num);
    var i = 0;
    (function init() {
      console.log("========i====",i);
      var n = i + 1;
      console.log("========n====",n);
      if(i === num){
        return true;
      } else {
        convo.next();
        askStoryName(response, convo, n, function(cb) {
          console.log("======cb========");
          i++;
          init();
        });
      }
    })();
  });
}

function askStoryName(response, convo, n, cb) {
  convo.ask("What is the name of your "+n+"th story?", function(response, convo) {
    convo.say("Ok.")
    convo.next();
    askStoryDescription(response, convo, n, function(descCb) {
      cb();
    });
  });
}

function askStoryDescription(response, convo, n, descCb) {
  convo.ask("Give me a short description that will help others understand.", function(response, convo) {
    convo.next();
    askStoryETA(response, convo, n, function(etaCb) {
      descCb();
    });
  });
}

function askStoryETA(response, convo, n, etaCb) {
  convo.ask("What's the ETA?", function(response, convo) {
    convo.next();
    askStoryOtherInfo(response, convo, n, function(infoCb) {
      etaCb();
    });
  });
}

function askStoryOtherInfo(response, convo, n, infoCb) {
  convo.ask("Anything else you want to mention?", function(response, convo) {
    convo.next();
    showResults(response, convo, n, function(resultCb) {
      infoCb();
    });
  });
}

function showResults(response, convo, n, resultCb){
  console.log("===============",convo.source_message.user);
  var userId = convo.source_message.user;
  var values = convo.extractResponses();

  convo.say("iteration finish");

  console.log("======values=========",values);

  var data = {
    username: userId,
    storyTitle: values['What is the name of your '+n+'th story?'],
    description: values['Give me a short description that will help others understand.'],
    eta: values['What\'s the ETA?'],
    otherInfo: values['Anything else you want to mention?']
  }
  STAMPLAYAPI.Object('draft_story').save(data, function(error, result) {
    if(error) {
      console.log("====channelCb=error====",error);
      channelCb(error);
    }
    console.log("=====data==create==",result);
    var channelResult = JSON.parse(result);
  })
  convo.next();
  resultCb();
}