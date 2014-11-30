#!/usr/bin/env bash

set -e

for src in "$@" ; do
  dest="${src%%.*}.txt"
  if [ -e "$dest" ]; then
    echo "Already exists: $dest"
  else
    echo -n "Creating $dest..."
    tika -t "$src" | par > "$dest"
    echo "OK"
  fi
done
