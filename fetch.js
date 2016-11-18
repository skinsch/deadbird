const cheerio = require('cheerio');
const request = require('request');
const async   = require('async');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

const db      = require('./models/db');
const handle  = require('./models/handle');
const tweet   = require('./models/tweet');

let handles;

async.series([
  cb => db.init(cb),
  cb => handle.getAll().then(data => {
    handles = data;
    cb();
  })
], () => {
  main();
});

function main() {

  let completed = 0;
  let totalNewTweets = 0;

  async.eachLimit(handles, 15, (user, cb) => {
    let newTweets;

    getTweets(user, tweets => {

      newTweets = 0;
      async.eachLimit(tweets, 10, (thing, innercb) => {

        tweet.add(thing, user).then(result => {
          if (result.id !== 0) newTweets++;
          innercb();
        });
      }, () => {
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
  }, () => {
    charm.down(1);
    charm.cursor(true);
    console.log(`\n${totalNewTweets} new tweets added`);
    process.exit();
  });
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
    data.timelineTweet = $("div.js-profile-popup-actionable[data-item-id='" + $($('.stream-items li p.tweet-text')[info.index]).parent().parent().parent().data('item-id') + "']").parent().html();
    //data.content = tweet.children[0].data;


    if (data.retweet) {
      data.content = $("div[data-retweet-id=" + data.tweetid + "] .js-tweet-text-container p").text();
    } else {
      data.content = $("div[data-tweet-id=" + data.tweetid + "] .js-tweet-text-container p").text();
    }
    delete data.retweet;

    data.date = tweet.parent.parent.children[1].children[3].children[1].children[0].attribs['data-time'];

    return data;
  }
}
