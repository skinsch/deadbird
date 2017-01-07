const async    = require('async');
const moment   = require('moment');
const utils    = require('./utils')
const schedule = require('node-schedule');
const spawn    = require('child_process').spawn;
const settings = utils.settings;

const db     = require('./models/db');
const Tweet  = require('./models/tweet');
const Handle = require('./models/handle');

let helpers = {
  // Cache the index stream pages
  cacheIndex(cb=()=>{}) {
    let cache = {
      index: {
        '1': {tweets: [], totalTweets: 0}
      }
    };

    Tweet.getAllDeleted(null).then(data => {
      let total = data.total;
      let totalPages = Math.ceil(total/25);

      let count = 0;
      async.whilst(
        function() { return count < totalPages; },
        function(innercb) {
          getPage(++count, innercb.bind(this, null, count));
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
        utils.set('dates', JSON.parse(JSON.stringify(stats['all'])).map((val, ind)=>moment(val.date.slice(0, 0-14)).format('Y/MM/DD')).reverse());
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
          resolve.bind(this, data)
        );
      });

      function daysAgo(days, handle=null) {
        return new Promise((resolve, reject) => {
          if (days === 0) {
            query = `SELECT (SELECT curdate()) AS date,(SELECT COUNT(*) FROM tweets WHERE deletedate >= curdate()${handle ? " AND handle = " + handle : ""}) AS deleted, (SELECT COUNT(*) FROM tweets WHERE date >= curdate()${handle ? " AND handle = " + handle : ""}) AS added`;
          } else {
            query = `SELECT (SELECT DATE_SUB(curdate(), INTERVAL ${days} DAY)) AS date,(SELECT COUNT(*) FROM tweets WHERE DATE(deletedate) = DATE_SUB(curdate(), INTERVAL ${days} DAY)${handle ? " AND handle = " + handle : ""}) AS deleted, (SELECT COUNT(*) FROM tweets WHERE DATE(date) = (SELECT CURDATE() - INTERVAL ${days} DAY)${handle ? " AND handle = " + handle : ""}) AS added`;
          }
          db.connection.query(query, (err, data) => resolve(data));
        });
      }
    }
  },
  initStats() {
    let data = {
      fetcher: {},
      checker: {},
      template: {}
    };
    utils.set('data', data);

    async.series([
      // Start template -> checker
      cb => {
        let interval, item = 'template';
        if (settings.general.retrieversEnabled) {
          async.series([

            // Live status update...will implement charm in the future for nicer output
            cb => {
              interval = setInterval(() => {
                console.log(JSON.stringify(data[item]));
              }, 1000);
              cb();
            },
            cb => {
              console.log("Starting template fetcher...")
              spawner('template').then(() => {
                console.log("Template fetcher done");
                cb()
              });
            },
            cb => {
              item = 'checker';
              console.log("Starting Checker...")
              spawner('checker').then(() => {
                console.log("Checker done");
                cb()
              });
            }
          ], () => {
            clearInterval(interval);

            // Fetcher loop starts after template/checker finishes
            // Manually start delay until official template/checker loop starts
            fetcherLoop();

            setTimeout(templateLoop, settings.general.templateRestInterval * 1000);
            setTimeout(checkerLoop, settings.general.checkerRestInterval * 1000);
            cb();
          });
        } else {
          cb();
        }
      },

      // Cache stats for graphs
      cb => {
        console.log("Caching initial stats...");
        helpers.updateStats(() => {
          console.log("Finished caching stats");
          schedule.scheduleJob('0 */15 * * * *', helpers.updateStats);
          cb();
        });
      },

      cb => {
        console.log("Caching index...");
        utils.emit("indexCacherStart");
        utils.once("indexCacherDone", () => {
          console.log("Finished caching index");
          cb();
        });
      },

      cb => {
        console.log("Caching statsStream...");
        utils.emit("statsStreamCacherStart");
        utils.once("statsStreamCacherDone", () => {
          console.log("Finished caching statsStream");
          cb();
        });
      }

    // Prep is done, we can now start the server
    ], () => {
      utils.emit('initStatsDone');
    });
  },
  updateAutoComplete(cb) {
    Handle.getAll().then(data => {
      console.log('Autocomplete is up to date');
      utils.set('autocomplete', JSON.stringify(data.map(item => item.handle.toLowerCase())));
      cb();
    });
  },
  cacheStatsStream(cb=()=>{}) {
    let cache = {};

    async.eachLimit(utils.get('dates'), 1, (date, cb) => {

      let page = 1;
      let totalPages = +Infinity;
      async.whilst(
        function() { return page <= totalPages; },
        function(innercb) {

          let tweets, totalTweets;
          async.parallel([
            cb => Tweet.getDeletedTweetsDate(null, date, page).then(data => {
              tweets      = data.tweets;
              totalTweets = data.total;
              if (totalPages === +Infinity) {
                totalPages = Math.ceil(totalTweets/25);
              }
              cb();
            })
          ], err => {
            let tweetData = [];

            async.eachLimit(tweets, 1, (tweet, cb) => {
              Tweet.getTweetTxt(tweet.tweetid).then(data => {
                tweetData.push(data);
                cb();
              });
            }, () => {
              if (cache[date] === undefined) cache[date] = {};
              cache[date][page] = {tweets: tweetData, totalTweets};
              page++;
              innercb();
            });
          });

        },
        function (err, n) {
          cb();
        }
      );

    }, () => {
      utils.set('statsStream', cache);
      cb();
    });
  }
};

// Spawners //
function spawner(mode) {
  let data = utils.get('data');
  let scripts = {fetcher: 'fetch', checker: 'check', template: 'getTemplate'};

  return new Promise((resolve, reject) => {
    data[mode] = {};

    let spawned;
    if (settings.general.limitedRam) {
      spawned = spawn('node', ['--expose-gc', scripts[mode]]);
    } else {
      spawned = spawn('node', [scripts[mode]]);
    }

    spawned.stdout.on('data', spawnedData => {
      // Sometimes the JSON output is garbled because of two
      // objects outputting at the same time.
      try {
        spawnedData = JSON.parse(spawnedData);
      } catch(e) {
        return;
      }

      if (mode === 'checker') {
        if (spawnedData.text === undefined) {
          // Update data
          data[mode].status    = spawnedData.status;
          data[mode].remaining = spawnedData.remaining;
          data[mode].rate      = spawnedData.rate;
          data[mode].eta       = spawnedData.eta;
          data[mode].user      = spawnedData.user;
          data[mode].url       = spawnedData.url;
        } else {
          data[mode] = {};
          data[mode].text = spawnedData.text;
        }
      } else if (mode === 'fetcher') {
        if (spawnedData.done === undefined) {
          data[mode].status = spawnedData.status;
          data[mode].user   = spawnedData.user;
          data[mode].text   = spawnedData.text;
        } else {
          data[mode] = {};
          data[mode].text = spawnedData.text;
        }
      } else if (mode === 'template') {
        if (spawnedData.done === undefined) {
          data[mode].status = spawnedData.status;
          data[mode].text   = spawnedData.text;
        } else {
          data[mode] = {};
          data[mode].text = spawnedData.text;
        }
      }
    });

    spawned.on('exit', err => {
      if (err === null) resolve(true);
      else resolve(false);
    });
  });
}

function checkerLoop() {
  let data = utils.get('data');

  spawner('checker').then(fail => {
    if (fail) checkerLoop();
    else {
      data['checker'].nextCheck = new Date().getTime() + settings.general.checkerRestInterval * 1000;
      utils.emit("indexCacherStart");
      utils.emit("statsStreamCacherStart");
      setTimeout(checkerLoop, settings.general.checkerRestInterval * 1000);
    }
  });
}

function fetcherLoop() {
  let data = utils.get('data');

  spawner('fetcher').then(fail => {
    if (fail) fetcherLoop();
    else {
      data['fetcher'].nextCheck = new Date().getTime() + settings.general.fetcherRestInterval * 1000;
      setTimeout(fetcherLoop, settings.general.fetcherRestInterval * 1000);
    }
  });
}

function templateLoop() {
  let data = utils.get('data');

  spawner('template').then(fail => {
    if (fail) templateLoop();
    else {
      data['template'].nextCheck = new Date().getTime() + settings.general.templateRestInterval * 1000;
      setTimeout(templateLoop, settings.general.templateRestInterval * 1000);
    }
  });
}

module.exports = helpers;
