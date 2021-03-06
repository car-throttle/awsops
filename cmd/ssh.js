var _ = require('lodash');
var async = require('async');
var aws = require('../lib/aws');
var path = require('path');
var readline = require('readline');
var spawn = require('child_process').spawn;
var table = require('../lib/table');
var util = require('util');

module.exports = function (config, args, callback) {
  args.options = [ 'id', 'name', 'security_group' ];
  if (args['security-group']) args.security_group = args['security-group'];

  var ssh_exec = args._.slice(1);
  var ssh_opts = {
    config: config.ssh || {},
    user: args.user,
    verbose: args.verbose
  };

  var lookupArgs = _.pick(args, [ 'id', 'name', 'security_group' ]);
  lookupArgs.state = 'running';

  aws.lookupEc2Instances(config.ec2 || {}, _.pick(args, args.options), function (err, instances) {
    if (err) return callback(err);
    if (!Array.isArray(instances) || !instances.length) return callback(new Error('No instances found'));

    if (ssh_exec.length) {
      console.log(table(instances, [
        'InstanceId', 'Name', 'PublicIpAddress', 'PrivateIpAddress', 'LaunchTime', 'State'
      ]));

      return async.eachSeries(instances, function (instance, next) {
        sshToInstance(instance, Object.assign({ exec: ssh_exec }, ssh_opts), next);
      }, callback);
    }

    instances.forEach(function (i, v) {
      i.ID = '#' + (v + 1);
    });
    console.log(table(instances, [ 'ID', 'InstanceId', 'Name', 'PublicIpAddress', 'LaunchTime', 'State' ]));
    if (instances.length === 1 && instances[0]) return sshToInstance(instances[0], ssh_opts, callback);

    var rl = readline.createInterface(process.stdin, process.stdout);
    rl.question('[awsops] Server to connect to? [1..' + instances.length + '] ', function (answer) {
      rl.close();
      if (answer.trim().length === 0) return callback(new Error('You didn\'t select a server :('));

      var instance = instances[(parseInt(answer.trim(), 10) || 0) - 1];
      if (!instance) return callback(new Error('"' + answer + '" is not a valid server :('));

      sshToInstance(instance, ssh_opts, callback);
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

  ssh_args.push(util.format('%s@%s', opts.config.user || opts.user || 'ubuntu', instance.PublicIpAddress));
  ssh_args.push('-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null');

  // Add a ProxyCommand if required
  if (opts.config.proxycommand) ssh_args.push('-o', 'ProxyCommand="' + opts.config.proxycommand + '"');

  if (instance.KeyName) {
    if (!opts.config.keys || !opts.config.keys.hasOwnProperty(instance.KeyName)) ssh_args.push('-i', instance.KeyName);
    else ssh_args.push('-i', module.exports.formatKeyPath(opts.config.keys[instance.KeyName]));
  }

  if (Array.isArray(opts.exec) && opts.exec.length) ssh_args = ssh_args.concat([ '-q', '--' ], opts.exec);
  if (opts.verbose >= 1) console.log('ssh', ssh_args.join(' '));

  var ssh = spawn('/bin/sh', [ '-c', 'ssh ' + ssh_args.join(' ') ], { stdio: 'inherit' });
  ssh.on('close', callback);
};
