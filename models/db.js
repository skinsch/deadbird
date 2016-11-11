const mysql    = require('mysql');
const settings = require('../utils').settings;

let db = settings.db.prod;
let initDone = false;

var pool = mysql.createPool({
  connectionLimit: 10,
  host:       db.host,
  socketPath: db.socketPath,
  database:   db.database,
  user:       db.username,
  password:   db.password,
  charset:    "UTF8_UNICODE_CI"
});

module.exports.init = function(cb) {

  pool.on('connection', connection => {
    if (!initDone) {
      initDone = true;
      cb();
    }
  });

  pool.getConnection((err, connection) => {
    connection.query('SELECT 1', [], () => {
      connection.release();
    });
  });

  // Keep connection alive
  setInterval(() => {
    pool.getConnection((err, connection) => {
      connection.query('SELECT 1', [], () => {
        connection.release();
      });
    });
  }, db.keepAliveInterval);
};

module.exports.connection = {
  query: function () {
    let queryArgs = Array.prototype.slice.call(arguments),
      events = [],
      eventNameIndex = {};

    pool.getConnection((err, conn) => {
      if (err) {
        if (eventNameIndex.error) {
          eventNameIndex.error();
        }
      }
      if (conn) {
        let q = conn.query.apply(conn, queryArgs);
        q.on('end', () => {
          conn.release();
        });

        events.forEach(args => {
          q.on.apply(q, args);
        });
      }
    });

    return {
      on: function (eventName, callback) {
        events.push(Array.prototype.slice.call(arguments));
        eventNameIndex[eventName] = callback;
        return this;
      }
    };
  },
  escape: val => pool.escape(val)
};
