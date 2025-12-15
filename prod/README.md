# Production

## Setup (AWS)

1. Create a new EC2 instance in AWS

2. Add/ensure a new inbound network rule for https on port 80 and 443

3. Create an Elastic IP and connect it to the instance
  * `parity.ocua.ca` needs to point to this

4. Download the ssh key and `chmod 400` it

5. ssh to the instance using something like:

  `ssh -i ~/.ssh/parity.pem ubuntu@ec2-35-183-174-34.ca-central-1.compute.amazonaws.com`

  the IP address is listed in the AWS console. Note this IP can change

6. Install the required dependencies `uv` and `caddy`

7. The deploy script will create and update most of the other required files with the exception of the following EnvironmentFiles which need to be created manually.

/home/ubuntu/parity-server.env:

```
PARITY_EDIT_PASSWORD=...
```

/home/ubuntu/zuluru-sync.env:

```
ZULURU_USER=...
ZULURU_PASSWORD=...
```


### SSH Config

Add an entry to `~/.ssh/config` for easy access. Also set up ssh and gpg forwarding to sign commits and push to github from the server.

Ensure gpg-agent is setup locally to start the extra socket. Then add the config:

```
Host parity-server
  HostName 3.98.197.218
  User ubuntu
  IdentityFile ~/.ssh/parity.pem
```


### Deploy

To deploy we use the deploy script `prod/deploy.sh` which will copy the systemd unit files from your computer to the production AWS intance. Then it will reload systemd and restart the units.


```sh
./prod/deploy.sh -r parity-server
```
