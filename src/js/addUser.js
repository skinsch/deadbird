var typingTimer = void 0;
var search = $('#newUser-search-');

$(function () {
  search.keyup(function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(submitQuery, 250);
  });

  search.keydown(function () {
    clearTimeout(typingTimer);
  });

  //$('#found').css('visibility', 'visible');

  function submitQuery() {
    console.log('here');
    //search.val()
    //$.post('user', {}).then(console.log);
  }
});