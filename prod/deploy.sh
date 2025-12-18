#!/bin/bash
set -euo pipefail

# Usage
# -r <remote> remote host passed to ssh and rsync

srsync() {
  rsync --rsync-path="sudo rsync" "$@"
}

deploy () {
  remote="$1"
  thisdir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"

  # build frontend
  (cd $thisdir/../web && yarn build)

  # copy caddyfile
  # caddy will reload on changes
  srsync $thisdir/files/Caddyfile $remote:/etc/caddy/Caddyfile

  # copy systemd files
  srsync $thisdir/files/*.service $remote:/lib/systemd/system/
  srsync $thisdir/files/*.timer $remote:/lib/systemd/system/

  # rsync backend
  scp $thisdir/../pyproject.toml $remote:~/parity-server/pyproject.toml
  scp $thisdir/../uv.lock $remote:~/parity-server/uv.lock
  rsync -avz \
    --delete \
    --exclude "tests" \
    --exclude "__pycache__" \
    --exclude "*.sqlite" \
    $thisdir/../server/ $remote:~/parity-server/server

  # rsync frontend build
  rsync -avz --delete $thisdir/../web/build/ $remote:~/parity-server/web/build/
  # todo - sync the service worker dist?

  # enable timers
  ssh "$remote" << EOF
  sudo systemctl enable parity-backup.timer;
  sudo systemctl start parity-backup.timer;

  sudo systemctl enable zuluru-sync.timer;
  sudo systemctl start zuluru-sync.timer;

  # list timers
  systemctl list-timers;
EOF

  # reload and restart
  ssh "$remote" << EOF
  sudo systemctl daemon-reload;
  sudo systemctl restart parity-server;

  # tails 20 lines then follow for 5 seconds
  timeout 5s journalctl -u parity-server -n 20 -f;
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
