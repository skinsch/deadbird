const fs       = require('fs');
const cheerio  = require('cheerio');
const Promise  = require('bluebird');
const moment   = require('moment');
const _        = require('lodash');
const request  = require('request');
const settings = require('./settings.json');

let store = {};

module.exports = {
  pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  },
  range(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  andify(cond) {
    const db = require('./models/db').connection;
    var formatted = "";
    if (Object.keys(cond).length > 1) {
      _.each(cond, function(value, key) {
        if (value === "!null") {
          formatted += key + " IS NOT NULL AND ";
        } else {
          formatted += key + " = " + db.escape(value) + " AND ";
        }
      });
      return {query: formatted.slice(0, -5)};
    } else {
      return cond;
    }
  },
  settings,
  tweetExists(handle, id, cb) {
    try {
      request.head(`https://twitter.com/${handle}/status/${id}`, {
        timeout: settings.general.timeout,
        gzip: true
      }, (err, response) => {
        // If error or lack of response reaching page, push back into queue
        if (err || !response) {
          cb("fail");
        } else {

          // 200 = good
          if (response.statusCode === 200) {
            cb(true);

          // 404 = bad
          } else if (response.statusCode === 404) {
            cb(false);

          // anything else = Twitter possibly down so pushback into queue
          } else {
            cb("fail");
          }
        }
      });
    } catch (e) {
      cb(true);
    }
  },
  tweetExistsB(handle, id, timeout, cb) {
    try {
      request.head(`https://twitter.com/${handle}/status/${id}`, {
        timeout: Number(timeout),
        gzip: true
      }, (err, response) => {
        // If error or lack of response reaching page, push back into queue
        if (err || !response) {
          cb("fail");
        } else {

          // 200 = good
          if (response.statusCode === 200) {
            cb(true);

          // 404 = bad
          } else if (response.statusCode === 404) {
            cb(false);

          // anything else = Twitter possibly down so pushback into queue
          } else {
            cb("fail");
          }
        }
      });
    } catch (e) {
      cb(true);
    }
  },
  validUser(handle, cb) {
    return new Promise((resolve, reject) => {
      let $;
      request({url: "https://twitter.com/" + handle, gzip: true}, (err, response, body) => {
        if (body === undefined || err) return reject();
        $ = cheerio.load(body);

        // Check for valid, non-protected, and 100k+ followers twitter account
        if (
          [undefined, null].indexOf($('.ProfileHeaderCard-joinDateText').html()) === -1 &&
          $('span.Icon--protected').length === 0 &&
          Number($("a[data-nav='followers']").attr('title').slice(0, -10).replace(/,/g, '')) >= 100000) {
          resolve();
        } else {
          reject();
        }
      });
    });
  },
  acceptingNewUsers() {
    let settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    return settings.general.acceptingNewUsers;
  },
  maxNewUsers() {
    let settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
    return settings.general.maxUsers;
  },
  set(key, value) {
    store[key] = value;
  },
  get(key) {
    return store[key];
  }
};
