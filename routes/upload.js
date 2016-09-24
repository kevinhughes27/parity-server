var express = require('express');
var router = express.Router();

var background = require('background-process');

// upload games raw events
router.post('/upload', function(req, res) {
  eventsUpload = req.body;
  background.start('jobs/parse_job.js', eventsUpload);
  res.status(202).send();
});

module.exports = router;
