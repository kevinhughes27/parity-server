parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg?branch=master)](https://travis-ci.org/kevinhughes27/parity-server)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Server Setup
------------

1. You will need `python` (version 3) (with `pip`) and `docker` (with `docker-compose`) on your local machine.
2. To install python dependencies run `pip install -r requirements.txt` (You may need run as administrator depending on your security settings)
3. Start the required services run `sudo docker-compose up -d`
3. Run the python server with this command `python server/app.py`
4. Create your database by running `python server/cli.py init-db` and then populate it with:
    * `python server/cli.py create-leagues`
    * `python server/cli.py zuluru-sync`
    * `python server/cli.py game-sync`
5. You can inspect available leagues at at `http://localhost:5000/api/leagues`
6. Then league API calls like `http://localhost:5000/api/10/weeks/1` and `http://localhost:5000/api/10/stats` (where `10` is the league_id) etc.

Roster sync requires certain zuluru privileges and some offline saved player data. If you need a full database ask for in #parity-dev and someone will help you out.

On production the python server serves a static build of the client. This can be tested locally by running yarn build and then visiting localhost:5000 (note that you need to run the server from inside the server folder or the relative path to the client won't work. e.g. `cd server && python app.py`)


Client Setup
------------

1. You will need to install [node](https://nodejs.org/en/) on your computer
2. Install `yarn` by running the command `npm install -g yarn`
3. Install the javascript dependencies by running `yarn install`
4. Start the client by running `yarn start`. It will open a browser window with the app running on your computer. If you make changes to the code the window will reload with the changes.

Note that the client connects to the production server by default. This is safe to do because the client is read-only. This enables an easier development experience for anyone working only on the frontend. If you need to connect to a local server update the `proxy` to point to the local server `http://localhost:5000` in the `web/package.json` file.


Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/test/one.json -H "Content-Type: application/json" http://localhost:5000/submit_game
```

To reset your local database you can remove the docker volume or delete `server/postgres` and restart the python server.

There is also an automated test suite which can be run using the `python test.py`.


Deploying
---------

This app is deployed to Heroku via a git push. This happens automatically when a branch is merged into master.


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
    heroku pg:psql --app parity-server
    ```

    Then remove the data from the production database:

    ```sql
    DELETE FROM stats WHERE game_id IN (SELECT id FROM game WHERE week = 9 AND league_id = 10);
    DELETE FROM game WHERE week = 9 AND league_id = 10;
    ```

    3. Lastly re-seed the given week after making the edits `python3 server/cli.py re-upload --prod True --week 9`


To create a dump of the postgres database locally:

```
sudo docker exec parity-server_db_1 pg_dump -Fc --no-acl --no-owner -U postgres postgres > pgdump_name
```


To restore a pg_dump on prod:

```
# uploaded the pg backup to google cloud in a public bucket
#
#  allUsers
#  Storage Object Viewer

heroku pg:backups:restore 'https://storage.googleapis.com/parity/pgdump' DATABASE_URL --app parity-server --confirm=parity-server
```

Android Release
---------------

To build a new Android release you will need the signing key (ask someone for it) and then you'll need to make a `keystore.properties` file in the android directory. This file needs to look like:

`parity-server/android/keystore.properties`:
```
keyPassword=
storePassword=
```

Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
