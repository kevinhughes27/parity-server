parity-server
=============

`events => stats` parser and job processing microservice for parity league stats.

Parser
------

The parse is a standalone javascript function that takes an array of `events` as input and produces an `object` containing the stats for each player. Each event in the array can be either a tab (`\t`) separate string or an array (aka the string but already split).

eg. input:

tsv (this is what I get if I copy and paste from the google doc):
```
[
  "    Throw Away\tChris Tran\tPass\tJeff Hunt\tPass\tSebastien Belanger",
  "Direction\t<<<<<<",
  "D\tAmos Lee",
  "    POINT\tTanya Gallant\tPass\tAmos Lee\tPass\tJay Thor Turner\tPass\tClare Gee\tPass\tNick Theriault\tPass\tAmos Lee",
]
```

array (this is what AppScript returns from `getRange`):
```
[
  ["Pull", "Craig Anderson", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["Direction", ">>>>>>", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["", "", "POINT", "Nick Theriault", "Pass", "Stanley Kent", "Pass", "Edwin Wong", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["Direction", "<<<<<<", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["", "", "POINT", "Jay Thor Turner", "Pass", "Jeff Hunt", "Pass", "Vanessa Lyon", "Pass", "Jay Thor Turner", "Pass", "Vanessa Lyon", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
]

```

The parser is standalone javascript and can be used in any js environment (browser, AppScript, or node)


ParityServer
------------

**Flow**:
  1. Stats Keeping Client `POSTs` a JSON object to the server. For an example request see the `test/cases` directory
  2. Node server receives the request and spawns a process to parse the events
  3. The input and output is saved in Redis and a `201` is returned to the original client
  4. (Not implemented) Node sends the data to another data source (Google Sheets)
  5. All requests processed by the app are visible at `/` (with live reloading!)


Development:
------------

Before running the server make sure you have a redis instance running. You can start redis by running `redis-server`

Now you can test the server locally by starting it with `npm start`

Then run the following command to send a job to the server:

```
curl -X POST -d @test/cases/week1_events.json -H "Content-Type: application/json" http://localhost:3000/upload
```

To clear all the data saved in Redis run `redis-cli FLUSHALL`


Setup
-----

Dependencies:
  * node / npm
  * redis

Then run `npm install` to get the required modules.


Testing
-------
run `npm test`

also you can run a single test with `mocha <path_to_test> --grep <something unique in the test name>`


Deploying
---------

This script is currently deployed as a Google AppsScript library.

run `npm run deploy`

If you get errors try removing the `.credentials/credentials.json`

After pushing the new code you need to save a new version of the script in AppScript and then update the version in any projects using the library.
