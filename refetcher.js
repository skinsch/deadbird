const settings = require('./utils').settings;
const https = require('https');
https.globalAgent.maxSockets = settings.general.maxSockets;

const cheerio = require('cheerio');
const request = require('request');
const async   = require('async');

let tty = process.stdout.isTTY ? true : false;
const charm = require('charm')();

if (tty) {
  charm.pipe(process.stdout);
  charm.cursor(false);
}

const db     = require('./models/db');
const Tweet  = require('./models/tweet');

let tweets = [];
let cur    = 0;
let fails  = 0;
let q = async.queue((tweet, cb) => {
  Tweet.readd(tweet).then(result => {
    if (result === 'fail') {
      fails++;
      q.push(tweet);
    }
    cur++;
    if (tty) {
      charm.left(255);
      charm.erase('line');
      charm.write(`${cur} / ${tweets.length}+${fails} | ${Math.floor(cur/(tweets.length+fails)*100)} | ${tweets.length+fails-cur} | ${tweet.handlename} | https://twitter.com/${tweet.handlename}/status/${tweet.tweetid}`);
    } else {
      process.stdout.write(JSON.stringify({status: `${cur} / ${tweets.length}+${fails}`, percent: Math.floor(cur/(tweets.length+fails)*100), remaining: tweets.length+fails-cur, user: tweet.handlename, url: `https://twitter.com/${tweet.handlename}/status/${tweet.tweetid}`}));
    }

    cb();
  });
}, 15);
q.pause();
q.drain = () => {
  if (tty) {
    charm.down(1);
    charm.cursor(true);
    console.log(`\nFinished snapshotting tweets`);
  } else {
    process.stdout.write(JSON.stringify({done: true, text: `Finished snapshotting tweets`}));
  }
  process.exit();
};

async.series([
  cb => {
    db.connection.query('UPDATE tweets SET checking = 0', (err, results) => {
      console.log(`Reset checking flag for ${results.changedRows} tweets`);
      cb();
    });
  },
  cb => {
    db.connection.query('SELECT t.*, h.handle AS handlename FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE deleteDate IS NULL AND now() > checkDate AND checks < 7', (err, results) => {
      tweets = results;
      tweets.forEach(tweet => {
        q.push(tweet);
      });
      cb();
    });
  }
], () => {
  if (q.length() === 0) q.drain();
  else q.resume();
});
