const path     = require('path');
const async    = require('async');
const express  = require('express');
const cheerio  = require('cheerio');
const router   = express.Router();
const settings = require('../utils').settings;

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

let originalUrl, autocomplete;

// Cache the handles list for autocomplete
async.parallel([
  cb => Handle.getAll().then(data => {
    autocomplete = JSON.stringify(data.map(item => item.handle));
    cb();
  })
], () => {
  main();
});


function main() {

  router.all('*', (req, res, next) => {
    originalUrl = req.app.get('originalUrl');
    next();
  });

  /* GET home page. */
  router.get('/', function(req, res, next) {
    let page = Number((req.query.page || 1));
    if (page < 1) page = 1;

  let tweets, totalTweets;
    async.parallel([
      cb => Tweet.getAllDeleted((page*25)-25).then(data => {
        tweets = data.tweets;
        totalTweets = data.total;
        cb();
      })
    ], () => {
      let tweetData = [];

      async.eachLimit(tweets, 1, (tweet, cb) => {
        Tweet.getTweetTxt(tweet.tweetid).then(data => {
          tweetData.push(data);
          cb();
        });
      }, () => {
        res.render('stream', { autocomplete, basehref: settings.general.basehref, tweets: tweetData, originalUrl, totalTweets });
      });
    });
  });

  router.get('/leaderboards', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('leaderboards', {autocomplete, basehref: settings.general.basehref, originalUrl, handles});
    });
  });

  router.get('/profileImg/:img', function(req, res, next) {
    res.sendFile(path.resolve(__dirname + '/../data/profileImg/' + req.params.img));
  });

  router.get('/:handle', function(req, res, next) {
    let handle = req.params.handle;
    if (handle === "favicon.ico") return;

    Tweet.genTimeline(handle).then(html => {
      res.send(html);
    }, err => {
      res.redirect(`/`);
    });
  });

  router.get('/:handle/status/:id', function(req, res, next) {
    let handle = req.params.handle;
    let id     = req.params.id;

    Tweet.genTweetPage(handle, id).then(html => {
      res.send(html);
    }, err => {
      res.redirect(`/${handle}`);
    });
  });
}

module.exports = router;
