const flash        = require('connect-flash');
const express      = require('express');
const path         = require('path');
const spawn        = require('child_process').spawn;
const Promise      = require('bluebird');
const favicon      = require('serve-favicon');
const logger       = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const compress     = require('compression');
const debug        = require('debug')('Deadbird:server');
const http         = require('http');
const async        = require('async');
const schedule     = require('node-schedule');
const session      = require('express-session');
const moment       = require('moment');

const db     = require('./models/db');
const Handle = require('./models/handle');
const Tweet  = require('./models/tweet');

const settings = require('./utils').settings;

const io = require('socket.io')(settings.general.socket);
let data = {
  fetcher: {},
  checker: {},
  template: {}
};

require('./socket')(io, data);

const index = require('./routes/index');

const app    = express();
const server = http.createServer(app);

// view engine setup
app.set('views', path.join(__dirname, '.viewsMin/pages'));
app.set('view engine', 'ejs');
app.set('port', settings.general.port);

app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.png')));
app.use(compress());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(cookieParser('keyboard cat'));
app.use(session({
  key: settings.session.key,
  secret: settings.session.secret,
  cookie: {
    path: '/',
  },
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.use('*', (req, res, next) => {
  app.set('originalUrl', req.originalUrl);

  let info    = req.flash('info');
  let warning = req.flash('warning');
  let token   = req.flash('token');

  if (info.length) {
    messages = ["info", info];
  } else if (warning.length) {
    messages = ["warning", warning];
  } else if (token.length) {
    messages = ["token", token];
  } else {
    messages = "";
  }

  app.set('messages', messages);
  next();
});

app.use('/', index);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Spawners //
function spawner(mode) {
  let scripts = {fetcher: 'fetch', checker: 'check', template: 'getTemplate'};

  return new Promise((resolve, reject) => {
    data[mode] = {};

    const spawned = spawn('node', [scripts[mode]]);

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
  spawner('checker').then(fail => {
    if (fail) checkerLoop();
    else {
      data['checker'].nextCheck = new Date().getTime() + settings.general.checkerRestInterval * 1000;
      setTimeout(() => {
        checkerLoop();
      }, settings.general.checkerRestInterval * 1000);
    }
  });
}

function fetcherLoop() {
  spawner('fetcher').then(fail => {
    if (fail) fetcherLoop();
    else {
      data['fetcher'].nextCheck = new Date().getTime() + settings.general.fetcherRestInterval * 1000;
      setTimeout(() => {
        fetcherLoop();
      }, settings.general.fetcherRestInterval * 1000);
    }
  });
}

function templateLoop() {
  spawner('template').then(fail => {
    if (fail) templateLoop();
    else {
      data['template'].nextCheck = new Date().getTime() + settings.general.templateRestInterval * 1000;
      setTimeout(() => {
        templateLoop();
      }, settings.general.templateRestInterval * 1000);
    }
  });
}
/////////////

// Stats cacher //
function initStats(cb) {
  async.series([
    // Start template -> checker
    cb => {
      let interval, item = 'template';
      if (settings.general.retrieversEnabled) {
        async.series([
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
          // fetcher loop starts after template/checker finishes
          // Manually start delay until official template/checker loop starts
          fetcherLoop();

          setTimeout(() => {
            templateLoop();
          }, settings.general.templateRestInterval * 1000);

          setTimeout(() => {
            checkerLoop();
          }, settings.general.checkerRestInterval * 1000);

          cb();
        });
      } else {
        cb();
      }
    },

    // Cache stats for graphs
    cb => {
      console.log("Caching initial stats...");
      updateStats(() => {
        console.log("Finished caching stats");
        schedule.scheduleJob('0 */15 * * * *', () => {
          updateStats();
        });
        cb();
      });
    },


    // Cache the index page
    // Run this after the checker loop finishes
    cb => {
      console.log("Caching index...");
      cacheIndex(() => {
        console.log("Finished caching index");
        setInterval(() => {
          cacheIndex();
        }, settings.general.indexCacheInterval * 1000);
        cb();
      });
    }

  // Prep is done, we can now start the server
  ], () => {
    cb();
  });
}

function updateStats(cb=()=>{}) {
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
      app.set('stats', stats);
      app.set('statUpdate', new Date().getTime());
      app.set('dates', JSON.parse(JSON.stringify(stats['all'])).map((val, ind)=>moment(val.date.slice(0, 0-14)).format('MM/DD')).reverse());
      cb();
    });
  });
}

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

function cacheIndex(cb=()=>{}) {
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
        app.set('cache', cache);
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

      async.eachLimit(tweets, 5, (tweet, cb) => {
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
}

/////////////

module.exports = {
  server,
  app,
  initStats
};
