const fs       = require('fs');
const cheerio  = require('cheerio');
const request  = require('request');
const utils    = require('./utils');
const db       = require('./models/db');
const Handle   = require('./models/handle');
const async    = require('async');
const settings = require('./utils').settings;

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

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
      charm.left(255);
      charm.erase('line');
      charm.write(`${++total} / ${handles.length} | Fetched template for ${handle.handle}`)
      cb();
    });
  }, () => {
    console.log('');
    charm.cursor(true);
    process.exit();
  });
}
