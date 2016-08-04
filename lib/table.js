var _ = require('lodash');
var moment = require('moment');
var Table = require('cli-table');

module.exports = function buildTable(items, fields) {
  if (fields) items = items.map(function (i) { return _.pick(i, fields); });

  var headings = [];
  if (fields) headings = fields;
  else items.forEach(function (i) { headings = headings.concat(Object.keys(i)); });
  headings = _.uniq(headings);

  var indexField = headings.shift();

  var body = items.map(function (instance) {
    var row = {};
    var id = instance[indexField];

    row[id] = headings.map(function (key) {
      return key === 'LaunchTime' ? moment(instance[key]).fromNow() : (instance[key] || 'null');
    });

    return row;
  });

  // console.log(headings);
  // console.log(body);

  var tbl = new Table({
    head: [ indexField ].concat(headings),
    style: { head: [ 'cyan' ] }
  });

  if (body.length) body.forEach(function (item) { tbl.push(item); });

  return tbl.toString();
};
