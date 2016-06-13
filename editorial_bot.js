'use strict'

var fs                = require('fs');
var Train             = require('./src/train');
var Brain             = require('./src/brain');
var Ears              = require('./src/ears');
var builtinPhrases    = require('./builtins');
var Botkit            = require('botkit');
var STAMPLAY          = require('stamplay');
var STAMPLAYAPI       = new STAMPLAY('editorial', '014c500eb36e454abaeb872a571fc036fda47b7073ebcf5581ca001af9d75419');
var HTTP              = require('request');
var schedule          = require('node-schedule');
var LocalStorage      = require('node-localstorage').LocalStorage;
var localStorage      = new LocalStorage('./scratch');
var readline          = require('readline');
var google            = require('googleapis');
var googleAuth        = require('google-auth-library');
var authDetail        = '';
var SCOPES            = ['https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/plus.me'];
var key               = require("./editorial-service.json");

var storyArray = JSON.parse(localStorage.getItem('U1ASBAE9H'));
console.log(storyArray);

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

var Bottie = {
  Brain: new Brain(),
  Ears: new Ears(bot.config.token)
};

var customPhrasesText;
var customPhrases;
try {
  customPhrasesText = fs.readFileSync(__dirname + '/custom-phrases.json').toString();
} catch (err) {
  throw new Error('Uh oh, Bottie could not find the ' +
    'custom-phrases.json file, did you move it?');
}
try {
  customPhrases = JSON.parse(customPhrasesText);
} catch (err) {
  throw new Error('Uh oh, custom-phrases.json was ' +
    'not valid JSON! Fix it, please? :)');
}

console.log('Bottie is learning...');
Bottie.Teach = Bottie.Brain.teach.bind(Bottie.Brain);
eachKey(customPhrases, Bottie.Teach);
eachKey(builtinPhrases, Bottie.Teach);
Bottie.Brain.think();
console.log('Bottie finished learning, time to listen...');

function eachKey(object, callback) {
  Object.keys(object).forEach(function(key) {
    callback(key, object[key]);
  });
}

var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, SCOPES, null);
jwtClient.authorize(function(err) {
  if (err) {
    console.log(err);
    return;
  }
  authDetail = jwtClient;
});
var cornjob = JSON.parse(localStorage.getItem('corn_job'));
console.log(cornjob);
bot.startRTM(function(err) {
  if (err) {
    throw new Error(err);
  } else {
    for (var j=0; j<cornjob.length ;j++){
        for(var k=0;k< cornjob[j].username.length;k++){
          console.log(cornjob[j].username[k]);
          var message = {};
          message = {user: cornjob[j].username[k]};
          console.log("=======",message);
          schedulingFuncton(message,cornjob[j].eta,cornjob[j].storyTitle);
        }
    }
  }
});

function schedulingFuncton(user,date,title) {
  console.log("########################",user,date,title);
  var dataSplit = date.split('-');
    console.log(dataSplit);
  var date = new Date(dataSplit[0], dataSplit[1], dataSplit[2], 0, 0, 0);
  var taskOwnerDatw = new Date(date.getTime() - (2*24*60*60*1000));
  var j = schedule.scheduleJob(taskOwnerDatw, function(){           // for scheduled DM messages commented for now
    bot.startPrivateConversation(user, function(err, convo) {
      convo.say("You have been tagged for task named" + title);
    });
  });
}


controller.hears(['story idea','edit story idea'],['ambient'], function(bot, message) {
  console.log("====message====",message);
  var user = message.user;
  var token = bot.config.token;

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
            console.log(message);
            if(message.text === 'story idea'){
              bot.startPrivateConversation(message, askStory);
            }
            if(message.text === 'edit story idea'){
              bot.startPrivateConversation(message, askStoryForEdit);
            }
          })
        } else {
          if(message.text === 'story idea'){
              bot.startPrivateConversation(message, askStory);
          }
          if(message.text === 'edit story idea'){
            bot.startPrivateConversation(message, askStoryForEdit);
          }
        }
      })
    }
  });
});

function askStoryForEdit(response, convo) {
  console.log("==========askStory==============",response,"---conve-----",convo.source_message.user);
  STAMPLAYAPI.Object("draft_story").get({page: 1, per_page: 100,username: convo.source_message.user}, function(err, result) {
    if(err) {
            console.log("====cb=error====",error);
        }
          var memoryResult = JSON.parse(result);
          var storyPresent = false;
          var test = '';
          if(memoryResult.data.length > 0) {
            for(var j = 0; j<memoryResult.data.length; j++){
              var listString = memoryResult.data[j].storyTitle;
              test = test + "\n" + listString;
            }
            convo.say("Which idea you want to Edit? Stories you have created" + test);
            convo.ask("Please Enter story name which you want to edit", function(response, convo) {
              console.log(response.text);

              for(var i = 0; i < memoryResult.data.length; i++){
                if(response.text === memoryResult.data[i].storyTitle){
                  storyPresent = true;
                  var idOfStory = memoryResult.data[i]._id;
                }
              }
              if(storyPresent == true){
                console.log("====------------------");
                convo.next();
                askStoryNameForEdit(response, convo,idOfStory, function(cb) {
                  //cb();
                });
              }else{
                convo.next();
                convo.say("You have not created any story with name of " + response.text);
                convo.say("Do you want to create story with name "+ response.text);
                convo.ask("yes or no" , function(response, convo) {
                  if(response.text === 'yes'){
                    convo.next();
                    askStory(response, convo, function(cb) {
                      //cb();
                    });
                  }else{
                    convo.next();
                    convo.say("OK, you can create Story by typing Story Edit in Channel");
                  }
                });
              }          
            });
            // for(var i =0; i< memoryResult.data.length;i++){
            //   var listString = JSON.stringify(memoryResult.data[i].storyTitle)
            //   console.log(listString);
            //   convo.next();
            // convo.say(listString);
            // }
          }else {
            convo.next();
            convo.say("You have not created any story Yet");
          }
    })
}

function askStoryNameForEdit(response, convo,idOfStory, cb) {
  console.log("================",idOfStory);
  convo.ask("What is the new name of your story?", function(response, convo) {
    console.log(response.text);
    console.log(response.user);
    var userData = JSON.parse(localStorage.getItem(response.user));
    console.log(userData.length);
    var storyExist = false;
    for(var i = 0 ; i < userData.length ; i++){
      if(response.text === userData[i].storyTitle && response.user === userData[i].username ){
        storyExist = true;
      }
    }
    if(storyExist == true){
      console.log("+++++++++++++++++++++++++++++++");
      convo.say("You have Already existing Story with this name, Please enter Diffrent name")
      convo.next();
      askStoryNameForEdit(response, convo,idOfStory, function(descCb) {
        cb();
      });
    }else{
      convo.say("Ok.")
      convo.next();
      askStoryDescriptionForEdit(response, convo,idOfStory, function(descCb) {
        cb();
      });
    }
  });
}

function askStoryDescriptionForEdit(response, convo,idOfStory, descCb) {
  console.log("----------------askStoryDescriptionForEdit----------------",idOfStory);
  convo.ask("Give me a short description that will help others understand.", function(response, convo) {
    convo.next();
    askStoryETAForEdit(response, convo,idOfStory, function(etaCb) {
      descCb();
    });
  });
}

function askStoryETAForEdit(response, convo,idOfStory, etaCb) {
  console.log("----------------askStoryETAForEdit----------------",idOfStory);
  convo.ask("What's the ETA? Please reply in mm-dd format only", function(response, convo) {
    var date = new Date(response.text);
    var day = parseInt(date.getFullYear());
    var month = parseInt(date.getMonth() + 1);
    var year = parseInt(date.getDate());
    if (isNaN(day && month && year)){
      convo.next();
      askStoryETAForEdit(response, convo,idOfStory, function(infoCb) {
        etaCb();
      });
    }else{
      convo.next();
      askStoryOtherInfoForEdit(response, convo,idOfStory, function(infoCb) {
        etaCb();
      });
    }
  });
}

function askStoryOtherInfoForEdit(response, convo,idOfStory,infoCb) {
  console.log("asdasd;aksdklas;ld;lasd;las",idOfStory);
  convo.ask("Anything else you want to mention?", function(response, convo) {
    convo.next();
    showResultsForEdit(response, convo,idOfStory, function(resultCb) {
      infoCb();
    });
  });
}

function showResultsForEdit(response, convo,idOfStory, resultCb){
  console.log("===============",convo.source_message.user);
  var userId = convo.source_message.user;
  var values = convo.extractResponses();
  convo.say("Story Editing Complete");
  console.log("======values=========",values);
  var etaInput = values['What\'s the ETA? Please reply in mm-dd format only'];
  convo.say("iteration finish");
  var eta = "2016-"+etaInput;
  var data = {
    username: userId,
    storyTitle: values['What is the new name of your story?'],
    description: values['Give me a short description that will help others understand.'],
    eta: eta,
    otherInfo: values['Anything else you want to mention?']
  }
  console.log(data);

  STAMPLAYAPI.Object('draft_story').update(idOfStory,data, function(error, result) {
      if(error) {
          console.log("====updateMemoryCb=error====",error);
      }
      console.log("=====memory data==update==",result);
      var str  = JSON.stringify(data.otherInfo);
      if (str.match(/<@.*>/g) !== null){
        var res = str.match(/<@.*>/g)[0].split(' ');
        console.log(res);
        var blankArray = [];
        for (var i =0;i< res.length;i++){
          var mactchfind = res[i].match(/<@.*>/g)
          if (mactchfind !== null){
            var split = mactchfind[0].substring(str.indexOf("<@")+1,str.indexOf(">")-1);
            console.log(split);

            if(blankArray.indexOf(split) === -1){
              console.log("dasdasdasdasdasd======");
              blankArray.push(split);
            }
          }
        }
        var a =  JSON.parse(result)
        console.log()
        var assignData = {
          username:blankArray,
          eta: data.eta,
          storyTitle: data.storyTitle,
          description: data.description,
          draft_id: a._id
        }
        console.log("assignData=============",assignData)
        STAMPLAYAPI.Query('object', 'task_assign').equalTo('draft_id',idOfStory ).exec(function(error, getResult) {
          if(error) {
              console.log("====updateMemoryCb=error====",error);
          }
          STAMPLAYAPI.Object('task_assign').update(getResult._id,assignData, function(error, updateresult) {
            if(error) {
            console.log("====channelCb=error====",error);
            }
            console.log("--------------updateresult--------------",updateresult);
            for(var i=0;i< assignData.username.length;i++){
              var userID = {};
              userID = {user: assignData.username[i]};
              schedulingFuncton(userID,assignData.eta,assignData.storyTitle);
            }
            var taskArray = [];
            if(localStorage.getItem('corn_job') === null){
              taskArray.push(assignData);
              localStorage.setItem('corn_job',JSON.stringify(taskArray));
            }else{
              var taskArray = JSON.parse(localStorage.getItem('corn_job'));
              taskArray.push(assignData);
              localStorage.setItem('corn_job',JSON.stringify(taskArray));
            }
          })
        })
      }

  })
  var event = {
    'summary': data.storyTitle,
    'start': {
      'date': data.eta
    },
    'end': {
      'date': data.eta
    },
  };
  var calendar = google.calendar('v3');
  calendar.events.insert({
    auth: authDetail,
    calendarId: 'himanshu.sharma@viithiisys.com',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.htmlLink);
  });
  convo.next();
  convo.say("To see your Stories List please Visit -> http://localhost:8001/#/storylist/"+ convo.source_message.user);
  resultCb();
}


//------------------------------- create story------------------

function askStory(response, convo, rcb) {
  convo.ask("How many stories will you do this week?", function(response, convo) {
    console.log(response);
    var num = parseInt(response.text);
    if (isNaN(num)){
      convo.say("Please enter Numerical value only.");
      convo.next();
      askStory(response, convo, function(cb) {
        rcb();
      });
    }else{
      convo.say("Awesome.");
      var i = 0;
      (function init() {
        var n = i + 1;
        if(i === num){
          return true;
        } else {
          convo.next();
          askStoryName(response, convo, n, function(cb) {
            i++;
            init();
          });
        }
      })();
    }
  });
}

function askStoryName(response, convo, n, cb) {
  convo.ask("What is the name of your "+n+"th story?", function(response, convo) {
    console.log(response.text);
    console.log(response.user);
    var userData = JSON.parse(localStorage.getItem(response.user));

    if(userData == null){
      convo.say("Ok.")
      convo.next();
      askStoryDescription(response, convo, n, function(descCb) {
        cb();
      });
    }else{
      var status = false;
      for(var i = 0 ; i < userData.length ; i++){
        if(response.text === userData[i].storyTitle && response.user === userData[i].username ){
          status = true;
        }
      }
      if (status === true){
        convo.say("You have Already existing Story with this name, Please enter Diffrent name")
          convo.next();
          askStoryName(response, convo, n, function(descCb) {
            cb();
        });
      }
      if (status === false){
        convo.say("Ok.")
        convo.next();
        askStoryDescription(response, convo, n, function(descCb) {
          cb();
        });
      }
    }
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
  convo.ask("What's the ETA? Please reply in mm-dd format only", function(response, convo) {
    var date = new Date(response.text);
    var day = parseInt(date.getFullYear());
    var month = parseInt(date.getMonth() + 1);
    var year = parseInt(date.getDate());
    if (isNaN(day && month && year)){
      convo.next();
      askStoryETA(response, convo, n, function(infoCb) {
        etaCb();
      });
    }else{
      convo.next();
      askStoryOtherInfo(response, convo, n, function(infoCb) {
        etaCb();
      });
    }
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
  var phraseExamples = [];
  var phraseName;
  console.log("===============",convo.source_message.user);
  var userId = convo.source_message.user;
  var values = convo.extractResponses();
  var etaInput = values['What\'s the ETA? Please reply in mm-dd format only'];
  convo.say("iteration finish");
  var eta = "2016-"+etaInput;
  var data = {
    username: userId,
    storyTitle: values['What is the name of your '+n+'th story?'],
    description: values['Give me a short description that will help others understand.'],
    eta: eta,
    otherInfo: values['Anything else you want to mention?']
  }
  STAMPLAYAPI.Object('draft_story').save(data, function(error, result) {
    if(error) {
      channelCb(error);
    }
    if(localStorage.getItem(userId) === null){
      var storyArray = [];
      storyArray.push(data);
      localStorage.setItem(userId,JSON.stringify(storyArray));
    }else{
      var storyArray = JSON.parse(localStorage.getItem(userId));
      storyArray.push(data);
      localStorage.setItem(userId,JSON.stringify(storyArray));
    }
    var str  = JSON.stringify(data.otherInfo);
    if (str.match(/<@.*>/g) !== null){
      var res = str.match(/<@.*>/g)[0].split(' ');
      var blankArray = [];
      for (var i =0;i< res.length;i++){
        var result = res[i].match(/<@.*>/g)
        if (result !== null){
          var split = result[0].substring(str.indexOf("<@")+1,str.indexOf(">")-1);
          if(blankArray.indexOf(split) === -1){
            blankArray.push(split);
          }
        }
      }
      var a =  JSON.parse(result)
      var assignData = {
        username:blankArray,
        eta: data.eta,
        storyTitle: data.storyTitle,
        description: data.description,
        draft_id: a._id
      }
      STAMPLAYAPI.Object('task_assign').save(assignData, function(error, result) {
        if(error) {
        console.log("====channelCb=error====",error);
        }
        for(var i=0;i< assignData.username.length;i++){
          var userID = {};
          userID = {user: assignData.username[i]};
          schedulingFuncton(userID,assignData.eta,assignData.storyTitle);
        }
        var taskArray = [];
        if(localStorage.getItem('corn_job') === null){
          taskArray.push(assignData);
          localStorage.setItem('corn_job',JSON.stringify(taskArray));
        }else{
          var taskArray = JSON.parse(localStorage.getItem('corn_job'));
          taskArray.push(assignData);
          localStorage.setItem('corn_job',JSON.stringify(taskArray));
        }
      })
    }
  })

  phraseName = data.storyTitle;
  phraseExamples.push(data.description);
  Bottie.Brain.teach(phraseName, phraseExamples);
  Bottie.Brain.think();
  Train(phraseName, phraseExamples, function(err) {
      if (err) {
        console.log("++++++++++++++++++++++++++errr+++++++++++++++++++++++++",err);
      }
      console.log("++++++++++++++++++++++++++all DOne+++++++++++++++++++++++++");
    });
  var event = {
    'summary': data.storyTitle,
    'start': {
      'date': data.eta
    },
    'end': {
      'date': data.eta
    },
  };
  var calendar = google.calendar('v3');
  calendar.events.insert({
    auth: authDetail,
    calendarId: 'bot.editorial@gmail.com',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event);
  });

  convo.next();
  convo.say("To see your Stories List please Visit -> http://159.203.111.229/editorial_wiki/#/storylist/"+ convo.source_message.user);
  resultCb();
}
