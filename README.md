parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg?branch=master)](https://travis-ci.org/kevinhughes27/parity-server)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Setup
-----

1. You will need `python` (version 3) (with `pip`) and `node` (with `yarn`) and `sqlite` on your local machine.
2. To install python dependencies run `pip install -r requirements.txt` (You may need Run as administrator depending on your security settings)
3. Start the python server with this command `python server/app.py`
4. Create your database by running `python server/init_db.py` and then seed it with `python server/seed.py`
5. Install client dependencies: from the client directory run `yarn install`
6. Start the client by running `yarn start`

Yarn will start a local server on port 3000 for developing on the frontend of the website. The yarn development server will proxy all API requests to port 5000 where it expects the python server to be running. The python server returns data to the frontend. On production the python server serves a static build of the frontend (this can be tested locally by running yarn build and then visiting localhost:5000).

Additional notes for those using Visual Studio 2017, depending on the selected workload
- VS2017 installs an older version of node. Get the latest version, then ensure it is referenced correctly in the path by going to Tools->Options->Projects and Solutions->Web Package Management->External Web Tools, then add the Node install directory to the top of the list
- VS2017 installs Python36 at C:\Program Files. Be sure to add C:\Program Files\Python36 and C:\Program Files\Python36\Scripts to your PATH
- If yarn is not there, can use this to get it: npm install -g yarn

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


To backup the database (only the raw games data the rest is calculated by the app) run `python server/backup.py`


To seed the production database uncomment the production url in `server/seed.py` and run the script locally `python server/seed.py`


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
