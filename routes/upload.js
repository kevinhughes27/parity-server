var express = require('express');
var router = express.Router();

var child_process = require('child_process');

// upload games raw events
router.post('/upload', function(req, res) {
  console.log('POST /upload');
  var io = req.app.get('socketio');

  var job = child_process.spawn('node',
    ['jobs/parse_job.js', JSON.stringify(req.body)]
  );

  var result;
  job.stdout.on('data', function (data) {
    result = JSON.parse(data);
  });

  job.on('close', function(code) {
    res.status(201).send(result);
    io.emit('new_result', result);
  });
});

module.exports = router;
