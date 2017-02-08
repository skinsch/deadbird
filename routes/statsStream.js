const express  = require('express');
const async    = require('async');
const router   = express.Router();
const _        = require('lodash');
const utils    = require('../utils');
const settings = utils.settings;

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

let defaultVars = {};

router.all('*', (req, res, next) => {
  defaultVars = {
    originalUrl:  req.session.originalUrl,
    dates:        utils.get('dates'),
    messages:     req.session.messages,
    autocomplete: utils.get('autocomplete'),
    statUpdate:   utils.get('statUpdate'),
    basehref:     settings.general.basehref,
    socket:       settings.general.socket
  };

  next();
});

router.get('/:date?', (req, res, next) => {
  let date   = (String(req.params.date) || "").replace(/-/g, '/');
  if (utils.get('dates').indexOf(date) === -1) return res.redirect('/');

  let page = Number((req.query.page || 1));
  if (page < 1) page = 1;

  if (utils.get('statsStream')[date][page] === undefined) return res.redirect('/statsStream');
  res.render('statsStream', _.merge({title: `Stats on ${date}`, date, handle: undefined, stats: JSON.stringify(utils.get('stats')['all'])}, utils.get('statsStream')[date][page], defaultVars));
});

router.get('/:handle/:date', (req, res, next) => {
  let handleIn = (String(req.params.handle) || "").replace(/@/g, '');

  let date   = (String(req.params.date) || "").replace(/-/g, '/');
  if (utils.get('dates').indexOf(date) === -1) return res.redirect('/');

  let page = Number((req.query.page || 1));
  if (page < 1) page = 1;

  let tweets, totalTweets, handle;
  async.parallel([
    cb => Tweet.getDeletedTweetsDate(handleIn, date, page).then(data => {
      tweets      = data.tweets;
      totalTweets = data.total;
      cb();
    }),

    cb => Handle.getCond({handle: handleIn}).then(data => {
      handle = data;
      if (handle === null) return cb("doesn't_exist");
      cb();
    })
  ], err => {
    if (err === "doesn't_exist") {
      req.flash('warning', `${handleIn} is not in the database`);
      res.redirect('/stats');
      return;
    }

    let tweetData = [];

    async.eachLimit(tweets, 1, (tweet, cb) => {
      Tweet.getTweetTxt(tweet.tweetid).then(data => {
        tweetData.push(data);
        cb();
      });
    }, () => {
      res.render('statsStream', _.merge({title: `Stats for ${handleIn} on ${date}`, date, handle: handleIn, stats: JSON.stringify(utils.get('stats')[handle.id]), tweets: tweetData, totalTweets}, defaultVars));
    });
  });
});

module.exports = router;
