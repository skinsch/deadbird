const fs           = require('fs');
const flash        = require('connect-flash');
const express      = require('express');
const path         = require('path');
const favicon      = require('serve-favicon');
const logger       = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const compress     = require('compression');
const debug        = require('debug')('Deadbird:server');
const http         = require('http');
const schedule     = require('node-schedule');

const utils    = require('./utils')
const settings = utils.settings;

const io = require('socket.io')(settings.general.socket);
require('./socket')(io);
require('./events');

// Redis Session Store
const session      = require('express-session');
const redisStore   = require('connect-redis')(session);

const app    = express();
const server = http.createServer(app);

// view engine setup
app.set('views', path.join(__dirname, '.viewsMin/pages'));
app.set('view engine', 'ejs');
app.set('port', settings.general.port);

app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.png')));
app.use(compress());
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


// Session store
app.use(cookieParser('keyboard cat'));
app.use(session({
  key: settings.session.key,
  store: new redisStore(),
  secret: settings.session.secret,
  cookie: {
    path: '/'
  },
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.use('*', (req, res, next) => {
  if (req.originalUrl.match('pbs.twimg.com')!== null) return res.redirect(req.originalUrl.slice(1));

  req.session.originalUrl = req.originalUrl;

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

  req.session.messages = messages;
  utils.set('analytics', fs.readFileSync('./views/snippets/googleAnalytics.ejs', 'utf8'));
  next();
});

app.use('/user',        require('./routes/user'));
app.use('/stats',       require('./routes/stats'));
app.use('/statsStream', require('./routes/statsStream'));
app.use('/',            require('./routes/index'));

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
  //res.render('error');
});

module.exports = {
  server,
  app
};
