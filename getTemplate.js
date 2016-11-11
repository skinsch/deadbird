const fs      = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const utils   = require('./utils');
const db      = require('./models/db');
const Tweet   = require('./models/tweet');
const Handle  = require('./models/handle');
const Promise = require('bluebird');
const async   = require('async');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

let handles;
db.init(() => {
  Handle.getAllMissingTemplates().then(data => {
    handles = data;
    main();
  });
});

function main() {
  let total = 0;
  async.eachLimit(handles, 15, (handle, cb) => {

    let cur = 0;
    let exists;
    let tweet;

    Tweet.getTweets(handle.handle).then(tweets => {
      async.doWhilst(innercb => {
        tweet = tweets[cur];
        utils.tweetExists(tweet.handle, tweet.tweetid, result => {
          exists = result
          innercb(exists);
        });
      }, done => {
        cur++;
        return !done && cur < tweets.length;
      }, () => {

        // All tweets were deleted and we can't get a template
        if (!exists) {
          charm.left(255);
          charm.erase('line');
          charm.write(`${++total} / ${handles.length} | Error fetching template for ${handle.handle}\n`)
          cb()
          
        // Valid template page found
        } else {
          getTemplate(tweet, () => {
            charm.left(255);
            charm.erase('line');
            charm.write(`${++total} / ${handles.length} | Fetched template for ${handle.handle}`)
            cb();
          });
        }
      });
    });
  }, () => {
    charm.cursor(true);
    console.log('\ndone');
    process.exit();
  });
}

function getTemplate(tweet, cb) {
  request(`https://twitter.com/${tweet.handle}/status/${tweet.tweetid}`, (err, response, body) => {
    $ = cheerio.load(body, {
      normalizeWhitespace: true
    });
    $('.PermalinkOverlay-modal').empty("");
    $('.Grid-cell .u-lg-size2of3').append(`
<div id="timeline" class="ProfileTimeline ">
  <div class="stream">
   <ol class="stream-items js-navigable-stream" id="stream-items-id">
   </ol>
  </div>
</div>`);

    fs.writeFile(`./templates/${tweet.id}`, $.html(), () => {
      Handle.update({template: 1}, tweet.id).then(() => {
        cb();
      });
    });
  });
}
