const cheerio = require('cheerio');
const fs      = require('fs');
const request = require('request');
const async   = require('async');
const db      = require('./models/db');
const handle  = require('./models/handle');
const tweet   = require('./models/tweet');
const wkhtmltoimage = require('wkhtmltoimage');

tweet.getMissingScreenshot().then(tweets => {
  async.eachLimit(tweets, 5, (item, cb) => {
    wkhtmltoimage.generate(`https://twitter.com/${item.handle}/status/${item.tweetid}`, { "javascript-delay": 250, "crop-y": 60, "crop-x": 15, "width": 660, "height": 1200, "quality": 50, "output": `screenshots/${item.tweetid}.jpg` }, (code, signal) => {
      tweet.update({screenshot: 1}, item.id).then(() => {
        cb();
      });
    });
  }, () => {
    process.exit();
  });
});
