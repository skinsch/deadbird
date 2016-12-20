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

const db     = require('./models/db');
const Handle = require('./models/handle');
const Tweet  = require('./models/tweet');

const helpers  = require('./helpers');
const utils    = require('./utils')
const settings = utils.settings;

const io = require('socket.io')(settings.general.socket);
require('./socket')(io);

utils.set('data', {
  fetcher: {},
  checker: {},
  template: {}
});

// Easy local reference to utils -> data
let data = utils.get('data');

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
  utils.set('originalUrl', req.originalUrl);

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

  utils.set('messages', messages);
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

    let spawned;
    if (settings.general.limitedRam) {
      spawned = spawn('node', ['--expose-gc', scripts[mode]]);
    } else {
      spawned = spawn('node', ['--expose-gc', scripts[mode]]);
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
      helpers.updateStats(() => {
        console.log("Finished caching stats");
        schedule.scheduleJob('0 */15 * * * *', () => {
          helpers.updateStats();
        });
        cb();
      });
    },


    // Cache the index page
    // Run this after the checker loop finishes
    cb => {
      console.log("Caching index...");
      helpers.cacheIndex(() => {
        console.log("Finished caching index");
        setInterval(() => {
          helpers.cacheIndex();
        }, settings.general.indexCacheInterval * 1000);
        cb();
      });
    }

  // Prep is done, we can now start the server
  ], () => {
    cb();
  });
}

/////////////

module.exports = {
  server,
  app,
  initStats
};
