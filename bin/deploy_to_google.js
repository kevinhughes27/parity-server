var fs = require('fs');
var readline = require('readline');
var request = require('request');
var _ = require('underscore');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var fileId = '1IcYrOWSUW8pYM0cRLx_ZAkHnWw9rzXqcPyOkgMGoLrmlDVfjcsCfSUF4';

var SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.scripts'];
var TOKEN_DIR = './.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'credentials.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the Drive API.
  authorize(JSON.parse(content), deploy);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function deploy(auth) {
  var service = google.drive('v2');

  // pull down the current file (contains multiple scripts)
  request.get({
    url: 'https://script.google.com/feeds/download/export?format=json&id=' + fileId,
    qs :{ 'access_token' : auth.credentials.access_token }
  }, function(err, res, body) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return
    }

    var project = JSON.parse(body);

    if (!project.files) {
      console.log('No files in the Project');
      return;
    }

    // find the parse file
    parserFileIdx = _.findIndex(project.files, function(file){ return file.name == 'Parser' });

    // overwrite the parser in the project
    project.files[parserFileIdx].source = fs.readFileSync('app/parser.js').toString();

    // save the file
    service.files.update({
      auth: auth,
      fileId: '1IcYrOWSUW8pYM0cRLx_ZAkHnWw9rzXqcPyOkgMGoLrmlDVfjcsCfSUF4',
      newRevision: true,
      media: {
        mimeType: 'application/vnd.google-apps.script+json',
        body: JSON.stringify({ files: project.files })
      }
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      console.log(response)
    });
  });
}
