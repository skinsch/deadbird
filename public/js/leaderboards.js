$(() => {
  $('#leaderboard').DataTable( {
    "order": [[ 1, "desc" ]],
    "lengthMenu": [ [10, 25, 50, 100, -1], [10, 25, 50, 100, "All"] ]
  });
  $('#leaderboard').show();
});
