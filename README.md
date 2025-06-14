parity-server [![CircleCI](https://circleci.com/gh/kevinhughes27/parity-server/tree/master.svg?style=svg)](https://circleci.com/gh/kevinhughes27/parity-server/tree/master)
=============

[OCUA Parity League](http://www.ocua.ca/Parity-League) code.

production: [https://parity.ocua.ca](https://parity.ocua.ca)


Server Setup
------------

1. You will need [`uv`](https://github.com/astral-sh/uv) to run `python`
2. To install python dependencies run `uv sync`
3. Run the python server with this command `uv run fastapi dev server/app.py`
4. You can inspect available leagues at at `http://localhost:5000/api/leagues`
5. Then league API calls like `http://localhost:5000/api/10/weeks/1` and `http://localhost:5000/api/10/stats` (where `10` is the league_id) etc.

On production the python server serves a static build of the client. This can be used/tested locally by running yarn build and then visiting http://localhost:8000.


Client Setup
------------

1. You will need to install [node](https://nodejs.org/en/download) and `yarn` on your computer
2. Install the javascript dependencies by running `yarn install` in the `web` directory
3. Start the client by running `yarn dev` in the `web` directory. If you make changes to the code the window will reload with the changes.

Note that the client requires a local server. It is possible to configure the `proxy` in `web/vite.config.js` to point the development client at the production API for doing read only frontend work.


Testing
-------

To test locally by uploading a json file run:

```sh
curl -X POST --data @data/test/one.json -H "Content-Type: application/json" http://localhost:8000/submit_game
```

To reset your local database you can reset the db file using `git restore`.

There is also an automated test suite which can be run using `uv run pytest`.


Contributing
------------

PRs welcome!

If you are interested in contributing (especially if you play in the league!) Feel free to contact me first on slack or by email if you need any help or have questions.
