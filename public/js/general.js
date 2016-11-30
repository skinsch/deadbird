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
    $.ui.autocomplete.prototype._renderItem = function (ul, item) {
      if (item.label === `Add "${$('#deadbirdSearch').val()}" to database`) {
        item.label = `<strong>${item.label}</strong>`;
        item.value = $('#deadbirdSearch').val()
      }

      return $("<li></li>")
        .data("item.autocomplete", item)
        .append(`<div id="ui-id-2" tabindex="-1" class="ui-menu-item-wrapper">${item.label}</div>`)
        .appendTo(ul);
    };

    $( "#deadbirdSearch" ).autocomplete({
      source: function(request, response) {
        let users;
        if ($('#deadbirdSearch').val().length <= 15 && autocompleteUsers.indexOf($('#deadbirdSearch').val()) === -1) {
          users = autocompleteUsers.concat(`Add "${$('#deadbirdSearch').val()}" to database`);
        } else {
          users = autocompleteUsers;
        }
        response($.map(users, el => {
          if (el.match(request.term)) return el;
        }));
      },
      select: () => {
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
    let info = `Created: ${moment(new Date($(date).data('time') * 1000)).fromNow()} | Deleted: ~${moment(new Date($($(date).parent().parent().parent().parent().parent().parent()).data('deletetime'))).fromNow()}`;
    $(date).html(info);
    $(date).parent().attr('title', `Created: ${moment($(date).data('time') * 1000).format()}\n\nDeleted: ~${moment($($(date).parent().parent().parent().parent().parent().parent()).data('deletetime')).format()}`);
  });
};
