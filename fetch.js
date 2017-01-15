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
const Handle = require('./models/handle');
const Tweet  = require('./models/tweet');

let tweetids = [];
let handles;
var completed = 0;
var fails = 0;
var totalNewTweets = 0;

// Pause queue and resume once all handles are pushed
let q = async.queue((user, cb) => fetchTweets(user, cb), 15);
q.pause();
q.drain = () => {
  if (tty) {
    charm.down(1);
    charm.cursor(true);
    console.log(`\n${totalNewTweets} new tweets added`);
  } else {
    process.stdout.write(JSON.stringify({done: true, text: `${totalNewTweets} new tweets added`}));
  }
  process.exit(0);
};

async.series([
  cb => {
    db.connection.query('DELETE FROM tweets WHERE tweetSaved = 0', (err, results) => {
      console.log(`Purged ${results.affectedRows} invalid tweets`);
      cb();
    });
  },
  cb => {
    db.connection.query('SELECT tweetid from tweets', (err, results) => {
      results.forEach(tweet => tweetids[tweet.tweetid] = true);
      cb();
    });
  },
  cb => Handle.getAll().then(data => {
    handles = data;
    handles.forEach(handle => {
      q.push(handle);
    });
    cb();
  })
], () => {
  q.resume();
});

function getTweets(user, cb) {
  let $;
  request({url: "https://twitter.com/" + user.handle + "/with_replies", timeout: settings.general.timeout * 3, gzip: true}, (err, response, body) => {
    if (body === undefined || err) return cb("fail");
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
    cb(tweets.filter(t => t !== null));
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

function fetchTweets(user, cb) {
  if (settings.general.limitedRam && completed % 15 === 0) gc();

  let newTweets = 0;
  let tq = async.queue((tweet, innercb) => {
    if (tweet === null) return innercb();

    Tweet.add(tweet, user).then(result => {
      if (result === true) newTweets++;

      // Tweet appears to have been deleted at just the right moment...no action taken
      else if (result === 'gone') {

      } else {
        // Failed fetching tweet so push back into queue to try again
        tq.push(tweet);
      }
      innercb();
    });
  }, 10);

  tq.pause();
  tq.drain = () => {
    Handle.incVal('total', newTweets, user.handle).then(() => {
      completed++;
      totalNewTweets += newTweets;
      if (tty) {
        charm.left(255);
        charm.erase('line');
        charm.write(`${completed} / ${handles.length}+${fails} | ${Math.floor(completed/(handles.length+fails)*100)} | ${handles.length+fails-completed} | ${user.handle} | ${newTweets} new tweets | ${totalNewTweets} new tweets total`)
      } else {
        process.stdout.write(JSON.stringify({status: `${completed} / ${handles.length}+${fails}`, percent: Math.floor(completed/(handles.length+fails)*100), remaining: handles.length+fails-completed, user: user.handle, text: `${newTweets} new tweets - ${totalNewTweets} new tweets total`}));
      }
      if (completed === handles.length && tty) {
        if (newTweets === 0) charm.erase('line');
        else console.log('\n');
      }

      if (newTweets !== 0 && tty) {
        charm.write('\n');
      }
      cb();
    });
  };

  getTweets(user, tweets => {
    if (tweets === "fail") {
      fails++;
      q.push(user);
      return tq.drain();
    }

    tweets.forEach(tweet => {
      tq.push(tweet);
    });
    if (tq.length() === 0) tq.drain();
    else tq.resume();
  });
}
