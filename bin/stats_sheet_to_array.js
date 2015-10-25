var fs = require('fs');

input = process.argv[2];
output = process.argv[3];

var array = [];

fs.readFileSync(input).toString().split("\n").forEach( function(line) {
  array.push(line);
});

fs.writeFile(output, JSON.stringify(array, null, 2), function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log("JSON saved to " + output);
  }
});
