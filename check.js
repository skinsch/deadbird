const cheerio = require('cheerio');
const fs      = require('fs');
const request = require('request');
const async   = require('async');
const moment  = require('moment');
const utils   = require('./utils');

const db      = require('./models/db');
const Tweet   = require('./models/tweet');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

let total = 0;
let start = new Date().getTime();
let rate;
db.init(() => {
  Tweet.getAllAvailable().then(tweets => {
    async.eachLimit(tweets, 30, (tweet, cb) => {
      utils.tweetExists(tweet.handle, tweet.tweetid, (exists) => {
        rate = total / ((new Date().getTime() - start)/1000);
        let raw = moment.duration((tweets.length - total)/rate*1000);
        let format = `${utils.pad(raw.minutes(), 2)}:${utils.pad(raw.seconds(), 2)}`;

        charm.left(255);
        charm.erase('line');
        charm.write(`${++total} / ${tweets.length} | ${Math.floor(rate)} tweets/sec | eta: ${format} | ${tweet.handle} | https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`)
        if (!exists) {
          charm.write(`\n\t${tweet.content}\n\n`);
          Tweet.deleted(tweet.id).then(() => {
            cb();
          });
        } else {
          cb();
        }
      });
    }, () => {
      console.log('\ndone');
      charm.cursor(true);
      process.exit();
    });
  });
});
