const async    = require('async');
const express  = require('express');
const router   = express.Router();
const _        = require('lodash');
const request  = require('request');
const utils    = require('../utils');
const helpers  = require('../helpers');
const settings = utils.settings;

const Handle = require('../models/handle');

let defaultVars = {};
utils.set('ips', {});

let originalUrl, dates, messages, autocomplete, basehref;

router.all('*', (req, res, next) => {
  
  defaultVars = {
    originalUrl:  utils.get('originalUrl'),
    dates:        utils.get('dates'),
    messages:     utils.get('messages'),
    autocomplete: utils.get('autocomplete'),
    statUpdate:   utils.get('statUpdate'),
    basehref:     settings.general.basehref,
    socket:       settings.general.socket
  };

  Handle.getAll().then(data => {
    if (!utils.acceptingNewUsers() || data.length >= utils.maxNewUsers()) {
      req.flash('warning', `We are currently not accepting new users. Please try again later`);
      res.redirect('/');
    } else {
      next();
    }
  });
});

router.get('/', (req, res, next) => {
  res.render('addUser', _.merge({title: "Add new user"}, defaultVars));
});

router.post('/', (req, res, next) => {
  let handle = String(req.body.handle).replace(/@/g, '');
  let ip     = utils.getIP(req);

  async.series([
    cb => cb(!ipBlacklist(ip) ? "ip_already_used" : null),

    cb => Handle.getCond({handle}).then(res => {
      cb(res === null ? null : "duplicate");
    }),

    cb => utils.validUser(handle).then(() => {
      request(`https://twitter.com/${handle}`, {
        timeout: settings.general.timeout * 3,
        gzip: true
      }, (err, response, body) => {
        Handle.add(handle).then(() => Handle.fetchTemplate(handle, () => {
          helpers.updateAutoComplete(() => {
            ipBlacklist(ip, 'add');
            cb(null);
          });
        }));
      });
    }, cb.bind(this, "invalid_user"))
  ], err => {
    if (err === "duplicate") {
      req.flash('warning', `${handle} is already in the database.`);
      res.redirect('/user');
    } else if (err === "ip_already_used") {
      req.flash('warning', `This IP address has already added an account.`);
      res.redirect('/user');
    } else if (err === "invalid_user") {
      req.flash('warning', `${handle} is either invalid, protected, or has less than 100k followers.`);
      res.redirect('/user');
    } else {
      req.flash('info', `${handle} was added successfully!`);
      res.redirect(`/`);
    }
  });
});

let ips = utils.get('ips');

function ipBlacklist(ip, mode='lookup') {
  return mode === 'lookup' ? ips[ip] === undefined : ips[ip] = true;
}

module.exports = router;
