# AWSOPS

`awsops` is a simplified CLI utility to help you interact with your AWS infrastructure.

## Installation

```
$ npm install -g awsops
```

## Examples

List all EC2 instances with a particular name:

```
$ awsops ls --name prod-serv
┌────────────┬───────────┬─────────────────┬──────────────────┬──────────────┬─────────┐
│ InstanceId │ Name      │ PublicIpAddress │ PrivateIpAddress │ LaunchTime   │ State   │
├────────────┼───────────┼─────────────────┼──────────────────┼──────────────┼─────────┤
│ i-218369c8 │ prod-serv │ 54.185.61.256   │ 172.30.17.218    │ 20 hours ago │ running │
├────────────┼───────────┼─────────────────┼──────────────────┼──────────────┼─────────┤
│ i-768fa4e6 │ prod-serv │ 107.24.256.132  │ 172.21.8.65      │ 20 hours ago │ running │
└────────────┴───────────┴─────────────────┴──────────────────┴──────────────┴─────────┘
```

SSH into a particular EC2 instance:

```
$ awsops ssh --name prod-serv
┌────┬────────────┬───────────┬─────────────────┬──────────────┬─────────┐
│ ID │ InstanceId │ Name      │ PublicIpAddress │ LaunchTime   │ State   │
├────┼────────────┼───────────┼─────────────────┼──────────────┼─────────┤
│ #1 │ i-218369c8 │ prod-serv │ 54.185.61.256   │ 20 hours ago │ running │
├────┼────────────┼───────────┼─────────────────┼──────────────┼─────────┤
│ #2 │ i-768fa4e6 │ prod-serv │ 107.24.256.132  │ 20 hours ago │ running │
└────┴────────────┴───────────┴─────────────────┴──────────────┴─────────┘
[awsops] Which server would you like to connect to? [1..2] 1
[awsops] Connecting to prod-serv (i-218369c8) (with prod-serv-key) ...
Warning: Permanently added '54.185.61.256' (ECDSA) to the list of known hosts.
Welcome to Ubuntu 14.04.3 LTS (GNU/Linux 3.13.0-48-generic x86_64)

 * Documentation:  https://help.ubuntu.com/

  System information as of Thu Aug  4 11:45:28 UTC 2016

  System load:  0.13              Processes:           104
  Usage of /:   24.2% of 7.74GB   Users logged in:     0
  Memory usage: 43%               IP address for eth0: 172.30.17.218
  Swap usage:   0%

  Graph this data and manage this system at:
    https://landscape.canonical.com/

  Get cloud support with Ubuntu Advantage Cloud Guest:
    http://www.ubuntu.com/business/services/cloud

121 packages can be updated.
82 updates are security updates.

New release '16.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


Last login: Thu Aug  4 11:28:26 2016 from 172.21.8.65
ubuntu@ip-172-31-17-218:~$ # Welcome to your EC2 instance
```

## Usage

```
$ awsops --help
Usage: awsops <command> [options]

Commands:
  ls   List EC2 instances
  ssh  SSH into an EC2 instance

Options:
  --auth            Optionally use a specified file for authentication
  --id              Optionally filter by an EC2 instance ID
  --name            Optionally filter by an EC2 instance's name
  --only            Optionally return a comma-separated list of fields instead
                    of rendering a table
  --security-group  Optionally filter by a security group
  --help            Show help                                          [boolean]
  --verbose         Print info/debug statements                          [count]

Examples:
  awsops ls --security-group example-group
  awsops ssh --name instance-name

Got questions? Check out https://github.com/car-throttle/awsops/
```

## `ls`

```
$ awsops ls [filters]
```

Lists your instances, after filtering using `--id`, `--name` or `--security-group`.

You can also use `--only` to print an individual property of the instances, which can be useful in scripts. Here's an
example of looping through a series of IPs during deployment:

```
$ awsops ls --name prod-serv --only PublicIpAddress
54.185.61.256 107.24.256.132

# In deploy.sh:
PROD_SERVS=$(awsops ls --name prod-serv --only PublicIpAddress)
if [ "$?" -ne "0" ]; then
  echo "Failed to fetch the IPs for prod-serv"
  exit 1
fi

COUNT=$(echo $PROD_SERVS | wc -w)
echo "Deploying to $COUNT prod-serv instances"

for IP in $PROD_SERVS; do
  ssh ubuntu@$IP -i /path/to/instance_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null <<'ENDSSH'
cd /var/app/my-application
git pull
pm2 restart all
ENDSSH
done
```

## `ssh`

```
$ awsops ssh [filters] [-- [arguments]]
```

Connect to your instances, after filtering using `--id`, `--name` or `--security-group`. You can either omit any
arguments, which starts an interactive SSH session as you'd expect, or you can provide arguments to run a set of
commands on each instance one after the other. For example, to check the status of a Node application on each instance
using `pm2`:

```
$ awsops ssh --name prod-serv -- pm2 status
┌────────────┬───────────┬─────────────────┬──────────────────┬──────────────┬─────────┐
│ InstanceId │ Name      │ PublicIpAddress │ PrivateIpAddress │ LaunchTime   │ State   │
├────────────┼───────────┼─────────────────┼──────────────────┼──────────────┼─────────┤
│ i-218369c8 │ prod-serv │ 54.185.61.256   │ 172.30.17.218    │ 20 hours ago │ running │
├────────────┼───────────┼─────────────────┼──────────────────┼──────────────┼─────────┤
│ i-768fa4e6 │ prod-serv │ 107.24.256.132  │ 172.21.8.65      │ 20 hours ago │ running │
└────────────┴───────────┴─────────────────┴──────────────────┴──────────────┴─────────┘
[awsops] Connecting to prod-serv (i-218369c8) (with prod-serv-key) ...
┌──────────────────────┬────┬─────────┬──────┬────────┬─────────┬────────┬──────────────┬──────────┐
│ App name             │ id │ mode    │ pid  │ status │ restart │ uptime │ memory       │ watching │
├──────────────────────┼────┼─────────┼──────┼────────┼─────────┼────────┼──────────────┼──────────┤
│ prod-serv-production │ 0  │ cluster │ 6874 │ online │ 1       │ 71m    │ 242.832 MB   │ disabled │
└──────────────────────┴────┴─────────┴──────┴────────┴─────────┴────────┴──────────────┴──────────┘
 Use `pm2 show <id|name>` to get more details about an app
[awsops] Connecting to prod-serv (i-768fa4e6) (with prod-serv-key) ...
┌──────────────────────┬────┬─────────┬──────┬────────┬─────────┬────────┬──────────────┬──────────┐
│ App name             │ id │ mode    │ pid  │ status │ restart │ uptime │ memory       │ watching │
├──────────────────────┼────┼─────────┼──────┼────────┼─────────┼────────┼──────────────┼──────────┤
│ prod-serv-production │ 0  │ cluster │ 6438 │ online │ 1       │ 70m    │ 454.000 MB   │ disabled │
└──────────────────────┴────┴─────────┴──────┴────────┴─────────┴────────┴──────────────┴──────────┘
 Use `pm2 show <id|name>` to get more details about an app
```

## Authentication

Since this uses [`aws-sdk`](https://npm.im/aws-sdk/) behind the scenes, you can configure your own `~/.aws/credentials`
file or load from environment variables [as described in the Amazon AWS-SDK Node-JS docs][aws-sdk-nodejs-docs]. Or you
can load your own variables by passing a file to `--auth` like so:

```
$ awsops --auth ~/path/to/auth/file.json <command> [options]
```

You can pass a `.ini`, `.json`, `.js`, `.yml` file. Whichever format you prefer.

### Example Config INI

```ini
[ec2]
accessKeyId = XXXXXXXXXXXXXXXXXXXX
secretAccessKey = YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
region = us-east-1

[s3]
accessKeyId = XXXXXXXXXXXXXXXXXXXX
secretAccessKey = YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

[ssh]
keys[prod-serv-key] = ~/src/aws/prod-serv-key.pem
```

### Example Config JSON

```json
{
  "ec2": {
    "accessKeyId": "XXXXXXXXXXXXXXXXXXXX",
    "secretAccessKey": "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "region": "us-east-1"
  },
  "s3": {
    "accessKeyId": "XXXXXXXXXXXXXXXXXXXX",
    "secretAccessKey": "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
  },
  "ssh": {
    "keys": {
      "prod-serv-key": "~/src/aws/prod-serv-key.pem"
    }
  }
}
```

### Example Config YAML

```yml
ec2:
  accessKeyId: XXXXXXXXXXXXXXXXXXXX
  secretAccessKey: YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
  region: us-east-1
s3:
  accessKeyId: XXXXXXXXXXXXXXXXXXXX
  secretAccessKey: YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
ssh:
  keys:
    prod-serv-key: ~/src/aws/prod-serv-key.pem
```

### Configuration Options

| Key  | Description |
| ---- | ---- |
| `default` | Set the default AWS config (same as `AWS.config.update( ... )`) |
| `ec2` | A config object used when creating `EC2` instances |
| `s3` | A config object used when creating `S3` instances |
| `ssh` | A config object used when invoking SSH connections |

For `ec2` & `s3`, these are the same config objects that you'd pass when using the EC2/S3 objects in your own code.

The SSH options available are:

| Property | Description |
| ---- | ---- |
| `keys` | A key-value dictionary where you can define paths to your keys |
| `user` | Optionally you can override the `username` field used in SSH connections (defaults to `ubuntu`) |

## Notes

- When logging into an instance with SSH, you'll notice the line
  `Warning: Permanently added '54.185.61.256' (ECDSA) to the list of known hosts.` This is due to this script negating
  the call to a valid known_hosts file in order to stop your known_hosts becoming overrun with the *hundreds* of EC2
  instances that you're likely to see thanks to autoscaling.
- Questions? Awesome! [Open an issue](https://github.com/car-throttle/awsops/issues/) to get started!

[aws-sdk-nodejs-docs]: http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html
