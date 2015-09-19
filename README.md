parity-server
=============

Job processing background for parity league stats

You can test the server locally by starting it with `npm start` or `nodemon` for live-reloading. Then run:

```
curl -X POST -d '{"event_string": "test"}' -H "Content-Type: application/json" http://localhost:3000/upload
```

To clear all the data saved in Redis run `redis-cli FLUSHALL`

Setup
=====

Dependencies:
  * node
  * npm
  * redis

Then run `npm install` to get the required modules.
