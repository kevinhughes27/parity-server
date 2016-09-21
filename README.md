parity-server [![Build Status](https://travis-ci.org/kevinhughes27/parity-server.svg)](https://travis-ci.org/kevinhughes27/parity-server)
=============

`events => stats` job processing microservice for parity league stats.

Parser
------
The parse is a standalone javascript module. For more info checkout the [repository](https://github.com/kevinhughes27/parity-parser).


ParityServer
------------
  **Flow**:

    1. Stats Keeping Client `POSTs` a JSON object to the server.

    2. Node server receives the request and spawns a process to parse the events

    3. The input and output is saved in Redis and a `201` is returned to the original client

    4. (Not implemented) Node sends the data to another data source (Google Sheets)

    5. All requests processed by the app are visible at `/` (with live reloading!)

  Screenshot:
    ![parity-server screenshot](https://raw.githubusercontent.com/kevinhughes27/parity-server/master/server_screenshot.png)

Development Setup
-----------------
  Dependencies:
    * node / npm
    * redis

  Then run `npm install` to get the required modules.

  Before running the server make sure you have a redis instance running. You can start redis by running `redis-server`


Development:
------------
  To run the server locally by starting it with `npm start`

  Then run the following command to send a job to the server:

  ```
  curl -X POST -d '{"events": ["Pull\tMike", "Direction\t<<<<<<", "POINT\tJill\tPass\tBob"]}' -H "Content-Type: application/json" http://localhost:3000/upload
  ```

  To clear all the data saved in Redis run `redis-cli FLUSHALL`


Testing
-------
  run `npm test`

  also you can run a single test with `mocha <path_to_test> --grep <something unique in the test name>`
