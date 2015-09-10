var parseEventString = function(data) {
  console.log(data.toString('utf8'));
}

process.stdin.resume();

process.stdin.on('data', function (data) {
  parseEventString(data);
  process.exit(0)
});
