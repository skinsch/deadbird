const fs      = require('fs');
const crypto  = require('crypto');
const moment  = require('moment');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const db      = require('./db').connection;
const andify  = require('../utils').andify;

module.exports = {
  add(data) {
    return new Promise((resolve, reject) => {
      let self = this;
      data.date = moment(new Date(data.date*1000).getTime()).format("YYYY-MM-DD HH:mm:ss");

      db.query('INSERT IGNORE INTO `handles` SET ?', data, (err, result) => {
        err ? reject(err) : resolve({id: result.insertId});
      });
    });
  },
  remove(cond) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM `handles` WHERE ?', cond, (err, data) => {
        err ? reject(err) : resolve();
      });
    });
  },
  getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM `handles`', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getAllMissingTemplates() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM `handles` WHERE `template` = 0', (err, data) => {
        err ? reject(err) : resolve(data);
      });
    });
  },
  getCond(cond) {
    return new Promise((resolve, reject) => {
      cond = andify(cond);

      if (cond.query !== undefined) {
        db.query('SELECT * FROM `handles` WHERE ' + cond.query, (err, data) => {
          if (err) reject(err);
          else if (data.length === 0) resolve(null);
          else if (data.length === 1) resolve(data[0]);
          else resolve(data);
        });
      } else {
        db.query('SELECT * FROM `handles` WHERE ?', cond, (err, data) => {
          if (err) reject(err);
          else if (data.length === 0) resolve(null);
          else if (data.length === 1) resolve(data[0]);
          else resolve(data);
        });
      }
    });
  },
  update(vals, id) {
    return new Promise((resolve, reject) => {
      db.query('UPDATE `handles` SET ? WHERE ?', [vals, {id}], (err, result) => {
        resolve({err: err, result: result});
      });
    });
  },
  getVal(key, id) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM `handles` WHERE ?', {id}, (err, data) => {
        if (err) reject(err);
        else if (data.length === 0) resolve(null);
        else resolve(data[0][key]);
      });
    });
  },
  getTemplate(handle) {
    return new Promise((resolve, reject) => {
      this.getCond({handle}).then(handle => {
        if (handle === null) return resolve({});
        fs.readFile(`./templates/${handle.id}`, 'utf8', (err, template) => {
          resolve({template});
        });
      });
    });
  }
};
