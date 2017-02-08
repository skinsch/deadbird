const express  = require('express');
const router   = express.Router();
const _        = require('lodash');
const utils    = require('../utils');
const settings = utils.settings;

const Handle = require('../models/handle');

let defaultVars = {};

router.all('*', (req, res, next) => {
  defaultVars = {
    originalUrl:  req.session.originalUrl,
    dates:        utils.get('dates'),
    messages:     req.session.messages,
    autocomplete: utils.get('autocomplete'),
    statUpdate:   utils.get('statUpdate'),
    basehref:     settings.general.basehref,
    socket:       settings.general.socket
  };

  next();
});

router.get('/', (req, res, next) => {
  Handle.getAll('deleted').then(handles => {
    res.render('stats', _.merge({title: "Stats", handle: undefined, stats: JSON.stringify(utils.get('stats')['all']), handles}, defaultVars));
  });
});

router.get('/:handle', (req, res, next) => {
  let handleIn = String(req.params.handle.replace(/@/g, ''));
  Handle.getCond({handle: handleIn}).then(handle => {
    if (handle === null) {
      req.flash('warning', `${handleIn} is not in the database`);
      return res.redirect('/stats');
    }

    res.render('userStats', _.merge({title: `User Stats for ${handle.handle}`, handle: handle.handle, stats: JSON.stringify(utils.get('stats')[handle.id])}, defaultVars));
  });
});

module.exports = router;
