const fs      = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const utils   = require('./utils');
const db      = require('./models/db');
const Tweet   = require('./models/tweet');
const Handle  = require('./models/handle');
const Promise = require('bluebird');
const async   = require('async');

const charm = require('charm')();
charm.pipe(process.stdout);
charm.cursor(false);

let handles;
db.init(() => {
  Handle.getAllMissingTemplates().then(data => {
    handles = data;
    main();
  });
});

function main() {
  let total = 0;
  async.eachLimit(handles, 15, (handle, cb) => {

    getTemplate(handle, () => {
      charm.left(255);
      charm.erase('line');
      charm.write(`${++total} / ${handles.length} | Fetched template for ${handle.handle}`)
      cb();
    });
  }, () => {
    charm.cursor(true);
    console.log('\ndone');
    process.exit();
  });
}

function getTemplate(handle, cb) {
  request(`https://twitter.com/${handle.handle}`, (err, response, body) => {
    $ = cheerio.load(body, {
      normalizeWhitespace: true
    });
    $('.Grid-cell .u-lg-size2of3').empty();
    $('.Grid-cell .u-size1of3').remove();
    $('.Grid-cell .u-lg-size2of3').append(`
<div id="timeline" class="ProfileTimeline ">
  <div class="stream">
   <ol class="stream-items js-navigable-stream" id="stream-items-id">
   </ol>
  </div>
</div>`);

    fs.writeFile(`./templates/${handle.id}`, $.html(), () => {
      Handle.update({template: 1}, handle.id).then(() => {
        cb();
      });
    });
  });
}
