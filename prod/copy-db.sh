#!/bin/bash
set -euo pipefail

# Usage
# -r <remote> remote host passed to scp
#
# This script copies the production database to a local file
# Then it can be copied over db.sqlite and committed

copy-db() {
  remote="$1"
  thisdir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"
  scp $remote:~/parity-server/server/db.sqlite $thisdir/../server/prod.sqlite
}

if [[ $# -eq 0 ]] ; then
  echo "-r <remote> argument required"
else
  while getopts 'r:' OPTION; do
    case "$OPTION" in
      r)
        copy-db "$OPTARG"
        ;;
    esac
  done
fi
