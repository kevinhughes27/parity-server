parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg?branch=master)](https://travis-ci.org/kevinhughes27/parity-server)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Server Setup
------------

1. You will need `python` (version 3) (with `pip`) and `sqlite` on your local machine.
2. To install python dependencies run `pip install -r requirements.txt` (You may need Run as administrator depending on your security settings)
3. Start the python server with this command `python server/app.py`
4. Create your database by running `python server/cli.py init_db` and then seed it with `python server/seed.py`
5. You can inspect the server responses at `http://localhost:5000/api/weeks/1` and `http://localhost:5000/api/stats` etc.

On production the python server serves a static build of the client. This can be tested locally by running yarn build and then visiting localhost:5000.


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
- VS2017 installs an older version of node. Get the latest version, then ensure it is referenced correctly in the path by going to Tools->Options->Projects and Solutions->Web Package Management->External Web Tools, then add the Node install directory to the top of the list
- VS2017 installs Python36 at C:\Program Files. Be sure to add C:\Program Files\Python36 and C:\Program Files\Python36\Scripts to your PATH


Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/test/one.json -H "Content-Type: application/json" http://localhost:5000/upload
```

To reset your local database delete the `db.sqlite` file and restart the python server.

There is also an automated test suite which can be run using the `python test.py`.


Operations
----------

This app is deployed to Heroku.


To create the database run `heroku run python server/init_db.py`


To sync teams from Zuluru run `heroku run python server/zuluru_sync.py`


To backup the database (only the raw games data the rest is calculated by the app) run `python server/cli.py backup`


To seed the production database use the seed script with the `prod` command line argument `python server/cli.py seed --prod`


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
