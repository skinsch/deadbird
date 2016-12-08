const cheerio  = require('cheerio');
const Promise  = require('bluebird');
const moment   = require('moment');
const _        = require('lodash');
const request  = require('request');
const settings = require('./settings.json');

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
        // If error reaching page, just assume it exists
        if (err) return cb("fail");

        // If body says page doesn't exist (and it isn't because Twitter errored out) and the status code isn't 200
        else if (response && response.statusCode !== 200) {
          cb(false);
        } else {
          cb(true);
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
        // If error reaching page, just assume it exists
        if (err) return cb("fail");

        // If body says page doesn't exist (and it isn't because Twitter errored out) and the status code isn't 200
        else if (response && response.statusCode !== 200) {
          cb(false);
        } else {
          cb(true);
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
  }
};
