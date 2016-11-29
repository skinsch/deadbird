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
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', settings.general.port);

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.png')));
app.use(compress());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('*', (req, res, next) => {
  app.set('originalUrl', req.originalUrl);
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

// Spawners
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
          data[mode].nextCycle = new Date().getTime() + settings.general.checkerRestInterval * 1000;
        }
      } else if (mode === 'fetcher') {
        if (spawnedData.done === undefined) {
          data[mode].status = spawnedData.status;
          data[mode].user   = spawnedData.user;
          data[mode].text   = spawnedData.text;
        } else {
          data[mode] = {};
          data[mode].text = spawnedData.text;
          data[mode].nextCycle = new Date().getTime() + settings.general.fetcherRestInterval * 1000;
        }
      } else if (mode === 'template') {
        if (spawnedData.done === undefined) {
          data[mode].status = spawnedData.status;
          data[mode].text   = spawnedData.text;
        } else {
          data[mode] = {};
          data[mode].text = spawnedData.text;
          data[mode].nextCycle = new Date().getTime() + settings.general.templateRestInterval * 1000;
        }
      }
    });

    spawned.on('close', code => {
      resolve();
    });
  });
}

checkerLoop();
function checkerLoop() {
  spawner('checker').then(() => {
    setTimeout(() => {
      checkerLoop();
    }, settings.general.checkerRestInterval * 1000);
  });
}

fetcherLoop();
function fetcherLoop() {
  spawner('fetcher').then(() => {
    setTimeout(() => {
      fetcherLoop();
    }, settings.general.fetcherRestInterval * 1000);
  });
}

templateLoop();
function templateLoop() {
  spawner('template').then(() => {
    setTimeout(() => {
      templateLoop();
    }, settings.general.templateRestInterval * 1000);
  });
}

/////////////

module.exports = {
  server,
  app
};
