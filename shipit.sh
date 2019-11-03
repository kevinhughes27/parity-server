sudo docker-compose up -d

pgloader pgloader.command

sudo docker exec parity-server_db_1 pg_dump -Fc --no-acl --no-owner -U postgres postgres > parity_db_pgdump

# uploaded to google cloud

heroku pg:backups:restore 'https://storage.googleapis.com/parity/parity_db_pgdump' DATABASE_URL --app parity-server --confirm=parity-server
