const fs       = require('fs');
const cheerio  = require('cheerio');
const request  = require('request');
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
db.init(() => {
  Handle.getAll().then(data => {
    handles = data;
    main();
  });
});

function main() {
  let total = 0;
  async.eachLimit(handles, 15, (handle, cb) => {

    Handle.fetchTemplate(handle.handle, () => {
      ++total;
      if (tty) {
        charm.left(255);
        charm.erase('line');
        charm.write(`${total} / ${handles.length} | Fetched template for ${handle.handle}`)
      } else {
        process.stdout.write(JSON.stringify({status: `${total} / ${handles.length}`, text: `Fetched template for ${handle.handle}`}));
      }
      cb();
    });
  }, () => {
    if (tty) {
      charm.down(1);
      charm.cursor(true);
      console.log(`\nFinished fetching templates`);
    } else {
      process.stdout.write(JSON.stringify({done: true, text: `Finished fetching templates`}));
    }
    process.exit();
  });
}
