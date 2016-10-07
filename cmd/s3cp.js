var aws = require('../lib/aws');
var path = require('path');
/**
 * s3cp s3://bucket/path/to/s3-item.txt
 *   => Download to PWD/s3-item.txt
 * s3cp s3://bucket/path/to/s3-item.txt folder/something.txt
 *   => Download to PWD/folder/something.txt
 * s3cp file.txt s3://bucket/
 *   => Upload file.txt to s3://bucket/file.txt
 * s3cp file.txt s3://bucket/somefile.txt
 *   => Upload file.txt to s3://bucket/somefile.txt
 */
module.exports = function (config, args, callback) {
  var s3cp_args = args._.slice(1);

  // Allow easy downloading to this PWD (first example in comment above)
  if (s3cp_args[0] && !s3cp_args[1] && s3cp_args[0].indexOf('s3://') === 0) s3cp_args[1] = '';

  // Reject if two arguments weren't given
  if (s3cp_args.length !== 2) return callback(new Error('You need two arguments: [src] & [dest]'));

  var fn = null;
  var s3src = null;

  if (s3cp_args[0].indexOf('s3://') === 0 && s3cp_args[1].indexOf('s3://') === 0) {
    // Duplicating on S3: copyObject
    return callback(new Error('Both arguments are s3-bound, copying between S3 isn\'t supported (yet)!'));
  }
  else if (s3cp_args[0].indexOf('s3://') === 0 && s3cp_args[1].indexOf('s3://') !== 0) {
    // Downloading from S3: downloadFileFromS3
    s3src = parseS3url(s3cp_args[0]);
    if (!s3cp_args[1]) s3cp_args[1] = path.basename(s3src.path);

    fn = aws.downloadFileFromS3.bind(aws, config.s3 || {}, {
      bucket: s3src.bucket,
      remote_path: s3src.path,
      local_path: s3cp_args[1],
      progress: args.quiet === true ? false : true
    });
  }
  else if (s3cp_args[0].indexOf('s3://') !== 0 && s3cp_args[1].indexOf('s3://') === 0) {
    // Uploading to S3: uploadFileToS3
    s3src = parseS3url(s3cp_args[1]);
    if (!s3src.path) s3src.path = path.basename(s3cp_args[0]);

    fn = aws.uploadFileToS3.bind(aws, config.s3 || {}, {
      local_path: s3cp_args[0],
      bucket: s3src.bucket,
      remote_path: s3src.path,
      progress: args.quiet === true ? false : true
    });
  }
  else {
    return callback(new Error('Neither arguments are s3-bound, you can do this yourself with: $ cp'));
  }

  if (typeof fn !== 'function') callback(new Error('Error working out which function to run'));
  else fn(function (err) {
    callback(err);
  });
};

var parseS3url = function (input) {
  if (input.indexOf('s3://')) throw new Error('Path ' + input + ' does not start with s3://');
  input = input.substr(5).split('/');

  return {
    bucket: input.shift(),
    path: input.join('/')
  };
};
