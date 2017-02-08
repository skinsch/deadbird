const settings = require("./settings.json");
const https = require('https');
https.globalAgent.maxSockets = settings.general.maxSockets;

const async    = require('async');
const moment   = require('moment');
const utils    = require('./utils');

const db      = require('./models/db');
const Tweet   = require('./models/tweet');
const Handle  = require('./models/handle');

let tty = process.stdout.isTTY ? true : false;

const charm = require('charm')();

if (tty) {
  charm.pipe(process.stdout);
  charm.cursor(false);
}

if (settings.general.rate === 0 || settings.general.timeout === 0) {
  if (tty) {
    console.log("Please run benchmarks or manually edit the rate/timeout settings before running the checker.");
  } else {
    process.stdout.write(JSON.stringify({text: "Please run benchmarks or manually edit the rate/timeout settings before running the checker."}));
  }
  process.exit();
}

let total = 0, fails = 0, startTotal = 0, totalUndeletedTweets = 0;
let start = Date.now();
let rate;

let q = async.queue((tweet, cb) => {
  utils.tweetExists(tweet.handle, tweet.tweetid, exists => {
    if (exists === "fail") {
      q.push(tweet);
      fails++;
    }
    rate = total / ((Date.now() - start)/1000);
    let raw = moment.duration((startTotal+fails - total)/rate*1000);
    let format = `${utils.pad(raw.minutes(), 2)}:${utils.pad(raw.seconds(), 2)}`;

    ++total;
    if (total % 25 === 0) {
      if (tty) {
        charm.left(255);
        charm.erase('line');
        charm.write(`${total} / ${startTotal}+${fails} | ${startTotal+fails-total} | ${Math.floor(total/(startTotal+fails)*100)} | ${Math.floor(rate)} tweets/sec | eta: ${format} | ${tweet.handle} | https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`)
      } else {
        process.stdout.write(JSON.stringify({status: `${total} / ${startTotal}+${fails}`, remaining: startTotal+fails-total, percent: Math.floor(total/(startTotal+fails)*100), rate: Math.floor(rate), eta: format, user: tweet.handle, url: `https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`}));
      }
    }

    if (exists === true) {
      totalUndeletedTweets++;
      charm.left(255);
      charm.erase('line');
      charm.write(`${total} / ${startTotal}+${fails} | ${startTotal+fails-total} | ${Math.floor(rate)} tweets/sec | eta: ${format} | ${tweet.handle} | https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`)
      charm.write(`\n\t${tweet.content}\n\n`);
      Tweet.undeleted(tweet.id).then(() => {
        cb();
      });
    } else {
      cb();
    }
  });
}, settings.general.rate);

q.drain = () => {
  Handle.getAll().then(handles => {
    async.each(handles, (handle, cb) => {
      Tweet.getDeletedTweets(handle.handle).then(tweets => {
        Handle.setVal('deleted', tweets ? tweets.length : 0, handle.handle).then(() => cb());
      });
    }, () => {
      if (tty) {
        charm.down(1);
        charm.cursor(true);
        console.log(`\n${totalUndeletedTweets} tweets undeleted`);
      } else {
        process.stdout.write(JSON.stringify({text: `${totalUndeletedTweets} tweets undeleted`}));
      }
      process.exit(0);
    })
  });
};


db.init(() => {
  Tweet.getAllDeleted(0, 10000).then(tweets => {
    startTotal = tweets.total;
    q.push(tweets.tweets);
  });
});
