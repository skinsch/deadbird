$(() => {
  let autocompleteUsers = JSON.parse(($('autocomplete').html() || "[]"));
  let base = $('base').attr('href');
  updateDates();
  setInterval(updateDates, 1000);

  if (window.location.href.indexOf('/status/') === -1) {
    $('.tweet').click(function (event) {

      let id, user;

      // Retweet is a different url
      if ($(this).data('retweet-id') !== undefined) {
        id   = $(this).data('retweet-id');
        user = $(this).data('retweeter');
      } else {
        id   = $(this).data('tweet-id');
        user = $(this).data('screen-name');
      }
      window.location.href = `${base}${user}/status/${id}`;
    });
  }

  $('.PermalinkOverlay').click(() => {
    let base = $('base').attr('href');
    let baseless = window.location.href.slice(base.length);
    window.location.href = `${base}${baseless.slice(0, baseless.indexOf('/'))}`;
  });

  $('.js-adaptive-photo img').on('click', function(e) {
    window.location.href = `${base}${$(this).attr('src')}`;
    return false;
  });

  if (autocompleteUsers.length > 0) {
    $( "#deadbirdSearch" ).autocomplete({
      source: autocompleteUsers,
      select: () => {
        console.log(`${base}${$('#deadbirdSearch').val()}`);
        submitSearch();
      }
    });
  }

  $("#deadbirdSearch").on('keyup', function (e) {
    if (e.keyCode == 13) {
      submitSearch();
    }
  });

  function submitSearch() {
    window.location.href = `${base}${$('#deadbirdSearch').val()}`;
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
