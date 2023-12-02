parity-server [![CircleCI](https://circleci.com/gh/kevinhughes27/parity-server/tree/master.svg?style=svg)](https://circleci.com/gh/kevinhughes27/parity-server/tree/master)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) code.

production: [https://parity.ocua.ca](https://parity.ocua.ca)


Server Setup
------------

1. You will need `python3` and `pip3`.
2. To install python dependencies run `pip3 install -r requirements.txt` (You may need run as administrator depending on your security settings)
3. Run the python server with this command `python3 server/app.py`
4. You can inspect available leagues at at `http://localhost:5000/api/leagues`
5. Then league API calls like `http://localhost:5000/api/10/weeks/1` and `http://localhost:5000/api/10/stats` (where `10` is the league_id) etc.

On production the python server serves a static build of the client. This can be tested locally by running yarn build and then visiting localhost:5000 (note that you need to run the server from inside the server folder or the relative path to the client won't work. e.g. `cd server && python3 app.py`)


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

There is also an automated test suite which can be run using the `nosetests3`.


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first if you need any help or have questions.

contact: `kevinhughes27@gmail.com`
