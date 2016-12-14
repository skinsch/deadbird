const https = require('https');
https.globalAgent.maxSockets = 150;
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

      async.parallel([
        // Save html for tweet
        cb => {
          db.query('INSERT IGNORE INTO `tweets` SET ?', data, (err, result) => {
            if (result.affectedRows === 0) {
              cb("bad");
              return resolve({id: 0});
            } else {
              err ? cb(err) : cb(null, {id: result.insertId});
            }
          });
        },

        cb => {
          request({url: `https://twitter.com/${user.handle}/status/${data.tweetid}`, gzip: true}, (err, response, body) => {
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
        }
      ], (err, results) => {
        if (!err) {
          let obj = results.filter(a => a !== undefined)[0];
          this.update({tweetSaved: 1}, obj.id).then(() => {
            resolve(obj);
          });
        }
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
  getAllAvailable(days=7) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.date, t.content, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE `deleteDate` IS NULL AND `date` > DATE_SUB(curdate(), INTERVAL ' + days + ' DAY) ORDER BY `date` DESC', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getAllDeleted(start=0, limit=25) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.id, t.date, t.deleteDate, t.content, t.handle, h.handle, t.tweetid FROM `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE `deleteDate` IS NOT NULL ORDER BY `deleteDate` DESC LIMIT ' + start + ', ' + limit, (err, data) => {
        db.query('SELECT COUNT(*) FROM `tweets` WHERE `deleteDate` IS NOT NULL', (err, total) => {
          err ? reject(err) : resolve({tweets: data, total: total[0]['COUNT(*)']});
        });
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
  getDeletedTweets(handle, page=null) {
    return new Promise((resolve, reject) => {
      db.query('SELECT t.*, h.id, h.handle from `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE ' + andify({deleteDate: "!null", ['h.handle']: handle}).query + ' ORDER BY `deletedate` DESC' + (page !== null ? ' LIMIT ' + ((page-1)*25) + ', 25' : ''), (err, data) => {
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
  undeleted(id) {
    return new Promise((resolve, reject) => {
      this.getCond({id}).then(tweet => {
        db.query('UPDATE `tweets` SET ? WHERE ?', [{deleteDate: null}, {id}], (err, result) => {
          let tweetStream = fs.createReadStream(`${__dirname}/../data/tweets/${tweet.tweetid}`);
          let timelineStream = fs.createReadStream(`${__dirname}/../data/timelineTweets/${tweet.tweetid}`);

          // Make sure tweets are gunzipped before deletion
          async.parallel([
            cb => {
              let tweetWrite = tweetStream.pipe(zlib.createGzip()).pipe(fs.createWriteStream(`${__dirname}/../data/tweets/${tweet.tweetid}.gz`));
              tweetWrite.on('finish', () => {
                cb();
              });
            },
            cb => {
              let timelineWrite = timelineStream.pipe(zlib.createGzip()).pipe(fs.createWriteStream(`${__dirname}/../data/timelineTweets/${tweet.tweetid}.gz`));
              timelineWrite.on('finish', () => {
                cb();
              });
          }], () => {
            fs.unlink(`${__dirname}/../data/tweets/${tweet.tweetid}`, () => {
              fs.unlink(`${__dirname}/../data/timelineTweets/${tweet.tweetid}`, () => {
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
      fs.stat(`${__dirname}/../data/tweets/${id}`, (err, info) => {
        fs.readFile(`${__dirname}/../data/tweets/${id}`, 'utf8', (err, tweet) => {
          fs.readFile(`${__dirname}/../data/timelineTweets/${id}`, 'utf8', (err, timeline) => {
            resolve({tweet, timeline, info});
          });
        });
      });
    });
  },
  genTweetPage(handle, id) {
    return new Promise((resolve, reject) => {
      Handle.getTemplate(handle).then(template => {
        this.getTweetTxt(id).then(tweet => {
          if (tweet.tweet === undefined) return reject("TWEET_NOT_EXIST");

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
  genTimeline(handle, page=null) {
    return new Promise((resolve, reject) => {

      let handleRes, template, tweets;
      async.series([
        cb => Handle.getCond({handle}).then(data => {
          handleRes = data;
          cb(null);
        }),
        cb => Handle.getTemplate(handle).then(data => {
          template = data;
          cb(template.template === undefined ? "HANDLE_NOT_EXIST" : null);
        }),
        cb => this.getDeletedTweets(handle, page).then(data => {
          tweets = data;
          cb(null);
        })

      ], err => {
        if (err) return reject(err);

        let htmlTweets = "";
        let totalPages = Math.ceil(handleRes.deleted/25);
        $ = cheerio.load(template.template);
        $('#permalink-overlay').remove();
        $('.PermalinkProfile-overlay').remove();

        // Inject pagination
        $('#deadbirdPaginationStat').html(`${handleRes.deleted} deleted tweets total`);
        $('#deadbirdPaginationControl').html(`<a href="${handle}/?page=1">&lt;&lt;</a> <a href="${handle}/?page=${page === 1 ? 1 : page-1}">&lt;</a> Page ${page} of ${totalPages} <a href="${handle}/?page=${page === totalPages ? totalPages : page+1}">&gt;</a> <a href="${handle}/?page=${totalPages}">&gt;&gt;</a>`);


        async.eachLimit(tweets, 1, (tweet, cb) => {
          this.getTweetTxt(tweet.tweetid).then(tweet => {
            htmlTweets += `
            <li class="js-stream-item stream-item stream-item" data-item-type="tweet" data-deleteTime="${tweet.info.birthtime}">
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
      })
    });
  }
};
