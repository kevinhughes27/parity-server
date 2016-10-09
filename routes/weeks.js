import express from 'express';
let router = express.Router();

const db = require('monk')(process.env.MONGODB_URI)
const weeks = db.get('weeks');

/**
 * @api {get} /weeks List of weeks
 * @apiName GetWeeks
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks', function (req, res) {
  weeks.find({}, {}, function(err, docs) {
    res.json(docs);
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
