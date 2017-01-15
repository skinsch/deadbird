const fs       = require('fs');
const cheerio  = require('cheerio');
const utils    = require('./utils');
const db       = require('./models/db');
const Handle   = require('./models/handle');
const async    = require('async');
const settings = require('./utils').settings;

let tty = process.stdout.isTTY ? true : false;

const charm = require('charm')();

if (tty) {
  charm.pipe(process.stdout);
  charm.cursor(false);
}

let handles;
var total = 0;
var fails = 0;

let q = async.queue((handle, cb) => {
  Handle.fetchTemplate(handle.handle, status => {
    // gone = Maybe twitter handle changed...need to handle this in the future
    if (status === true || status === 'gone') {
      ++total;
      if (tty) {
        charm.left(255);
        charm.erase('line');
        charm.write(`${total} / ${handles.length}+${fails} | ${Math.floor(total/(handles.length+fails)*100)} | ${handles.length+fails-total} | Fetched template for ${handle.handle}`)
      } else {
        process.stdout.write(JSON.stringify({status: `${total} / ${handles.length}+${fails}`, percent: Math.floor(total/(handles.length+fails)*100), remaining: handles.length+fails-total, text: `Fetched template for ${handle.handle}`}));
      }

    // Failed to fetch, so push back into queue
    } else {
      total++;
      fails++;
      q.push(handle);
    }
    cb();
  });
}, 15);
q.pause();
q.drain = function() {
  if (tty) {
    charm.down(1);
    charm.cursor(true);
    console.log(`\nFinished fetching templates`);
  } else {
    process.stdout.write(JSON.stringify({done: true, text: `Finished fetching templates`}));
  }
  process.exit();
};

db.init(() => {
  Handle.getAll().then(data => {
    handles = data;
    handles.forEach(handle => {
      q.push(handle);
    });

    q.resume();
  });
});
