import glob from 'glob';
import child_process from 'child_process';
let exec = child_process.exec;

glob("test/files/*.json", (err, files) => {
  files.forEach((file) => {
    console.log(`seeding with: ${file}`);
    let cmd = `curl -X POST\
           --data @${file}\
           -H "Content-Type: application/json"\
           http://localhost:3000/upload`;
    exec(cmd);
  });
});
