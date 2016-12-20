const async  = require('async');
const moment = require('moment');
const utils  = require('./utils')

const db     = require('./models/db');
const Tweet  = require('./models/tweet');
const Handle = require('./models/handle');

module.exports = {
  // Cache the index stream pages
  cacheIndex(cb=()=>{}) {
    let cache = {
      index: {}
    };

    Tweet.getAllDeleted(null).then(data => {
      let total = data.total;
      let totalPages = Math.ceil(total/25);

      let count = 0;
      async.whilst(
        function() { return count < totalPages; },
        function(innercb) {
          getPage(++count, () => {
            innercb(null, count);
          });
        },
        function (err, n) {
          utils.set('cache', cache);
          cb();
        }
      );
    });

    function getPage(page, cb) {
      let tweets, totalTweets;
      async.parallel([
        cb => Tweet.getAllDeleted((page*25)-25).then(data => {
          tweets = data.tweets;
          totalTweets = data.total;
          cb();
        })
      ], () => {
        let tweetData = [];

        async.eachLimit(tweets, 1, (tweet, cb) => {
          Tweet.getTweetTxt(tweet.tweetid).then(data => {
            tweetData.push(data);
            cb();
          });
        }, () => {
          cache.index[page] = {tweets: tweetData, totalTweets};
          cb();
        });
      });
    }
  },
  updateStats(cb=()=>{}) {
    let start = new Date().getTime();
    let stats = {};
    Handle.getAll().then(handles => {
      handles.unshift(null);

      async.eachLimit(handles, 50, (handle, cb) => {
        getStats(handle ? handle.id : null).then(stat => {
          stats[handle ? handle.id : "all"] = stat;
          cb();
        });
      }, () => {
        utils.set('stats', stats);
        utils.set('statUpdate', new Date().getTime());
        utils.set('dates', JSON.parse(JSON.stringify(stats['all'])).map((val, ind)=>moment(val.date.slice(0, 0-14)).format('MM/DD')).reverse());
        cb();
      });
    });

    function getStats(handle=null) {
      return new Promise((resolve, reject) => {
        let data = [];
        let count = 0;

        async.whilst(
          () => count < 30,
          cb => {
            daysAgo(count, handle).then(row => {
              count++;
              data.push(row[0]);
              cb(null)
            });
          },
          () => {
            resolve(data);
          }
        );
      });

      function daysAgo(days, handle=null) {
        return new Promise((resolve, reject) => {
          if (days === 0) {
            query = `SELECT (SELECT curdate()) AS date,(SELECT COUNT(*) FROM tweets WHERE deletedate >= curdate()${handle ? " AND handle = " + handle : ""}) AS deleted, (SELECT COUNT(*) FROM tweets WHERE date >= curdate()${handle ? " AND handle = " + handle : ""}) AS added`;
          } else {
            query = `SELECT (SELECT DATE_SUB(curdate(), INTERVAL ${days} DAY)) AS date,(SELECT COUNT(*) FROM tweets WHERE DATE(deletedate) = DATE_SUB(curdate(), INTERVAL ${days} DAY)${handle ? " AND handle = " + handle : ""}) AS deleted, (SELECT COUNT(*) FROM tweets WHERE DATE(date) = (SELECT CURDATE() - INTERVAL ${days} DAY)${handle ? " AND handle = " + handle : ""}) AS added`;
          }
          db.connection.query(query, (err, data) => {
            resolve(data);
          });
        });
      }
    }
  }
};
