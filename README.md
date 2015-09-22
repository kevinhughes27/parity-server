parity-server
=============

parser and job processing microservice for parity league stats.

**Flow**:
  1. Stats Keeping Client `POSTs` an event string to the server
  2. Node server receives the request and spawns a process to parse the event string
  3. The input and output is saved in Redis and a `201` is returned to the original client
  4. (Not implemented) Node sends the data to another data source (Google Sheets)
  5. All requests processed by the app are visible at `/` (with live reloading!)

The parser is standalone javascript and could be used in other environments (client side, or AppScript for example)

Development:
------------
You can test the server locally by starting it with `npm start` or `nodemon` for live-reloading. Then run:

```
curl -X POST -d '{"event_string": "test"}' -H "Content-Type: application/json" http://localhost:3000/upload
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
