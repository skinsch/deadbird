var spawn     = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var fs        = require('fs');

module.exports = function(io, data) {
  io.on('connection', function (socket) {
    socket.on('hello', function (input) {
      socket.emit('hi', data);
    });
  });
};
