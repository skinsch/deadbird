$(() => {
  $('#leaderboard').DataTable( {
    "order": [[ 1, "desc" ]]
  });
  $('#leaderboard').show();
});
