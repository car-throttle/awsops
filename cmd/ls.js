var _ = require('lodash');
var aws = require('../lib/aws');
var table = require('../lib/table');

module.exports = function (config, args, callback) {
  args.options = [ 'id', 'name', 'security_group' ];
  if (args['security-group']) args.security_group = args['security-group'];

  aws.lookupEc2Instances(config.ec2 || {}, _.pick(args, args.options), function (err, instances) {
    if (err) return callback(err);

    if (_.isString(args.only)) {
      console.log(_.map(instances, args.only).filter(function (value) {
        return value && value.length;
      }).join(' '));
    }
    else {
      console.log(table(instances, [
        'InstanceId', 'Name', 'PublicIpAddress', 'PrivateIpAddress', 'LaunchTime', 'State'
      ]));
    }

    callback();
  });
};
