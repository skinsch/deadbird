const async   = require('async');
const moment  = require('moment');
const utils   = require('./utils')
const helpers = require('./helpers');

// Recache index pages whenever checker finishes
utils.on('indexCacherStart', () => {
  console.log("Caching index...");
  helpers.cacheIndex(() => {
    console.log("Finished caching index");
    utils.emit('indexCacherDone');
  });
});
