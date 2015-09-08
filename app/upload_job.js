process.stdin.resume();

process.stdin.on('data', function (data) {
  console.log('Received data: ' + data);
  process.exit(0)
});
