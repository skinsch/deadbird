const utils   = require('./utils');
const helpers = require('./helpers');

// Recache index pages whenever checker finishes
utils.on('indexCacherStart', () => {
  helpers.cacheIndex(() => {
    utils.set('streamUpdate', Date.now());
    utils.emit('indexCacherDone');
  });
});

utils.on('statsStreamCacherStart', () => {
  helpers.cacheStatsStream(() => {
    utils.emit('statsStreamCacherDone');
  });
});
