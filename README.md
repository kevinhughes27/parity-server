parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg)](https://travis-ci.org/kevinhughes27/parity-server)
=============

backend for parity league stats.

Parser
------
The parse is a standalone javascript module that converts `events` into `stats`. For more info checkout the [repository](https://github.com/kevinhughes27/parity-parser).


Server
------
  **Flow**:

    1. Stats Keeping Client `POSTs` a JSON object to the server.

    2. Node server receives the request parses the events into stats

    3. The game is saved to the database and a `201` is returned to the client

    4. All `games` processed by the app are visible at `/games` and each week of stats is at `/weeks`

    5. An app to view the data is served from '/'


Setup
-----

Dependencies:
  * node / npm
  * mongodb

Then run `npm install` to get the required modules.


Running:
--------
  To run the server locally by starting it with `npm run start` (or `auto-start` if developing)

  Then run the following command to send a job to the server:

  ```
  curl -X POST -d '{"week": 1, "events": ["Pull\tMike", "Direction\t<<<<<<", "POINT\tJill\tPass\tBob"]}' -H "Content-Type: application/json" http://localhost:3000/upload
  ```

  or you can send a full set of events from `test/files` using:

  ```
  curl -X POST --data @test/files/week1_game1.json -H "Content-Type: application/json" http://localhost:3000/upload
  ```

  To clear all the data saved in the database run `npm run db:reset`


Front End
---------

To develop on the front end app you need to run `npm run dev:frontend` then the script will open your browser to the app.

Testing
-------
  run `npm test`

  to run a single test: `mocha <path_to_test> --grep <something unique in the test name>`
