#!/bin/bash

# Usage
# -r <remote> remote host passed to ssh and rsync

deploy () {
  remote="$1"
  thisdir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"

  # copy systemd unit files
  # copy configuration
  # scp $thisdir/bashrc $remote:~/.bashrc
  # scp $thisdir/vimrc $remote:~/.vimrc
  # scp $thisdir/gitconfig $remote:~/.gitconfig

  # build frontend
  (cd "$thisdir/../web" && yarn build)

  # rsync frontend build
  rsync -avz --delete "$thisdir/../web/build/" "$remote:~/parity-server/web/build/"

  # ssh run script example
  # setup fzf
  # ssh $remote "mkdir -p ~/.fzf/shell;"
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
