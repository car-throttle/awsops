#!/usr/bin/env node
var yargs = require('yargs')
  .usage('Usage: awsops <command> [options]')
  .demand(1)

  .command('ls', 'List EC2 instances')
  .example('awsops ls --security-group example-group')

  .command('ssh', 'SSH into an EC2 instance')
  .example('awsops ssh --name instance-name')

  .command('s3cp', 'SSH into an EC2 instance')
  .example('awsops s3cp [from] [to]')

  .describe('auth', 'Optionally use a specified file for authentication')
  .nargs('auth', 1)

  .describe('id', 'When using ls or ssh, optionally filter by an EC2 instance ID')
  .nargs('id', 1)

  .describe('name', 'When using ls or ssh, optionally filter by an EC2 instance\'s name')
  .nargs('name', 1)

  .describe('only', 'When using ls or ssh, optionally return a comma-separated list of fields instead of rendering ' +
    'a table')
  .nargs('only', 1)

  .describe('security-group', 'When using ls or ssh, optionally filter by a security group')
  .nargs('security-group', 1)

  .describe('quiet', 'When using s3cp, do not use the progress bar')
  .boolean('quiet')
  .alias('q', 'quiet')

  .help('help')
  .count('verbose')
  .describe('verbose', 'Print info/debug statements')
  .alias('v', 'verbose')

  .epilog('Got questions? Check out https://github.com/car-throttle/awsops/');

var args = yargs.argv;
// Print the args if verbose enough
if (args.verbose >= 2) console.log('Args %j', args);

var AWS = require('aws-sdk');
var config = require('../lib/config');
var fs = require('fs');
var path = require('path');

var cmders = {};
fs.readdirSync(path.join(__dirname, '..', 'cmd')).sort().forEach(function (file) {
  if (path.extname(file) !== '.js') return;

  Object.defineProperty(cmders, path.basename(file, path.extname(file)), {
    enumerable: true,
    get: function () {
      return require(path.join(__dirname, '..', 'cmd', file));
    }
  });
});

var cmd = args._[0];
// If the command doesn't exist, then show a HELP screen
if (!cmd || !cmders.hasOwnProperty(cmd)) {
  console.error('[awsops] ERROR: Unknown command "%s"', cmd);
  yargs.showHelp();
  return process.exit(1);
}

var conf = {};
// If we specified an AUTH file to use, then load it in
if (args.auth) conf = config(path.resolve(args.auth));
// Print the auth file contents if verbose enough
if (args.verbose >= 2) console.log('Config %j', conf);
// If we set default credentials, then set them now
if (conf.default) AWS.config.update(conf.default);

// Run the command, passing it our credentials & arguments
cmders[cmd].call(null, conf, args, function (err, meta) {
  if (err) throw err;
  if (meta) console.log('Meta: %j', meta);
  process.exit(0);
});
