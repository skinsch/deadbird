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
const Handle = require('./models/handle');
const Tweet  = require('./models/tweet');

let handles;
let tweetids = [];

async.series([
  cb => {
    db.connection.query('SELECT tweetid from tweets', (err, results) => {
      results.forEach(tweet => tweetids[tweet.tweetid] = true);
      cb();
    })
  },
  cb => db.init(cb),
  cb => Handle.getAll().then(data => {
    handles = data;
    cb();
  })
], () => {
  main();
});

function main() {

  let completed = 0;
  let totalNewTweets = 0;
  let lastTime = new Date().getTime();

  async.eachLimit(handles, 15, (user, cb) => {
    let newTweets;

    getTweets(user, tweets => {

      newTweets = 0;
      async.eachLimit(tweets, 10, (thing, innercb) => {
        lastTime = new Date().getTime();
        if (thing === null) return innercb();

        Tweet.add(thing, user).then(result => {
          if (result.id !== 0) newTweets++;
          innercb();
        });
      }, () => {
        Handle.incVal('total', newTweets, user.handle).then(() => {
          completed++;
          if (tty) {
            charm.left(255);
            charm.erase('line');
            charm.write(`${completed} / ${handles.length} | ${user.handle} | ${newTweets} new tweets added`)
          } else {
            process.stdout.write(JSON.stringify({status: `${completed} / ${handles.length}`, user: user.handle, text: `${newTweets} new tweets added`}));
          }
          if (completed === handles.length && tty) {
            if (newTweets === 0) charm.erase('line');
            else console.log('\n');
          }

          if (newTweets !== 0) {
            totalNewTweets += newTweets;
            if (tty) {
              charm.write('\n');
            }
          }
          cb();
        });
      });

    });
  }, () => {
    if (tty) {
      charm.down(1);
      charm.cursor(true);
      console.log(`\n${totalNewTweets} new tweets added`);
    } else {
      process.stdout.write(JSON.stringify({text: `${totalNewTweets} new tweets added`}));
    }
    process.exit(0);
  });

  setInterval(() => {
    if (new Date().getTime() - lastTime > 60000) {
      if (tty) {
        console.log("Fetcher appears hung...aborting");
      } else {
        process.stdout.write(JSON.stringify({text: "Fetcher appears hung...aborting"}));
      }
      process.exit(1);
    }
  }, 5000);
}

function tweetExists(handle, id, cb) {
  request(`https://twitter.com/${handle}/status/${id}`, (err, response, body) => {
    cb(response.statusCode === 200);
  });
}

function getTweets(user, cb) {
  let $;
  request("https://twitter.com/" + user.handle, (err, response, body) => {
    if (body === undefined || err) return cb([]);
    $ = cheerio.load(body);

    // Update urls to be relative
    $('.js-user-profile-link').map(function() {
      if ($(this).attr('href') !== undefined) {
        $(this).attr('href', $(this).attr('href').slice(1));
      }
      return this;
    });

    let rawTweets = Array.prototype.slice.call($('.stream-items li p.tweet-text'));
    let tweets = [];
    rawTweets.forEach((rawTweet, index) => tweets.push(tweetParser(rawTweet, {user, index})));
    cb(tweets);
  });

  function tweetParser(tweet, info=null) {
    let data = {};
    let attribs = tweet.parent.parent.parent.attribs;

    data.handle  = info.user.id;
    //data.pinned  = attribs.class.indexOf('user-pinned') !== -1;
    data.retweet = attribs['data-retweet-id'] !== undefined;
    data.tweetid = data.retweet ? attribs['data-retweet-id'] : attribs['data-tweet-id'];
    if (data.tweetid in tweetids) {
      return null;
    }

    if (data.retweet) {
      data.content = $("div[data-retweet-id=" + data.tweetid + "] .js-tweet-text-container p").text();
    } else {
      $($('.js-action-profile-avatar')[0]).attr('src', `profileImg/${user.id}${user.ext}`);
      data.content = $("div[data-tweet-id=" + data.tweetid + "] .js-tweet-text-container p").text();
    }

    data.timelineTweet = $("div.js-profile-popup-actionable[data-item-id='" + $($('.stream-items li p.tweet-text')[info.index]).parent().parent().parent().data('item-id') + "']").parent().html();

    delete data.retweet;

    data.date = tweet.parent.parent.children[1].children[3].children[1].children[0].attribs['data-time'];

    return data;
  }
}
