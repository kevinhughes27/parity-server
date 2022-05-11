parity-server [![CircleCI](https://circleci.com/gh/kevinhughes27/parity-server/tree/master.svg?style=svg)](https://circleci.com/gh/kevinhughes27/parity-server/tree/master)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Server Setup
------------

1. You will need `python` (version 3) (with `pip`). You may need to run the following commands as `python3` explicitly
2. To install python dependencies run `pip install -r requirements.txt` (You may need run as administrator depending on your security settings)
3. Run the python server with this command `python server/app.py`
5. You can inspect available leagues at at `http://localhost:5000/api/leagues`
6. Then league API calls like `http://localhost:5000/api/10/weeks/1` and `http://localhost:5000/api/10/stats` (where `10` is the league_id) etc.

On production the python server serves a static build of the client. This can be tested locally by running yarn build and then visiting localhost:5000 (note that you need to run the server from inside the server folder or the relative path to the client won't work. e.g. `cd server && python app.py`)


Client Setup
------------

1. You will need to install [node](https://nodejs.org/en/) on your computer
2. Install `yarn` by running the command `npm install -g yarn`
3. Install the javascript dependencies by running `yarn install` in the `web` directory
4. Start the client by running `yarn start` in the `web` directory. It will open a browser window with the app running on your computer. If you make changes to the code the window will reload with the changes.

Note that the client connects to the production server by default. This is safe to do because the client is read-only. This enables an easier development experience for anyone working only on the frontend. If you need to connect to a local server update the `proxy` to point to the local server `http://localhost:5000` in the `web/package.json` file.


Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/test/one.json -H "Content-Type: application/json" http://localhost:5000/submit_game
```

To reset your local database you can reset the db file using git checkout.

There is also an automated test suite which can be run using the `python test.py`.


Production Setup (AWS)
----------------------

1. Create a new EC2 instance in AWS

2. Download the ssh key and `chmod 400` it

3. ssh to the instance using something like:

  `ssh -i ~/Downloads/parity.pem ubuntu@ec2-35-183-174-34.ca-central-1.compute.amazonaws.com`

  The IP address is listed in the AWS console. Note this IP changes.

4. On the instance run `sudo apt-get update` and then install pip `sudo apt-get install python3-pip`

5. Now we can `sudo pip3 install -r requirements.txt`

6. We also need to install node:
  `curl -sL https://deb.nodesource.com/setup_14.x -o /tmp/nodesource_setup.sh`
  `sudo bash /tmp/nodesource_setup.sh`
  then `sudo apt-get update && sudo apt-get install nodejs`
  and yarn `curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null`
  `sudo apt-get update && sudo npm install -g yarn`

7. Add/ensure a new inbound network rule for https on port 443

8. Create an Elastic IP and connect it to the instance

9. `sudo flask run --host=0.0.0.0 --port=443 --cert=adhoc` functions but is only a single worker

10. Create a nginx config and self signed certificate. This is a good reference:
https://dev.to/chand1012/how-to-host-a-flask-server-with-gunicorn-and-https-942

```
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    ssl_certificate /etc/ssl/certs/selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/selfsigned.key;

    ssl_dhparam /etc/nginx/dhparam.pem;
    location / {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header HOST $http_host;
                proxy_pass http://127.0.0.1:8080;
                proxy_redirect off;
    }
}
```

11. Then start gunicorn from the parity-server directory:
`gunicorn --chdir=server --workers=2 --bind=127.0.0.1:8080 app:app`

🎉 https://3.98.197.218/

best references for what I am trying to do:
https://www.twilio.com/blog/deploy-flask-python-app-aws
https://dev.to/chand1012/how-to-host-a-flask-server-with-gunicorn-and-https-942


Operations
----------

To sync teams from Zuluru:

```
heroku run python server/cli.py zuluru-sync
```

To correct errors in the most recent week of stats do the following:

    1. First backup the data locally `python server/cli.py backup --week 6`

    2. Connect to the production database

    ```
    sqlite3 server/db.sqlite
    ```

    Then remove the data from the production database:

    ```sql
    DELETE FROM stats WHERE game_id IN (SELECT id FROM game WHERE week = 9 AND league_id = 15);
    DELETE FROM game WHERE week = 9 AND league_id = 15;
    ```

    3. Lastly re-seed the given week after making the edits `python3 server/cli.py re_upload --prod True --week 9`


Android Release
---------------

To build a new Android release you will need the signing key (ask someone for it) and then you'll need to make a `keystore.properties` file in the android directory. This file needs to look like:

`parity-server/android/keystore.properties`:
```
keyPassword=
storePassword=
```

Then choose Build -> Generate Signed Bundle/APK. Note the destination directory in the last step


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
