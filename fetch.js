const cheerio = require('cheerio');
const request = require('request');
const async   = require('async');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

const db     = require('./models/db');
const Handle = require('./models/handle');
const Tweet  = require('./models/tweet');

let handles;

async.series([
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

        Tweet.add(thing, user).then(result => {
          if (result.id !== 0) newTweets++;
          innercb();
        });
      }, () => {
        Handle.incVal('total', newTweets, user.handle).then(() => {
          charm.left(255);
          charm.erase('line');
          charm.write(`${++completed} / ${handles.length} | ${user.handle} | ${newTweets} new tweets added`)
          if (completed === handles.length) {
            if (newTweets === 0) charm.erase('line');
            else console.log('\n');
          }

          if (newTweets !== 0) {
            totalNewTweets += newTweets;
            charm.write('\n');
          }
          cb();
        });
      });

    });
  }, () => {
    charm.down(1);
    charm.cursor(true);
    console.log(`\n${totalNewTweets} new tweets added`);
    process.exit();
  });

  setInterval(() => {
    if (new Date().getTime() - lastTime > 60000) {
      console.log("Fetcher appears hung...aborting");
      process.exit();
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
