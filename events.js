const utils   = require('./utils');
const helpers = require('./helpers');

// Recache index pages whenever checker finishes
utils.on('indexCacherStart', () => {
  console.log("Caching index...");
  helpers.cacheIndex(() => {
    utils.set('streamUpdate', new Date().getTime());
    console.log("Finished caching index");
    utils.emit('indexCacherDone');
  });
});

utils.on('statsStreamCacherStart', () => {
  console.log("Caching statsStream...");
  helpers.cacheStatsStream(() => {
    console.log("Finished caching statsStream");
    utils.emit('statsStreamCacherDone');
  });
});
