parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg?branch=master)](https://travis-ci.org/kevinhughes27/parity-server)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) server code.

production: [https://parity-server.herokuapp.com/](https://parity-server.herokuapp.com/)


Setup
-----

1. You will need `python` (with `pip`), `node` (with `yarn`) and `sqlite` on your local machine.
2. To install python dependencies run `pip install -r requirements.txt`
3. Start the python server with this command `python app.py`
4. Seed your local database by running: `python seed.py`
4. Install client dependencies: from the client directory run `yarn install`
5. Start the client by running `yarn start`

Yarn will start a local server on port 3000 for developing on the frontend of the website. The yarn development server will proxy all API requests to port 5000 where it expects the python server to be running. The python server returns data to the frontend. On production the python server serves a static build of the frontend (this can be tested locally by running yarn build and then visiting localhost:5000).

Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/ocua_16-17/session1/week1_game1.json -H "Content-Type: application/json" http://localhost:5000/upload
```

To reset your local database delete the `db.sqlite` file and restart the python server.

There is also an automated test suite which can be run using the `python test.py` for the python tests and `yarn test` inside the client directory to run javascript tests.


Zuluru Integration
------------------

If you need to test zuluru scraping or need to set an environment variable create a `.env` file and it will be loaded.


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
