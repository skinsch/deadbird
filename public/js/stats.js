$(() => {
  window.socket = io.connect(":" + $('socket').html());
  socket.on('status', data => {
    data = JSON.parse(data);
    if (data.fetcher.nextCheck) {
      data.fetcher.nextCheck = `${Math.floor((data.fetcher.nextCheck - new Date().getTime())/1000)} seconds`;
    }
    if (data.checker.nextCheck) {
      data.checker.nextCheck = `${Math.floor((data.checker.nextCheck - new Date().getTime())/1000)} seconds`;
    }
    if (data.template.nextCheck) {
      data.template.nextCheck = `${Math.floor((data.template.nextCheck - new Date().getTime())/1000)} seconds`;
    }
    $('#fetcherLog').val(JSON.stringify(data.fetcher, null, 1));
    $('#checkerLog').val(JSON.stringify(data.checker, null, 1));
    $('#templateLog').val(JSON.stringify(data.template, null, 1));
  });
  setInterval(() => socket.emit('getStatus'), 1000);
});
