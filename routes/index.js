const path     = require('path');
const async    = require('async');
const express  = require('express');
const router   = express.Router();
const _        = require('lodash');
const utils    = require('../utils');
const helpers  = require('../helpers');
const settings = utils.settings;

const Tweet  = require('../models/tweet');
const Handle = require('../models/handle');

let defaultVars = {};

// Cache the handles list for autocomplete before loading routes
helpers.updateAutoComplete(main);

function main() {

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

    next();
  });

  /* GET home page. */
  router.get('/', (req, res, next) => {
    let page = Number((req.query.page || 1));
    if (page < 1) page = 1;
    if (utils.get('cache').index[page] === undefined) return res.redirect('/');

    res.render('stream', _.merge(utils.get('cache').index[page], {title: "Home"}, defaultVars));
  });

  router.get('/leaderboards', (req, res, next) => {
    Handle.getAll('deleted').then(handles => {
      res.render('leaderboards', _.merge({title: "Leaderboards", handles}, defaultVars));
    });
  });

  router.get('/about', (req, res, next) => {
    res.render('about', _.merge({title: "About"}, defaultVars));
  });

  router.get('/profileImg/:img', (req, res, next) => {
    res.sendFile(path.resolve(__dirname + '/../data/profileImg/' + String(req.params.img)));
  });

  router.get('/:handle', (req, res, next) => {
    let handle = String(req.params.handle.replace(/@/g, ''));
    let ip     = utils.getIP(req);

    let page = Number((req.query.page || null));
    if (page < 1) page = 1;

    if (handle === "favicon.ico") return;

    Tweet.genTimeline(handle, page).then(html => {
      res.send(html);

    // User doesn't exist - Add to db. This behavior will be more sophisticated in the future.
    }, err => {
      req.flash('warning', `${handle} is not in the database`);
      res.redirect('/');
    });
  });

  router.get('/:handle/status/:id', (req, res, next) => {
    let handle = String(req.params.handle.replace(/@/g, ''));
    let id     = String(req.params.id);

    Tweet.genTweetPage(handle, id).then(html => {
      res.send(html);
    }, err => {
      res.redirect(`/${handle}`);
    });
  });
}

module.exports = router;
