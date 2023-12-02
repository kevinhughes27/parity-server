Production Setup (AWS)
----------------------

### Create an Instance
1. Create a new EC2 instance in AWS
2. Add/ensure a new inbound network rule for https on port 80 and 443
3. Create an Elastic IP and connect it to the instance
4. Download the ssh key and `chmod 400` it
5. ssh to the instance using something like:

  `ssh -i ~/Downloads/parity.pem ubuntu@ec2-35-183-174-34.ca-central-1.compute.amazonaws.com`

  The IP address is listed in the AWS console. Note this IP changes

### Setup the API server
1. On the instance run `sudo apt-get update` and then install pip `sudo apt-get install python3-pip`
2. Clone the parity code `git clone https://github.com/kevinhughes27/parity-server.git`
3. Now in the `partiy-server` directory we can `sudo pip3 install -r requirements.txt`
4. `sudo flask run --host=0.0.0.0 --port=443 --cert=adhoc` will now work but it is not a production setup. You can check that the api responds by visiting `<instance_ip>/api/leagues`

### Compile the Javascript
1. We need to compile the javascript locally and upload it to the server because the small AWS instances are not able to compile the frontend. Plus this way is faster and keeps production simpler.
2. Setup node locally as per the development instructions.
3. In the `web` directory run `rm -r build && yarn build`
4. Then remove the build directory on the server and upload the build to the instance:
```
scp -i ~/Downloads/parity.pem -r ./build ubuntu@ec2-35-183-208-68.ca-central-1.compute.amazonaws.com:/home/ubuntu/parity-server/web
```
5. Check that the frontend loads in the browser by running the flask app again and visiting the instance ip.

### Setup the Production server
1. Get an ssl certificate from Let's Encrypt:

```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d parity.ocua.ca
```

Note - this step requires that `parity.ocua.ca` is already pointing to this instance. This can be done by associating the Elastic IP. Reassociating an IP will change how you connect to the instance.

2. Create the nginx dhparam.pem key: `openssl dhparam -out /etc/nginx/dhparam.pem 4096`
3. Remove the `/etc/nginx/sites-enabled/default` file
4. Create a nginx config `/etc/nginx/sites-enabled/parity`:

```
server {
    listen 80;
    server_name parity.ocua.ca;
    return 301 https://parity.ocua.ca$request_uri;
}

server {
    listen 443 ssl;
    server_name parity.ocua.ca;
    ssl_certificate /etc/letsencrypt/live/parity.ocua.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/parity.ocua.ca/privkey.pem;
    ssl_dhparam /etc/nginx/dhparam.pem;
    location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header HOST $http_host;
                proxy_pass http://127.0.0.1:8080;
                proxy_redirect off;
    }
}
```

4. Restart nginx: `systemctl restart nginx`
5. Create a systemd service for the app `/lib/systemd/system/parity-server.service`:

```
[Unit]
Description=Parity Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/parity-server/server
Environment=PARITY_EDIT_PASSWORD=
ExecStart=gunicorn --workers=2 --bind=127.0.0.1:8080 app:app
TimeoutSec=30
Restart=always

[Install]
WantedBy=multi-user.target
```

6. Then start with `systemctl start parity-server.service`


### SSH Config

It is convenient to add an entry to `~/.ssh/config` for easy access and also for setting up ssh and gpg forwarding to sign commits and push to github from the server.

Ensure gpg-agent is setup locally to start the extra socket. Then add the config:

```
Host parity-server
  HostName 3.98.197.218
  User ubuntu
  IdentityFile ~/.ssh/parity.pem
  ForwardAgent yes
  RemoteForward /run/user/1000/gnupg/S.gpg-agent /run/user/1000/gnupg/S.gpg-agent.extra
```

### Zuluru Sync and Backups

Create new [systemd timers](https://wiki.archlinux.org/title/Systemd/Timers) for the scheduled tasks.

For the zuluru sync task `lib/systemd/system/zuluru-sync.timer`:

```
[Unit]
Description=Run Zuluru Sync Daily

[Timer]
OnCalendar=daily

[Install]
WantedBy=timers.target
```

and create the service to be ran by the timer `lib/systemd/system/zuluru-sync.service`:

```
[Unit]
Description=Zuluru Sync

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/parity-server/server
Environment=ZULURU_USER=...
Environment=ZULURU_PASSWORD=...
ExecStart=python3 cli.py zuluru-sync-current
```

The backup systemd files:

parity-backup.timer (this is UTC which == Sunday 9pm EST)
```
[Unit]
Description=Run Parity Backup Sunday Night

[Timer]
OnCalendar=Mon 1:30 America/Toronto

[Install]
WantedBy=timers.target
```

and the unit `lib/systemd/system/parity-backup.service`

```
[Unit]
Description=Parity Backup

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/parity-server/server
ExecStart=/bin/bash -c 'cp db.sqlite /home/ubuntu/backups/db_$(date +%%b-%%d).sqlite'
```

Then enable and start the timer services (`sudo systemctl enable parity-backup.timer` and `sudo systemctl start parity-backup.timer`)

`systemctl list-timers` can be used to make sure the timer is registered.


### References
* https://www.twilio.com/blog/deploy-flask-python-app-aws
* https://dev.to/chand1012/how-to-host-a-flask-server-with-gunicorn-and-https-942
* https://www.ecliptik.com/Forwarding-gpg-agent-over-SSH
* https://mlohr.com/gpg-agent-forwarding/


Deploying
---------

1. Ensure the db is backed up
2. pull the latest code on the server
3. run pip3 install if python packages have changed
4. rebuild frontend if required (clear out old files)
5. restart the gunicorn process with `systemctl`
