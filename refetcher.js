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

async.series([
  cb => {
    db.connection.query('SELECT t.*, h.handle AS handlename FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE deleteDate IS NULL AND now() > checkDate AND checks < 7', (err, results) => {
      tweets = results;
      cb();
    });
  }
], () => {
  main();
});

function main() {
  let cur = 0;
  console.log(tweets.length);
  async.eachLimit(tweets, 15, (tweet, cb) => {
    Tweet.readd(tweet).then(result => {
      console.log(`${++cur}/${tweets.length}`);
      cb();
    });
  }, () => {
    process.exit();
  });
}
