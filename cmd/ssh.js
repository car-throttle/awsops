var _ = require('lodash');
var async = require('async');
var aws = require('../lib/aws');
var path = require('path');
var readline = require('readline');
var spawn = require('child_process').spawn;
var table = require('../lib/table');
var util = require('util');

module.exports = function (config, args, callback) {
  config = config || {};
  var ssh_exec = args._.slice(1);

  aws.lookupEc2Instances(config.ec2 || {}, _.pick(args, args.options), (err, instances) => {
    if (err) return callback(err);
    if (!Array.isArray(instances) || !instances.length) return next(new Error('No instances found'));

    if (ssh_exec.length) {
      console.log(table(instances, [
        'InstanceId', 'Name', 'PublicIpAddress', 'PrivateIpAddress', 'LaunchTime', 'State'
      ]));

      return async.eachSeries(instances, (instance, next) => sshToInstance(instance, {
        config: config.ssh || {},
        exec: ssh_exec,
        verbose: args.verbose
      }, next), callback);
    }

    instances.forEach((i, v) => i.ID = '#' + (v + 1));
    console.log(table(instances, [ 'ID', 'InstanceId', 'Name', 'PublicIpAddress', 'LaunchTime', 'State' ]));
    if (instances.length === 1 && instances[0]) return sshToInstance(instances[0], callback);

    var rl = readline.createInterface(process.stdin, process.stdout);
    rl.question('[awsops] Which server would you like to connect to? [1..' + instances.length + '] ', (answer) => {
      rl.close();
      if (answer.trim().length === 0) return callback(new Error('You didn\'t select a server :('));

      var instance = instances[(parseInt(answer.trim(), 10) || 0) - 1];
      if (!instance) return callback(new Error('"' + answer + '" is not a valid server :('));

      sshToInstance(instance, callback);
    });
  });
};

module.exports.formatKeyPath = function (keypath) {
  if (keypath.indexOf('~') === 0) return path.join(process.env.HOME, keypath.substr(1));
  else if (keypath.indexOf('/') === 0) return keypath;
  return path.resolve(keypath);
};

var sshToInstance = function (instance, opts, callback) {
  if (arguments.length === 2) {
    callback = opts;
    opts = {};
  }

  opts.config = opts.config || {};
  opts.config.keys = opts.config.keys || {};

  console.log('[awsops] Connecting to %s (%s) (with %s) ...', instance.Name, instance.InstanceId, instance.KeyName);
  var ssh_args = [];

  ssh_args.push(util.format('%s@%s', opts.config.user || 'ubuntu', instance.PublicIpAddress));
  ssh_args.push('-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null');
  if (instance.KeyName) {
    if (!opts.config.keys || !opts.config.keys.hasOwnProperty(instance.KeyName)) ssh_args.push('-i', instance.KeyName);
    else ssh_args.push('-i', module.exports.formatKeyPath(opts.config.keys[instance.KeyName]));
  }

  if (Array.isArray(opts.exec) && opts.exec.length) ssh_args = ssh_args.concat([ '-q', '--' ], opts.exec);
  if (opts.verbose >= 1) console.log('ssh', ssh_args.join(' '));

  var ssh = spawn('ssh', ssh_args, { stdio: 'inherit' });
  ssh.on('close', () => callback());
};
