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
