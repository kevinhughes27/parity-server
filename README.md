parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg?branch=master)](https://travis-ci.org/kevinhughes27/parity-server)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Server Setup
------------

1. You will need `python` (version 3) (with `pip`) and `sqlite` on your local machine. (See Python and SQLite notes below)
2. To install python dependencies run `pip install -r requirements.txt` (You may need run as administrator depending on your security settings)
3. Start the python server with this command `python server/app.py`
4. Create your database by running `python server/cli.py init-db` and then seed it with `python server/cli.py seed`
5. You can inspect the server responses at `http://localhost:5000/api/weeks/1` and `http://localhost:5000/api/stats` etc.

On production the python server serves a static build of the client. This can be tested locally by running yarn build and then visiting localhost:5000 (note that you need to run the server from inside the server folder or the relative path to the client won't work. e.g. `cd server && python app.py`)


Client Setup
------------

1. You will need to install [node](https://nodejs.org/en/) on your computer
2. Install `yarn` by running the command `npm install -g yarn`
3. Install the javascript dependencies by running `yarn install`
4. Start the client by running `yarn start`. It will open a browser window with the app running on your computer. If you make changes to the code the window will reload with the changes.

Note that the client connects to the production server by default. This is safe to do because the client is read-only. This enables an easier development experience for anyone working only on the frontend. If you need to connect to a local server update the `proxy` to point to the local server `http://localhost:5000` in the `client/package.json` file.


Visual Studio 2017
------------------
Additional notes for those using Visual Studio 2017, depending on the selected workload
- If you are initially setting up VS2017, the initial setup wizard will walk you through setting up workloads.
- If you have an existing VS2017, you can access the workloads configuration at Tools->Get Tools and Features.
- You will need the following workloads:
  - Python development
  - Node.js development
- Optionally, you may also want the following Individual components:
  - Git for Windows
  - GitHub Extension for Visual Studio
- Note down the Location setting in the Modifying Visual Studio (ie: workloads configuration) screen. By default, the Community (free) edition is set to C:\Program Files (x86)\Microsoft Visual Studio\2017\Community
- VS2017 installs Python36 under the Shared folder hierarchy one level up from the VS2017 executable folder (eg: C:\Program Files (x86)\Microsoft Visual Studio\Shared\Python36_64). Therefore, be sure to add the following to your PATH:
  - C:\Program Files (x86)\Microsoft Visual Studio\Shared\Python36_64
  - C:\Program Files (x86)\Microsoft Visual Studio\Shared\Python36_64\Scripts
- VS2017 installs an older version of node. Get the latest version, then ensure it is referenced correctly in the path by going to Tools->Options->Projects and Solutions->Web Package Management->External Web Tools, then add the Node install directory to the top of the list

Python and SQLite
-----------------
- Python36 includes sqlite. You can check by running the following:
  python
  import sqlite3
  sqlite3.version # gets the adapter version
  sqlite3.sqlite_version # gets the DB engine version <- this is the version number you should really need
  sqlite3.__path__ # gets the location for sqlite
- If you need to upgrade sqlite, you can download the zip from https://www.sqlite.org/download.html and unpack the sqlite3.dll into Python's DLLs folder (eg: C:\Program Files (x86)\Microsoft Visual Studio\Shared\Python36_64\DLLs)


Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/test/one.json -H "Content-Type: application/json" http://localhost:5000/submit_game
```

To reset your local database delete the `db.sqlite` file and restart the python server.

There is also an automated test suite which can be run using the `python test.py`.


Operations
----------

This app is deployed to Heroku via a git push. This happens automatically when a branch is merged into master.


To create the database run `heroku run python server/init-db.py`


To sync teams from Zuluru run `heroku run python server/cli.py zuluru-sync`


To backup the database (only the raw games data the rest is calculated by the app) run `python server/cli.py backup`. This script also supports a `--week` option to backup a certain week.


To seed the production database use the seed script with the `prod` command line argument `python server/cli.py seed --prod`. This script also supports a `--week` option to seed a certain week.


To correct errors in the most recent week of stats do the following:

1. First backup the data locally `python server/cli.py backup --week 6`

2. Then remove the data from the production database:
```sql
DELETE FROM stats WHERE game_id IN (SELECT id FROM game WHERE week = 6);
DELETE FROM game WHERE week = 6;
```

3. Lastly re-seed the given week after making the edits `python server/cli.py seed --prod --week 6`

Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
