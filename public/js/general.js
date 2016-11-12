$(() => {
  let base = $('base').attr('href');
  updateDates();
  setInterval(updateDates, 1000);

  if (window.location.href.indexOf('/status/') === -1) {
    $('.tweet').click(function (event) {
      let id   = $(this).data('tweet-id');
      let user = $(this).data('screen-name');
      window.location.href = `${base}${user}/status/${id}`;
    });
  }
});

function updateDates() {
  moment.locale('en', {
    relativeTime: {
      future: 'in %s',
      past: '%s',
      s:  '%ds',
      ss: '%ds',
      m:  '%dm',
      mm: '%dm',
      h:  '%dh',
      hh: '%dh',
      d:  '%dd',
      dd: '%dd',
      M:  '%dM',
      MM: '%dM',
      y:  '%dY',
      yy: '%dY'
    }
  });

  $('.js-short-timestamp').each((index, date) => {
    $(date).html(moment(new Date($(date).data('time') * 1000)).fromNow());
  });
};
