const spawn     = require('child_process').spawn;
const spawnSync = require('child_process').spawnSync;
const fs        = require('fs');
const utils     = require('./utils')

module.exports = function(io) {
  io.on('connection', function (socket) {
    socket.on('getStatus', function (input) {
      socket.emit('status', JSON.stringify(utils.get('data'), null, 2));
    });
  });
};
