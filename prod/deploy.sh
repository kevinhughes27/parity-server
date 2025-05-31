#!/bin/bash

# Usage
# -r <remote> remote host passed to ssh and rsync

srsync() {
  rsync --rsync-path="sudo rsync" "$@"
}

deploy () {
  remote="$1"
  thisdir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"

  # copy caddyfile
  srsync $thisdir/files/Caddyfile $remote:/etc/caddy/Caddyfile

  # copy systemd files
  srsync $thisdir/files/*.service $remote:/lib/systemd/system/
  srsync $thisdir/files/*.timer $remote:/lib/systemd/system/

  # TODO rsync the python files etc

  # build frontend
  # (cd "$thisdir/../web" && yarn build)

  # rsync frontend build
  # rsync -avz --delete "$thisdir/../web/build/" "$remote:~/parity-server/web/build/"

  # reload and restart
  # or set the ssh motd to be nothing
  ssh "$remote" << EOF
  export TERM=xterm;
  clear;
  echo "Deploying ..."
  set -x;

  sudo systemctl daemon-reload;

  # caddy should reload
  # also todo uninstall nginx
  # sudo systemctl restart caddy;

  sudo systemctl restart parity-server;

  # sudo systemctl enable parity-backup.timer;
  # sudo systemctl start parity-backup.timer;

  # sudo systemctl enable zuluru-sync.timer;
  # sudo systemctl start zuluru-sync.timer;
  #
  # systemctl list-timers ?
  # journalctl ?
EOF
}

if [[ $# -eq 0 ]] ; then
  echo "-r <remote> argument required"
else
  while getopts 'r:' OPTION; do
    case "$OPTION" in
      r)
        deploy "$OPTARG"
        ;;
    esac
  done
fi
