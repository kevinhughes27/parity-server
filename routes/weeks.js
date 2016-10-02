import express from 'express';
let router = express.Router();
let db = require('mongoskin').db(process.env.MONGODB_URI);
let weeks = db.collection('weeks');

/**
 * @api {get} /weeks List of weeks
 * @apiName GetWeeks
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks', function (req, res) {
  weeks.find().toArray(function(err, items) {
    res.json(items);
  });
});

/**
 * @api {get} /weeks/:week Week
 * @apiName GetWeek
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks/:week', function (req, res) {
  weeks.findOne({week: parseInt(req.params.week)}, function(err, item) {
    res.json(item);
  });
});

module.exports = router;
