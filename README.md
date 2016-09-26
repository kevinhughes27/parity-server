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

    2. Node server receives the request and spawns a process to parse the events

    3. The game is saved to the database and a `201` is returned to the client

    4. (Not implemented) Node sends the data to another data source (Google Sheets)

    5. All `games` processed by the app are visible at `/games` and each week of stats is at `/weeks`


Setup
-----

Dependencies:
  * node / npm
  * mongodb

Then run `npm install` to get the required modules.


Running:
--------
  To run the server locally by starting it with `npm start`

  Then run the following command to send a job to the server:

  ```
  curl -X POST -d '{"week": 1, "events": ["Pull\tMike", "Direction\t<<<<<<", "POINT\tJill\tPass\tBob"]}' -H "Content-Type: application/json" http://localhost:3000/upload
  ```

  To clear all the data saved in Redis run `redis-cli FLUSHALL`


Testing
-------
  run `npm test`

  to run a single test: `mocha <path_to_test> --grep <something unique in the test name>`
