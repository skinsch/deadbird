const async   = require('async');
const moment  = require('moment');
const utils   = require('./utils');
const fs = require('fs');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

let size = Number(process.argv[4]) || 2000;
let tweets = require('./benchmark.json').slice(0, size);

let averages = [];
let speed = (Number(process.argv[2]) || 10), timeout = (Number(process.argv[3]) || 3000), threshold = size*.05;
let check = 0;
let bad = 0;
let avgRate = 0;
let rate;
let newThree, lastThree;

async.series([
  cb => speedTest(() => {
    console.log('done');
    cb();
  }),
  cb => timeoutTest(() => {
    console.log('done');
    cb();
  })
], () => {
  console.log(`\nFinal results: ${speed} / ${timeout}\n`);
  console.log(averages);
  let settings = require("./settings.json");
  settings.general.rate = speed;
  settings.general.timeout = timeout;
  fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2), 'utf8');
});

function speedTest(outcb) {
  let cont = true;
  async.whilst(
    () => cont,
    cb => {
      benchmark(speed, timeout, fails => {
        console.log(`${(fails/size)*100}% failure rate for ${speed} / ${timeout}`);
        let movingAvg = Math.abs(avg(averages.slice(-3)) - avg(averages.slice(-4, -1)));
        if (fails <= threshold && (movingAvg > 5 || averages.length < 3)) {

          // If fail rate less than threshold 3 times in a row, increase speed
          if (++check === 3) {
            averages.push(avgRate/3);
            speed += 10;
            console.log(`Upping speed to ${speed}...avg rate was ${avgRate/3}\n`);
            check = 0;
            bad = 0;
            avgRate = 0;
          } else {
            avgRate += rate;
            console.log(`Passed test ${check} of 3\n`);
          }
        } else {
          // If fail rate exceeds threshold 3 times in current speed run, then back off 2 ticks on speed and stop
          if (++bad === 3) {
            speed -= 20;
            cont = false;
            check = 0;
            bad = 0;
          } else {
            console.log(`Failed test ${bad} of 3\n`);
          }
        }
        cb();
      });
    },
    () => {
      outcb();
    }
  );
}

function timeoutTest(outcb) {
  let cont = true;
  async.whilst(
    () => cont,
    cb => {
      benchmark(speed, timeout, fails => {
        console.log(`${(fails/2000)*100}% failure rate for ${speed} / ${timeout}`);

        if (fails <= threshold && timeout > 0) {
          // If fail rate less than threshold 3 times in a row, lower timeout
          if (++check === 3) {
            timeout -= 100;
            check = 0;
            bad = 0;
            console.log(`Lowering timeout to ${timeout}...\n`);
          } else {
            console.log(`Passed test ${check} of 3\n`);
          }
        } else {
          // If fail rate exceeds threshold 3 times in current timeout run, then back off 2 ticks on timeout and stop
          if (++bad === 3) {
            timeout += 200;
            cont = false;
            check = 0;
            bad = 0;
          } else {
            console.log(`Failed test ${bad} of 3\n`);
          }
        }
        cb();
      });
    },
    () => {
      outcb();
      console.log('done');
    }
  );
}

function benchmark(speed, timeout, cb) {
  let total = 0, fails = 0;
  let start = new Date().getTime();
  async.eachLimit(tweets, speed, (tweet, cb) => {
    utils.tweetExistsB(tweet.handle, tweet.tweetid, timeout, exists => {
      if (exists === "fail") {
        exists = true;
        fails++;
      }
      rate = total / ((new Date().getTime() - start)/1000);
      let raw = moment.duration((tweets.length - total)/rate*1000);
      let format = `${utils.pad(raw.minutes(), 2)}:${utils.pad(raw.seconds(), 2)}`;

      charm.left(255);
      charm.erase('line');
      charm.write(`${++total} / ${tweets.length} / ${fails} | ${Math.floor(rate)} tweets/sec | eta: ${format} | ${tweet.handle} | https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`)
      if (!exists) {
        cb();
      } else {
        cb();
      }
    });
  }, () => {
    charm.write(`\n`);
    cb(fails);
    charm.cursor(true);
  });
}

function avg(arr) {
  if (arr.length < 3) return -1;
  else return arr.reduce((a,b) => a+b)/3
}
