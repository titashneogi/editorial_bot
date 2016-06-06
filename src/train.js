
var fs = require('fs');

var CUSTOM_PHRASE_LOC = __dirname + '/../custom-phrases.json';

module.exports = Train;

function Train(name, vocab, callback) {
  console.log('About to write files for a new empty phrase/skill type...');
  fs.readFile(CUSTOM_PHRASE_LOC, function(err, data) {
    if (err) {
      console.error('Error loading custom phrase JSON into memory.');
      return callback(err);
    }
    console.log('Parsing custom phrase JSON');
    var customPhrases = JSON.parse(data.toString());
    customPhrases[name] = vocab;
    console.log('About to serialize and write new phrase object...');
    fs.writeFile(CUSTOM_PHRASE_LOC, JSON.stringify(customPhrases, null, 2), function(err) {
      if (err) {
        console.error('Error while writing new serialized phrase object.');
        return callback(err);
      }
      console.log('Writing updated phrase JSON finished, copying empty.skill.js...');
      var emptySkillStream = fs.createReadStream(__dirname + '/empty.skill.js');
      var writeStream = fs.createWriteStream(__dirname + '/../skills/' + name + '.js');
      emptySkillStream.pipe(writeStream);
      emptySkillStream.on('error', callback);
      writeStream.on('error', callback);
      writeStream.on('finish', callback.bind(null, null));
    });
  });
};
