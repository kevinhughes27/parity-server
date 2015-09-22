var fileId = '1IcYrOWSUW8pYM0cRLx_ZAkHnWw9rzXqcPyOkgMGoLrmlDVfjcsCfSUF4';
var remoteFileName = 'Parser'
var localFilePath = 'app/parser.js'

var _ = require('underscore'),
    fs = require('fs'),
    request = require('sync-request'),
    PersitedGoogleAuth = require('./utils/persisted_google_auth');

PersitedGoogleAuth.authenticate(
  ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.scripts'],
  deploy
);

function deploy(auth) {
  project = fetchProject(auth);

  var service = google.drive('v2');


  // find the parser file
  parserFileIdx = _.findIndex(project.files, function(file){ return file.name == remoteFileName });

  // overwrite the file source
  project.files[parserFileIdx].source = fs.readFileSync(localFilePath).toString();

  // save the file
  var options = {
    auth: auth,
    fileId: '1IcYrOWSUW8pYM0cRLx_ZAkHnWw9rzXqcPyOkgMGoLrmlDVfjcsCfSUF4',
    newRevision: true,
    media: {
      mimeType: 'application/vnd.google-apps.script+json',
      body: JSON.stringify({ files: project.files })
    }
  };

  service.files.update(options, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    } else {
      console.log('Deploy successful.');
      return;
    }
  });
}

/**
 * Fetch the project from Google Drive and parse the response
 */
function fetchProject(auth) {
  console.log('Fetching the project ...');

  var response = request('GET',
    'https://script.google.com/feeds/download/export?format=json&id=' + fileId,
    {
      qs :{ 'access_token' : auth.credentials.access_token }
    }
  )

  var project = JSON.parse(response.body);

  if (!project.files) {
    console.log('No files in the Project');
    return;
  }

  return project
}
