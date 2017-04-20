var fs = require('fs-extra')
  , path = require('path')
  , shortid = require('shortid')
;
function TestHelper(){

}

TestHelper.prototype.createTempFile = function(filename, contents, randomFolder){

  var folderPath = path.resolve('./temp');

  if (randomFolder) folderPath = path.resolve('./temp/' + shortid.generate());

  var filePath = folderPath + path.sep + filename;

  fs.ensureDirSync(folderPath);

  fs.writeFileSync(filePath, contents);

  return {file:filePath, folder:folderPath};
};

TestHelper.prototype.generateHappnProtocolRunnerConfig = function(){
  return {

  };
};


module.exports = TestHelper;