#!/usr/bin/env bash
#
# Usage: ./convert.sh static/data/SomeDir/*.rtf
#
# Requires Apache Tika, unrtf and par. (Tika sucks at RTF->text.)
# On Mac OS X, `brew install tika unrtf par`

set -ex
shopt -s nocasematch

for src in "$@" ; do
  dest="${src%%.*}.txt"
  if [ -e "$dest" ]; then
    echo "Already exists: $dest"
  elif [ -f "$src" ]; then
    echo -n "Creating $dest..."
    if [ "${src##*.}" == "rtf" ]; then
      unrtf --text "$src" | iconv -t utf-8 -c | par > "$dest"
    else
      tika -t "$src" | par > "$dest"
    fi
    echo "OK"
  else
    echo "Not a file: $src"
  fi
done
