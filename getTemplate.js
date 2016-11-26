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

    getTemplate(handle, () => {
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

function getTemplate(handle, cb) {
  request(`https://twitter.com/${handle.handle}`, (err, response, body) => {
    $ = cheerio.load(body, {
      normalizeWhitespace: true
    });

    // Empty time line and remove extraneous info
    $('.Grid-cell .u-lg-size2of3').empty();
    $('.Grid-cell .u-size1of3').remove();
    $('link[rel="preload"]').remove();
    $('script[async]').remove();
    $('#init-data').remove();
    $('#global-nav-moments').remove();
    $('.pull-right').remove();
    $('.ProfileNav-item--userActions').remove();

    // Replace favicon
    $('meta[name="msapplication-TileImage"]').remove();
    $('link[rel="mask-icon"]').remove();
    $('link[rel="shortcut icon"]').remove();
    $('link[rel="apple-touch-icon"]').remove();
    $('head').append(`<link rel="icon" type="image/png" href="img/favicon.png" sizes="196x196">`);

    // Replace home link
    $('a[data-nav="home"]').attr('href', settings.general.basehref);

    // Fix stream with proper div
    $('.Grid-cell .u-lg-size2of3').append(`
<div id="timeline" class="ProfileTimeline ">
  <div class="stream">
   <ol class="stream-items js-navigable-stream" id="stream-items-id">
   </ol>
  </div>
</div>`);

    // Extract profile pic and replace with local version
    let profileImage = $('.ProfileAvatar-image').attr('src');
    let ext = profileImage.match(/400x400(.*)/)[1];
    $('.ProfileAvatar-image').attr('src', `profileImg/${handle.id}${ext}`);

    fs.writeFile(`./data/templates/${handle.id}`, $.html(), () => {
      let dl = request(profileImage).pipe(fs.createWriteStream(`./data/profileImg/${handle.id}${ext}`));
      Handle.update({template: 1, ext}, handle.id).then(() => {
        dl.on('finish', () => {
          cb();
        });
      });
    });
  });
}
