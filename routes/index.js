const path     = require('path');
const async    = require('async');
const express  = require('express');
const cheerio  = require('cheerio');
const router   = express.Router();
const request  = require('request');
const utils    = require('../utils');
const settings = utils.settings;

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

let originalUrl, autocomplete, socket, messages;

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
    messages = req.app.get('messages');
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
        res.render('stream', {title: "Home", messages, autocomplete, socket, basehref: settings.general.basehref, tweets: tweetData, originalUrl, totalTweets});
      });
    });
  });

  router.get('/leaderboards', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('leaderboards', {title: "Leaderboards", messages, autocomplete, socket, basehref: settings.general.basehref, originalUrl, handles});
    });
  });

  router.get('/stats', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('stats', {title: "Stats", messages, stats: JSON.stringify(req.app.get('stats')['all']), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl, handles});
    });
  });

  router.get('/about', (req, res, next) => {
    res.render('about', {title: "About", messages, basehref: settings.general.basehref, originalUrl});
  });

  router.get('/stats/:handle', (req, res, next) => {
    Handle.getCond({handle: String(req.params.handle)}).then(handle => {
      if (handle === null) {
        req.flash('warning', `${String(req.params.handle)} is not in the database`);
        return res.redirect('/stats');
      }

      res.render('userStats', {title: `User Stats for ${handle.handle}`, handle: handle.handle, messages, stats: JSON.stringify(req.app.get('stats')[handle.id]), statUpdate: req.app.get('statUpdate'), autocomplete, socket, basehref: settings.general.basehref, originalUrl});
    });
  });

  router.get('/profileImg/:img', function(req, res, next) {
    res.sendFile(path.resolve(__dirname + '/../data/profileImg/' + String(req.params.img)));
  });

  router.get('/:handle', function(req, res, next) {
    let handle = String(req.params.handle);
    if (handle === "favicon.ico") return;

    Tweet.genTimeline(handle).then(html => {
      res.send(html);

    // User doesn't exist - Add to db. This behavior will be more sophisticated in the future.
    }, err => {
      utils.validUser(handle).then(() => {
        request(`https://twitter.com/${handle}`, (err, response, body) => {
          Handle.add(handle).then(() => Handle.fetchTemplate(handle, () => {
            updateAutoComplete(() => {
              req.flash('info', `${handle} was added successfully!`);
              res.redirect(`/`);
            });
          }));
        });
      }, () => {
        req.flash('warning', `${handle} is not a valid Twitter user!`);
        res.redirect('/');
      });
    });
  });

  router.get('/:handle/status/:id', function(req, res, next) {
    let handle = String(req.params.handle);
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

module.exports = router;
