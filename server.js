import 'babel-polyfill';
import express from 'express';
import configure from './config/config';
import add_routes from './config/routes';

// Init express
const app = express();

// Configure
configure(app);
add_routes(app);

// Start the server
let server = app.listen(process.env.PORT, function() {
  let port = server.address().port;
  console.log('Express server listening on port ' + port);
});

// Export for testing
exports.listen = function() {
  server.listen.apply(server, arguments);
};

exports.close = function(callback) {
  server.close(callback);
};
