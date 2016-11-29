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
  checker: {}
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

// Fetcher/Checker spawners
function spawnFetcher() {
  return new Promise((resolve, reject) => {
    data.fetcher = {};
    const fetcher = spawn('node', ['fetch']);

    fetcher.stdout.on('data', fetchData => {
      try {
        fetchData = JSON.parse(fetchData);
      } catch(e) {
        return;
      }

      if (fetchData.done === undefined) {
        data.fetcher.status = fetchData.status;
        data.fetcher.user   = fetchData.user;
        data.fetcher.text   = fetchData.text;
      } else {
        data.fetcher = {};
        data.fetcher.text      = fetchData.text;
        data.fetcher.nextCycle = new Date().getTime() + settings.general.fetcherRestInterval * 1000;
      }
    });

    fetcher.on('close', code => {
      resolve();
    });
  });
}

function spawnChecker() {
  return new Promise((resolve, reject) => {
    data.checker = {};
    const checker = spawn('node', ['check']);

    checker.stdout.on('data', checkData => {
      try {
        checkData = JSON.parse(checkData);
      } catch(e) {
        return;
      }
      if (checkData.text === undefined) {
        // Update data
        data.checker.status    = checkData.status;
        data.checker.remaining = checkData.remaining;
        data.checker.rate      = checkData.rate;
        data.checker.eta       = checkData.eta;
        data.checker.user      = checkData.user;
        data.checker.url       = checkData.url;
      } else {
        data.checker = {};
        data.checker.text = checkData.text;
        data.checker.nextCycle = new Date().getTime() + settings.general.checkerRestInterval * 1000;
      }
    });

    checker.on('close', code => {
      resolve();
    });
  });
}

checkerLoop();
function checkerLoop() {
  spawnChecker().then(() => {
    setTimeout(() => {
      checkerLoop();
    }, settings.general.checkerRestInterval * 1000);
  });
}

fetcherLoop();
function fetcherLoop() {
  spawnFetcher().then(() => {
    setTimeout(() => {
      fetcherLoop();
    }, settings.general.fetcherRestInterval * 1000);
  });
}


///////////////////////////

module.exports = {
  server,
  app,
  spawnFetcher,
  spawnChecker
};
