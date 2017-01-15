const utils    = require('../utils');
const settings = utils.settings;
const https = require('https');
https.globalAgent.maxSockets = settings.general.maxSockets;

const fs       = require('fs');
const moment   = require('moment');
const Promise  = require('bluebird');
const crypto   = require('crypto');
const cheerio  = require('cheerio');
const request  = require('request');
const async    = require('async');
const zlib     = require('zlib');
const Readable = require('stream').Readable;
const andify   = utils.andify;
const db       = require('./db').connection;

const Handle = require('./handle');

module.exports = {
  add(data, user=null) {
    return new Promise((resolve, reject) => {

      let timelineTweetHTML = data.timelineTweet;
      delete data.timelineTweet;

      // If date of tweet is less than a day old, perform refetches else skip them
      if (new Date().getTime() - new Date(data.date*1000).getTime() > 3600000) {
        data.checkDate = moment(new Date().getTime() + 621920000000).format("YYYY-MM-DD HH:mm:ss");
      } else {
        // next check in 1 minute initially
        data.checkDate = moment(new Date().getTime() + 60000).format("YYYY-MM-DD HH:mm:ss");
      }

      data.date = moment(new Date(data.date*1000).getTime()).format("YYYY-MM-DD HH:mm:ss");

      let insertedId;
      async.series([
        // Save html for tweet
        cb => {
          db.query('INSERT IGNORE INTO `tweets` SET ?', data, (err, result) => {
            if (result.affectedRows === 0) {
              resolve(false);
              cb("bad");
            } else {
              insertedId = result.insertId;
              err ? cb(err) : cb(null, {id: insertedId});
            }
          });
        },

        cb => {
          request({url: `https://twitter.com/${user.handle}/status/${data.tweetid}`, timeout: settings.general.timeout * 3, gzip: true}, (err, response, body) => {
            // In case tweet actually gets deleted after we detect and before we download it to prevent infinite loop
            if (response && response.statusCode === 404) {
              resolve('gone');
              cb('bad');
            } else if (err || body === undefined) {
              db.query('DELETE FROM tweets WHERE `id` = ' + insertedId, (err, result) => {
                resolve(false);
                cb('bad');
              });
            } else {
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
            }
          });
        }
      ], (err, results) => {
        if (!err) {
          let obj = results.filter(a => a !== undefined)[0];
          this.update({tweetSaved: 1}, obj.id).then(() => {
            resolve(true);
          });
        }
      });
    });
  },
  readd(data) {
    let nextChecks = [300, 3600, 14400, 86400, 259200, 604800, 621920000];

    return new Promise((resolve, reject) => {
      async.series([
        // Set checking to true so checker doesn't touch record until snapshot is taken
        cb => {
          this.update({checking: 1}, data.id).then(() => {
            cb();
          });
        },
        cb => {
          request({url: `https://twitter.com/${data.handlename}/status/${data.tweetid}`, timeout: settings.general.timeout * 3, gzip: true}, (err, response, body) => {
            if (err || body === undefined) {
              return cb('fail');
            }

            $ = cheerio.load(body, {
              normalizeWhitespace: true
            });

            let mainTweet = new Readable;
            mainTweet.push($('.PermalinkOverlay-modal').html());
            mainTweet.push(null);

            mainTweet.pipe(zlib.createGzip()).pipe(fs.createWriteStream(`${__dirname}/../data/tweets/${data.tweetid}.gz`));
            cb();
          });
        }
      ], err => {
        if (!err) {
          this.update({
            checking: 0,
            checkDate: moment(new Date().getTime() + nextChecks[data.checks]*1000).format("YYYY-MM-DD HH:mm:ss"), checks: data.checks + 1
          }, data.id).then(() => {
            resolve(data);
          });
        } else {
          resolve('fail');
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
  getDeletedTweetsDate(handle=null, date, page=null) {
    return new Promise((resolve, reject) => {
      let handleID;
      db.query('SELECT t.*, h.id AS handleID, h.handle from `tweets` t INNER JOIN `handles` h ON (t.handle=h.id) WHERE' + (handle ? " h.handle = '" + handle + "' AND " : " ") + 'DATE(deleteDate) = DATE(\'' + date + '\') ORDER BY `deletedate` DESC' + (page !== null ? ' LIMIT ' + ((page-1)*25) + ', 25' : ''), (err, data) => {

        if (data.length > 0) handleID = data[0].handleID;
        else handleID = -1;
        db.query('SELECT COUNT(*) from `tweets` WHERE' + (handle ? " handle = '" + handleID + "' AND " : " ") + 'DATE(deleteDate) = DATE(\'' + date + '\')', (err, total) => {
          err ? reject(err) : resolve({tweets: data, total: total[0]['COUNT(*)']});
        });
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
      this.getCond({tweetid: id}).then(info => {
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

      let handleRes, template, tweet;
      async.series([
        cb => Handle.getCond({handle}).then(data => {
          handleRes = data;
          cb(null);
        }),
        cb => Handle.getTemplate(handle).then(data => {
          template = data;
          cb(template.template === undefined ? "HANDLE_NOT_EXIST" : null);
        }),
        cb => this.getTweetTxt(id).then(data => {
          tweet = data;
          cb(null);
        })
      ], err => {
        if (err) return reject(err);

        if (tweet.tweet === undefined) return reject("TWEET_NOT_EXIST");
        $ = cheerio.load(template.template);
        $('.PermalinkOverlay').css('display', 'block');
        $('.PermalinkOverlay-modal').prepend(tweet.tweet).html();

        // Inject stats
        $('.deletedTweets a').attr('title', `${handleRes.deleted} Deleted Tweets`);
        $('.deletedTweets .ProfileNav-value').html(handleRes.deleted);

        $('.totalTweets a').attr('title', `${handleRes.total} Total Tweets`);
        $('.totalTweets .ProfileNav-value').html(handleRes.total);

        $('head').append("<base href='" + settings.general.basehref + "'>");
        $('body').append("<script src='js/jquery.js'></script>");
        $('body').append("<script src='js/moment.min.js'></script>");
        $('body').append("<script src='js/general.js'></script>");
        $('body').append(utils.get('analytics'));
        resolve($.html());
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
        if (totalPages === 0) totalPages = 1;
        $ = cheerio.load(template.template);
        $('#permalink-overlay').remove();
        $('.PermalinkProfile-overlay').remove();

        // Inject pagination
        $('#deadbirdPaginationStat').html(`${handleRes.deleted} total deleted tweets`);
        $('#deadbirdPaginationControl').html(`<a href="${handleRes.handle}/?page=1">&lt;&lt;</a> <a href="${handleRes.handle}/?page=${page === 1 ? 1 : page-1}">&lt;</a> Page ${page} of ${totalPages} <a href="${handleRes.handle}/?page=${page === totalPages ? totalPages : page+1}">&gt;</a> <a href="${handleRes.handle}/?page=${totalPages}">&gt;&gt;</a>`);

        // Inject stats
        $('.deletedTweets a').attr('title', `${handleRes.deleted} Deleted Tweets`);
        $('.deletedTweets .ProfileNav-value').html(handleRes.deleted);

        $('.totalTweets a').attr('title', `${handleRes.total} Total Tweets`);
        $('.totalTweets .ProfileNav-value').html(handleRes.total);

        async.eachLimit(tweets, 1, (tweet, cb) => {
          this.getTweetTxt(tweet.tweetid).then(tweet => {
            htmlTweets += `
            <li class="js-stream-item stream-item stream-item" data-item-type="tweet" data-deleteTime="${tweet.info.deleteDate}">
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
          $('body').append(utils.get('analytics'));
          resolve($.html());
        });
      })
    });
  }
};
