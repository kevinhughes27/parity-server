parity-server
=============

Job processing background for parity league stats

You can test the server locally by starting it with `npm start` or `nodemon` for live-reloading. Then run:

```
curl -X POST -d '{"event_string": "wat"}' -H "Content-Type: application/json" http://localhost:3000/upload
```
