const path     = require('path');
const async    = require('async');
const express  = require('express');
const cheerio  = require('cheerio');
const router   = express.Router();
const request  = require('request');
const schedule = require('node-schedule');
const utils    = require('../utils');
const settings = utils.settings;
const _        = require('lodash');

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

let originalUrl, dates, autocomplete, socket, messages, ips = {};

// Cache the handles list for autocomplete
async.parallel([
  cb => {
    socket = settings.general.socket;
    updateAutoComplete(() => {
      cb();
    });
  }
], () => {
  main();
});

function main() {

  router.all('*', (req, res, next) => {
    originalUrl = req.app.get('originalUrl');
    messages    = req.app.get('messages');
    dates       = req.app.get('dates');
    if (req.url.slice(0, 5) === '/user') {
      Handle.getAll().then(data => {
        if (!utils.acceptingNewUsers() || data.length >= utils.maxNewUsers()) {
          req.flash('warning', `We are currently not accepting new users. Please try again later`);
          res.redirect('/');
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });

  /* GET home page. */
  router.get('/', function(req, res, next) {
    let page = Number((req.query.page || 1));
    if (page < 1) page = 1;
    if (req.app.get('cache').index[page] === undefined) return res.redirect('/');

    res.render('stream', _.merge(req.app.get('cache').index[page], {title: "Home", messages, autocomplete, socket, basehref: settings.general.basehref, originalUrl}));
  });

  router.get('/leaderboards', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('leaderboards', {title: "Leaderboards", messages, autocomplete, socket, basehref: settings.general.basehref, originalUrl, handles});
    });
  });

  router.get('/stats', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('stats', {title: "Stats", messages, handle: undefined, stats: JSON.stringify(req.app.get('stats')['all']), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl, handles});
    });
  });

  router.get('/statsStream/:date?', (req, res, next) => {
    let date   = (String(req.params.date) || "").replace(/-/, '/');
    if (dates.indexOf(date) === -1) return res.redirect('/');

    let page = Number((req.query.page || 1));
    if (page < 1) page = 1;

    let tweets, totalTweets;
    async.parallel([
      cb => Tweet.getDeletedTweetsDate(null, date, page).then(data => {
        tweets = data.tweets;
        totalTweets = data.total;
        cb();
      })
    ], err => {
      let tweetData = [];

      async.eachLimit(tweets, 5, (tweet, cb) => {
        Tweet.getTweetTxt(tweet.tweetid).then(data => {
          tweetData.push(data);
          cb();
        });
      }, () => {
        res.render('statsStream', {title: `Stats on ${date}`, messages, date, handle: undefined, stats: JSON.stringify(req.app.get('stats')['all']), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl, tweets: tweetData, totalTweets});
      });
    });
  });

  router.get('/statsStream/:handle/:date', (req, res, next) => {
    let handleIn = (String(req.params.handle) || "").replace(/@/g, '');

    let date   = (String(req.params.date) || "").replace(/-/, '/');
    if (dates.indexOf(date) === -1) return res.redirect('/');

    let page = Number((req.query.page || 1));
    if (page < 1) page = 1;

    let tweets, totalTweets, handle;
    async.parallel([
      cb => Tweet.getDeletedTweetsDate(handleIn, date, page).then(data => {
        tweets = data.tweets;
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
        return
      }

      let tweetData = [];

      async.eachLimit(tweets, 5, (tweet, cb) => {
        Tweet.getTweetTxt(tweet.tweetid).then(data => {
          tweetData.push(data);
          cb();
        });
      }, () => {
        res.render('statsStream', {title: `Stats for ${handleIn} on ${date}`, messages, date, handle: handleIn, stats: JSON.stringify(req.app.get('stats')[handle.id]), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl, tweets: tweetData, totalTweets});
      });
    });
  });

  router.get('/about', (req, res, next) => {
    res.render('about', {title: "About", socket, messages, basehref: settings.general.basehref, originalUrl});
  });

  router.get('/user', function(req, res, next) {
    res.render('addUser', {title: "Add new user", messages, autocomplete, socket, basehref: settings.general.basehref, originalUrl});
  });

  router.post('/user', function(req, res, next) {
    let handle = String(req.body.handle).replace(/@/g, '');
    let ip = req.headers['cf-connecting-ip'] ||
             req.headers['x-real-ip'] ||
             req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress;

    async.series([
      cb => {
        cb(!ipBlacklist(ip) ? "ip_already_used" : null);
      },
      cb => Handle.getCond({handle}).then(res => {
        cb(res === null ? null : "duplicate");
      }),
      cb => utils.validUser(handle).then(() => {
        request(`https://twitter.com/${handle}`, {
          timeout: settings.general.timeout * 3,
          gzip: true
        }, (err, response, body) => {
          Handle.add(handle).then(() => Handle.fetchTemplate(handle, () => {
            updateAutoComplete(() => {
              ipBlacklist(ip, 'add');
              cb(null);
            });
          }));
        });
      }, () => {
        cb("invalid_user");
      })
    ], err => {
      if (err === "duplicate") {
        req.flash('warning', `${handle} is already in the database.`);
        res.redirect('/user');
      } else if (err === "ip_already_used") {
        req.flash('warning', `This IP address has already added an account.`);
        res.redirect('/user');
      } else if (err === "invalid_user") {
        req.flash('warning', `${handle} is either invalid, protected, or has less than 100k followers.`);
        res.redirect('/user');
      } else {
        req.flash('info', `${handle} was added successfully!`);
        res.redirect(`/`);
      }
    });
  });

  router.get('/stats/:handle', (req, res, next) => {
    let handleIn = String(req.params.handle.replace(/@/g, ''));
    Handle.getCond({handle: handleIn}).then(handle => {
      if (handle === null) {
        req.flash('warning', `${handleIn} is not in the database`);
        return res.redirect('/stats');
      }

      res.render('userStats', {title: `User Stats for ${handle.handle}`, handle: handle.handle, messages, stats: JSON.stringify(req.app.get('stats')[handle.id]), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl});
    });
  });

  router.get('/profileImg/:img', function(req, res, next) {
    res.sendFile(path.resolve(__dirname + '/../data/profileImg/' + String(req.params.img)));
  });

  router.get('/:handle', function(req, res, next) {
    let handle = String(req.params.handle.replace(/@/g, ''));
    let ip = req.headers['cf-connecting-ip'] ||
             req.headers['x-real-ip'] ||
             req.headers['x-forwarded-for'] ||
             req.connection.remoteAddress;

    let page = Number((req.query.page || null));
    if (page < 1) page = 1;

    if (handle === "favicon.ico") return;

    Tweet.genTimeline(handle, page).then(html => {
      res.send(html);

    // User doesn't exist - Add to db. This behavior will be more sophisticated in the future.
    }, err => {
      req.flash('warning', `${handle} is not in the database`);
      res.redirect('/');
    });
  });

  router.get('/:handle/status/:id', function(req, res, next) {
    let handle = String(req.params.handle.replace(/@/g, ''));
    let id     = String(req.params.id);

    Tweet.genTweetPage(handle, id).then(html => {
      res.send(html);
    }, err => {
      res.redirect(`/${handle}`);
    });
  });
}

function updateAutoComplete(cb) {
  console.log('Autocomplete is up to date');
  Handle.getAll().then(data => {
    autocomplete = JSON.stringify(data.map(item => item.handle.toLowerCase()));
    cb();
  });
}

function ipBlacklist(ip, mode='lookup') {
  if (mode === 'lookup') {
    return ips[ip] === undefined;
  } else {
    ips[ip] = true;
  }
}

module.exports = router;
