$(() => {
  let autocompleteUsers = JSON.parse(($('autocomplete').html() || "[]"));
  let port = $('socket').html();
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

    $("#deadbirdSearch").autocomplete({
      delay: 0,
      source: autocompleteUsers,
      select: (event, ui) => {
        $("#deadbirdSearch").val(ui.item.label);
        submitSearch();
      }
    });
  }

  $("#deadbirdSearch").on('keyup', function (e) {
    if (e.keyCode == 13) {
      submitSearch();
    }
  });

  let text = $('message').html() || "";
  let type;

  if (text !== "" && text.substr(8, 9) !== "socket.io") {
    if (text.slice(0, 4) === 'info') {
      type = 'success';
      text = text.slice(5);
    } else {
      type = 'error';
      text = text.slice(8);
    }
    noty({
      text,
      layout: 'top',
      type,
      theme: 'relax',
      timeout: 2500,
      closeWith: ['click'],
      animation: {
        open: 'animated flipInX',
        close: 'animated flipOutX'
      }
    });
  }

  function submitSearch() {
    if (window.location.pathname.slice(0, 6) === '/stats') {
      window.location.href = `${base}stats/${$('#deadbirdSearch').val()}`;
    } else {
      window.location.href = `${base}${$('#deadbirdSearch').val()}`;
    }
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
    if ($($(date).closest('li')).data('deletetime') !== undefined) {
      let info = `Created:&nbsp;${moment(new Date($(date).data('time') * 1000)).fromNow()}&nbsp;|&nbsp;Deleted:&nbsp;~${moment(new Date($($(date).closest('li')).data('deletetime'))).fromNow()}`;
      $(date).html(info);
      $(date).parent().attr('title', `Created: ${moment($(date).data('time') * 1000).format()}\n\nDeleted: ~${moment(new Date($($(date).closest('li')).data('deletetime'))).format()}`);
    }
  });
};
