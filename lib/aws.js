var _ = require('lodash');
var AWS = require('aws-sdk');
var fs = require('fs');
var helper = module.exports = {};
var path = require('path');
var ProgressBar = require('progress');

helper.deleteObjects = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  if (!opts || !opts.bucket) return callback(new Error('Missing bucket from opts'));
  if (!Array.isArray(opts.objects)) return callback(new Error('Missing objects list from opts'));

  var s3 = (!config || _.isPlainObject(config)) ? (new AWS.S3(config || {})) : config;

  s3.deleteObjects({
    Bucket: opts.bucket,
    Delete: {
      Objects: opts.objects.map((key) => { Key: '' + key })
    }
  }, function (err, res) {
    if (err) callback(err);
    else if (!res || !res.Deleted || !Array.isArray(res.Deleted)) callback(new Error('Invalid error from S3 :('));
    else callback(null, res.Deleted.length);
  });
};

helper.lookupEc2Instances = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  var ec2Opts = {};
  var filters = [];
  opts = opts || {};

  if (_.isString(opts.id)) filters.push({ Name: 'instance-id', Values: [ opts.id ] });
  if (_.isString(opts.name)) filters.push({ Name: 'tag:Name', Values: [ opts.name ] });
  if (_.isString(opts.state)) filters.push({ Name: 'instance-state-name', Values: [ opts.state ] });
  if (_.isString(opts.security_group)) filters.push({ Name: 'instance.group-name', Values: [ opts.security_group ] });

  if (filters.length) ec2Opts.Filters = filters;

  var ec2 = (!config || _.isPlainObject(config)) ? (new AWS.EC2(config || {})) : config;

  /**
   * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property
   */
  ec2.describeInstances(ec2Opts, function (error, data) {
    if (error) return callback(error);
    if (!data || !data.Reservations) return callback(null, null);

    // console.log(_(data.Reservations).map('Instances').flatten().value());

    callback(null, _(data.Reservations).map('Instances').flatten().map(function (instance) {
      var machine = _.pick(instance, [
        'InstanceId', 'ImageId', 'State', 'InstanceType', 'LaunchTime', 'KeyName',
        'PrivateDnsName', 'PrivateIpAddress', 'PublicDnsName', 'PublicIpAddress',
        'Tags', 'SecurityGroups'
      ]);

      var securityGroups = {};
      var tags = {};

      machine.SecurityGroups.forEach(function (group) {
        securityGroups[group.GroupId] = group.GroupName;
      });

      machine.Tags.forEach(function (tag) {
        tags[tag.Key] = tag.Value;
      });

      machine.SecurityGroups = securityGroups;
      machine.State = machine.State.Name;
      machine.Tags = tags;

      machine.Name = machine.Tags.Name || '';

      return machine;
    }).value());
  });
};

helper.lookupEc2Images = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  var ec2Opts = {};
  var filters = [];
  opts = opts || {};

  if (_.isString(opts.name)) filters.push({ Name: 'tag:Name', Values: [ opts.name ] });
  if (_.isString(opts.state)) filters.push({ Name: 'instance-state-name', Values: [ opts.state ] });
  if (_.isString(opts.security_group)) filters.push({ Name: 'instance.group-name', Values: [ opts.security_group ] });

  if (filters.length) ec2Opts.Filters = filters;

  var ec2 = (!config || _.isPlainObject(config)) ? (new AWS.EC2(config || {})) : config;

  /**
   * http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeImages-property
   */
  ec2.describeImages(ec2Opts, function (err, data) {
    if (err) return callback(err);
    if (!data || !data.Images) return callback(null, null);

    callback(null, _.chain(data.Images).map(function (image) {
      var machine = _.pick(image, [ 'ImageId', 'State', 'Name', 'CreationDate', 'Tags' ]);

      var tags = {};
      machine.Tags.forEach(function (tag) {
        tags[tag.Key] = tag.Value;
      });
      machine.Tags = tags;

      machine.NickName = machine.Tags.Name || '';

      return machine;
    }).value());
  });
};

helper.downloadFileFromS3 = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  if (!opts || !opts.bucket) return callback(new Error('Missing bucket from downloadFileFromS3 opts'));
  if (!opts.local_path) return callback(new Error('Missing local_path from downloadFileFromS3 opts'));
  if (!opts.remote_path) return callback(new Error('Missing remote_path from downloadFileFromS3 opts'));

  var s3 = (!config || _.isPlainObject(config)) ? (new AWS.S3(config || {})) : config;
  // console.log('Downloading ' + opts.bucket + ' ' + opts.remote_path + ' to ' + opts.local_path);

  helper.fileExists(s3, { bucket: opts.bucket, remote_path: opts.remote_path }, function (err, file) {
    if (err) return callback();
    if (!file) return callback(new Error(util.format('Missing file %s', opts.remote_path)));

    var bar = null;
    if (!opts.silence) {
      bar = new ProgressBar('Downloading ' + path.basename(opts.local_path) + ' [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: parseInt(file.ContentLength, 10)
      });
    }

    var dest = fs.createWriteStream(opts.local_path)
      .on('error', function (err) {
        callback(err);
      })
      .on('finish', function () {
        callback(null, opts);
      });

    s3.getObject({
        Bucket: opts.bucket,
        Key: opts.remote_path
      })
      .createReadStream()
      .on('data', function (chunk) {
        if (bar) bar.tick(chunk.length);
      })
      .on('error', function (err) {
        callback(err);
      })
      .pipe(dest);
  });
};

helper.fileExists = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  if (!opts || !opts.bucket) return callback(new Error('Missing bucket from opts'));
  if (!opts.remote_path) return callback(new Error('Missing remote_path from opts'));

  var s3 = (!config || _.isPlainObject(config)) ? (new AWS.S3(config || {})) : config;

  s3.headObject({
    Bucket: opts.bucket,
    Key: opts.remote_path
  }, function (err, file) {
    if (err && err.code === 'NotFound') callback();
    else if (err) callback(err);
    else callback(null, file);
  });
};

helper.listDirectoryOnS3 = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  if (!opts || !opts.bucket) return callback(new Error('Missing bucket from uploadFileToS3 opts'));
  if (opts.hasOwnProperty('page') && (!opts.page || opts.page < 0)) {
    return callback(new Error('Page must be positive'));
  }
  if (opts.hasOwnProperty('limit') && (!opts.limit || opts.limit < 0)) {
    return callback(new Error('Limit must be positive'));
  }

  var s3 = (!config || _.isPlainObject(config)) ? (new AWS.S3(config || {})) : config;

  var params = { Bucket: opts.bucket };
  if (opts.prefix) params.Prefix = opts.prefix;

  s3.listObjects(params, function (err, res) {
    if (err) return callback(err);
    if (!res || !res.Contents || !Array.isArray(res.Contents)) return callback(new Error('Invalid response from S3'));

    var contents = res.Contents
      /**
       * Select the fields we want regarding each file
       */
      .map(function (file) {
        return _(file)
          .pick([ 'Bucket', 'Key', 'ETag', 'LastModified', 'Size' ])
          .extend({
            Bucket: opts.bucket
          })
          .value();
      })
      /**
       * Next, sort the files in order of last modifed date!
       */
      .sort(function (first, second) {
        if (first.LastModified < second.LastModified) return 1;
        else if (first.LastModified > second.LastModified) return -1;
        else return 0;
      });

    if (opts.page && opts.limit) {
      contents = contents.slice((opts.page * opts.limit) - opts.limit, opts.page * opts.limit);
    }

    callback(null, contents);
  });
};

helper.uploadFileToS3 = function (config, opts, callback) {
  if (arguments.length === 2) {
    opts = config;
    callback = opts;
    config = {};
  }

  if (!opts || !opts.bucket) return callback(new Error('Missing bucket from uploadFileToS3 opts'));
  if (!opts.local_path) return callback(new Error('Missing local_path from uploadFileToS3 opts'));
  if (!opts.remote_path) return callback(new Error('Missing remote_path from uploadFileToS3 opts'));

  // console.log('Uploading ' + opts.local_path + ' to ' + opts.bucket + ' ' + opts.remote_path);

  var s3 = (!config || _.isPlainObject(config)) ? (new AWS.S3(config || {})) : config;
  var params = {
    Body: fs.createReadStream(opts.local_path),
    Bucket: opts.bucket,
    Key: opts.remote_path
  };

  if (opts.acl) params.ACL = opts.acl;
  if (opts.content_type) params.ContentType = opts.content_type;

  s3.upload(params).send(callback);
};
