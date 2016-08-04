var fs = require('fs');
var ini = require('ini');
var path = require('path');
var yaml = require('js-yaml');

module.exports = function (filepath) {
  var config = {};

  switch (path.extname(filepath)) {

    case '.ini':
      config = ini.parse(fs.readFileSync(filepath, 'utf-8'));
      break;

    case '.js':
    case '.json':
      config = require(filepath);
      break;

    case '.yml':
      config = yaml.safeLoad(fs.readFileSync(filepath, 'utf8'), {
        filename: filepath
      });
      break;

  }

  return config;
};
