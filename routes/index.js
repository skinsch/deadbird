const async    = require('async');
const express  = require('express');
const cheerio  = require('cheerio');
const router   = express.Router();
const settings = require('../utils').settings;

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

/* GET home page. */
router.get('/', function(req, res, next) {
  Tweet.getAllDeleted((Number((req.query.page || 1))*25)-25).then(tweets => {
    let tweetData = [];

    async.eachLimit(tweets, 1, (tweet, cb) => {
      Tweet.getTweetTxt(tweet.tweetid).then(data => {
        tweetData.push(data);
        cb();
      });
    }, () => {
      res.render('stream', { basehref: settings.general.basehref, tweets: tweetData });
    });
  });
});

router.get('/:handle', function(req, res, next) {
  let handle = req.params.handle;
  if (handle === "favicon.ico") return;

  Tweet.genTimeline(handle).then(html => {
    res.send(html);
  });

});

router.get('/:handle/status/:id', function(req, res, next) {
  let handle = req.params.handle;
  let id     = req.params.id;

  Tweet.genTweetPage(handle, id).then(html => {
    res.send(html);
  });
});

module.exports = router;
