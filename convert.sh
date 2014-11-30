#!/usr/bin/env bash

set -e

for src in "$@" ; do
  dest="${src%%.*}.txt"
  if [ -e "$dest" ]; then
    echo "Already exists: $dest"
  elif [ -f "$src" ]; then
    echo -n "Creating $dest..."
    tika -t "$src" | par > "$dest"
    echo "OK"
  else
    echo "Not a file: $src"
  fi
done
