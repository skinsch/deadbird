const fs       = require('fs');
const moment   = require('moment');
const Promise  = require('bluebird');
const crypto   = require('crypto');
const cheerio  = require('cheerio');
const request  = require('request');
const async    = require('async');
const zlib     = require('zlib');
const Readable = require('stream').Readable;
const andify   = require('../utils').andify;
const settings = require('../utils').settings;
const db       = require('./db').connection;

const Handle = require('./handle');

module.exports = {
  add(data, user=null) {
    return new Promise((resolve, reject) => {
      let self = this;
      let timelineTweetHTML = data.timelineTweet;
      delete data.timelineTweet;

      data.date = moment(new Date(data.date*1000).getTime()).format("YYYY-MM-DD HH:mm:ss");

      this.getCond({tweetid: String(data.tweetid)}).then(exists => {
        if (exists && exists.tweetSaved !== 0) return resolve({id: 0});

        async.parallel([
          // Save html for tweet
          cb => {
            request(`https://twitter.com/${user.handle}/status/${data.tweetid}`, (err, response, body) => {
               if (err || body === undefined) return resolve({id: 0});
              $ = cheerio.load(body, {
                normalizeWhitespace: true
              });

              let mainTweet = new Readable;
              mainTweet.push($('.PermalinkOverlay-modal').html());
              mainTweet.push(null);

              mainTweet.pipe(zlib.createGzip()).pipe(fs.createWriteStream(`${__dirname}/../data/tweets/${data.tweetid}.gz`));

              let timelineTweet = new Readable;
              timelineTweet.push(timelineTweetHTML);
              timelineTweet.push(null);

              timelineTweet.pipe(zlib.createGzip()).pipe(fs.createWriteStream(`${__dirname}/../data/timelineTweets/${data.tweetid}.gz`));
              cb();
            });
          },

          cb => {
            db.query('INSERT IGNORE INTO `tweets` SET ?', data, (err, result) => {
              err ? cb(err) : cb(null, {id: result.insertId});
            });
          }
        ], (err, results) => {
          if (err) reject(err);
          else {
            let obj = results.filter(a => a !== undefined)[0];
            this.update({tweetSaved: 1}, obj.id).then(() => {
              resolve(obj);
            });
          }
        });
      });
    });
  },
  remove(cond) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM `tweets` WHERE ?', cond, (err, data) => {
        err ? reject(err) : resolve();
      });
    });
  },
  getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.date, t.content, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) ORDER BY `date` DESC', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getAllAvailable() {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.date, t.content, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE `deleteDate` IS NULL ORDER BY `date` DESC', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getAllDeleted(start=0, limit=25) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.date, t.deleteDate, t.content, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE `deleteDate` IS NOT NULL ORDER BY `deleteDate` DESC LIMIT ' + start + ', ' + limit, (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getMissingScreenshot() {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE `screenshot` IS NULL ORDER BY `date` DESC', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getCond(cond) {
    return new Promise((resolve, reject) => {
      cond = andify(cond);

      if (cond.query !== undefined) {
        db.query('SELECT * FROM `tweets` WHERE ' + cond.query, (err, data) => {
          if (err) reject(err);
          else if (data.length === 0) resolve(null);
          else if (data.length === 1) resolve(data[0]);
          else resolve(data);
        });
      } else {
        db.query('SELECT * FROM `tweets` WHERE ?', cond, (err, data) => {
          if (err) reject(err);
          else if (data.length === 0) resolve(null);
          else if (data.length === 1) resolve(data[0]);
          else resolve(data);
        });
      }
    });
  },
  getTweets(handle) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.*, h.id, h.handle from `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE ?', {['h.handle']: handle}, (err, data) => {
        if (err) reject(err);
        else if (data.length === 0) resolve(null);
        else resolve(data);
      });
    });
  },
  getDeletedTweets(handle) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.*, h.id, h.handle from `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE ' + andify({deleteDate: "!null", ['h.handle']: handle}).query + ' ORDER BY `deletedate` DESC', (err, data) => {
        if (err) reject(err);
        else if (data.length === 0) resolve(null);
        else resolve(data);
      });
    });
  },
  update(vals, id) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE `tweets` SET ? WHERE ?', [vals, {id}], (err, result) => {
        resolve({err: err, result: result});
      });
    });
  },
  getVal(key, id) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM `tweets` WHERE ?', {id}, (err, data) => {
        if (err) reject(err);
        else if (data.length === 0) resolve(null);
        else resolve(data[0][key]);
      });
    });
  },
  deleted(id) {
    return new Promise((resolve, reject) => {
      this.getCond({id}).then(tweet => {
        db.query('UPDATE `tweets` SET ? WHERE ?', [{deleteDate: moment().format("YYYY-MM-DD HH:mm:ss")}, {id}], (err, result) => {
          let tweetStream = fs.createReadStream(`${__dirname}/../data/tweets/${tweet.tweetid}.gz`);
          let timelineStream = fs.createReadStream(`${__dirname}/../data/timelineTweets/${tweet.tweetid}.gz`);

          let tweetWrite = tweetStream.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(`${__dirname}/../data/tweets/${tweet.tweetid}`));
          let timelineWrite = timelineStream.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(`${__dirname}/../data/timelineTweets/${tweet.tweetid}`));

          // Make sure tweets are gunzipped before deletion
          async.parallel([
            cb => {
              let tweetWrite = tweetStream.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(`${__dirname}/../data/tweets/${tweet.tweetid}`));
              tweetWrite.on('finish', () => {
                cb();
              });
            },
            cb => {
              let timelineWrite = timelineStream.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(`${__dirname}/../data/timelineTweets/${tweet.tweetid}`));
              timelineWrite.on('finish', () => {
                cb();
              });
            
          }], () => {
            fs.unlink(`${__dirname}/../data/tweets/${tweet.tweetid}.gz`, () => {
              fs.unlink(`${__dirname}/../data/timelineTweets/${tweet.tweetid}.gz`, () => {
                resolve({err: err, result: result});
              });
            });
          });

        });
      });
    });
  },
  getTweetTxt(id) {
    return new Promise((resolve, reject) => {
      fs.readFile(`${__dirname}/../data/tweets/${id}`, 'utf8', (err, tweet) => {
        fs.readFile(`${__dirname}/../data/timelineTweets/${id}`, 'utf8', (err, timeline) => {
          resolve({tweet, timeline});
        });
      });
    });
  },
  genTweetPage(handle, id) {
    return new Promise((resolve, reject) => {
      Handle.getTemplate(handle).then(template => {
        this.getTweetTxt(id).then(tweet => {
          $ = cheerio.load(template.template);
          $('.PermalinkOverlay').css('display', 'block');
          $('.PermalinkOverlay-modal').prepend(tweet.tweet).html();
          $('head').append("<base href='" + settings.general.basehref + "'>")
          $('body').append("<script src='js/jquery.js'></script>")
          $('body').append("<script src='js/moment.min.js'></script>")
          $('body').append("<script src='js/general.js'></script>")
          resolve($.html());
        });
      });
    });
  },
  genTimeline(handle) {
    return new Promise((resolve, reject) => {
      Handle.getTemplate(handle).then(template => {
        this.getDeletedTweets(handle).then(tweets => {

          let htmlTweets = "";
          $ = cheerio.load(template.template);
          $('#permalink-overlay').remove();
          $('.PermalinkProfile-overlay').remove();
          async.eachLimit(tweets, 1, (tweet, cb) => {
            this.getTweetTxt(tweet.tweetid).then(tweet => {
              htmlTweets += `
              <li class="js-stream-item stream-item stream-item" data-item-type="tweet">
                ${tweet.timeline}
              </li>`;
              cb();
            });
          }, () => {
            $('head').append(`
              <style>
                html, body, #doc, #page-outer {
                    height: initial !important;
                }
              </style>`);
            $('#stream-items-id').append(htmlTweets).html();
            $('head').append("<base href='" + settings.general.basehref + "'>")
            $('body').append("<script src='js/jquery.js'></script>")
            $('body').append("<script src='js/moment.min.js'></script>")
            $('body').append("<script src='js/general.js'></script>")
            resolve($.html());
          });
        });
      });
    });
  }
};
