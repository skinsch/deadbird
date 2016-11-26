const async    = require('async');
const moment   = require('moment');
const utils    = require('./utils');
const settings = require("./settings.json");
if (settings.general.rate === 0 || settings.general.timeout === 0) {
  console.log("Please run benchmarks or manually edit the rate/timeout settings before running the checker.");
  process.exit();
}

const db      = require('./models/db');
const Tweet   = require('./models/tweet');
const Handle  = require('./models/handle');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

let total = 0, fails = 0, startTotal = 0;
let start = new Date().getTime();
let rate;

let q = async.queue((tweet, cb) => {
  utils.tweetExists(tweet.handle, tweet.tweetid, exists => {
    if (exists === "fail") {
      q.push(tweet);
      fails++;
    }
    rate = total / ((new Date().getTime() - start)/1000);
    let raw = moment.duration((startTotal+fails - total)/rate*1000);
    let format = `${utils.pad(raw.minutes(), 2)}:${utils.pad(raw.seconds(), 2)}`;

    charm.left(255);
    charm.erase('line');
    charm.write(`${++total} / ${startTotal}+${fails} | ${startTotal+fails-total} | ${Math.floor(rate)} tweets/sec | eta: ${format} | ${tweet.handle} | https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`)
    if (!exists) {
      Handle.incVal('deleted', 1, tweet.handle).then(() => {
        charm.write(`\n\t${tweet.content}\n\n`);
        Tweet.deleted(tweet.id).then(() => {
          cb();
        });
      });
    } else {
      cb();
    }
  });
}, settings.general.rate);

q.drain = () => {
  console.log('\ndone');
  charm.cursor(true);
  process.exit();
};


db.init(() => {
  Tweet.getAllAvailable((process.argv[2] || 7)).then(tweets => {
    startTotal = tweets.length;
    q.push(tweets);
  });
});
