Process for copying a local sqlite db to production:

1. spin up a local postgres `sudo docker-compose up -d`

2. copy sqlite into postgres: `pgloader pgloader.command`

3. dump a postgres backup that is heroku compatibile

  `sudo docker exec parity-server_db_1 pg_dump -Fc --no-acl --no-owner -U postgres postgres > parity_db_pgdump`

4. uploaded the pg backup to google cloud in a public bucket

  allUsers
  Storage Object Viewer

5. restore to heroku

  `heroku pg:backups:restore 'https://storage.googleapis.com/parity/parity_db_pgdump' DATABASE_URL --app parity-server --confirm=parity-server`
