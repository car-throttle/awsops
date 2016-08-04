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
$ awsops [--auth path/to/auth.json] <command> [options]
```

## Notes

- Questions? Awesome! [Open an issue](https://github.com/car-throttle/awsops/issues/) to get started!
