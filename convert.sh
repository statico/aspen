#!/usr/bin/env bash
#
# Usage: ./convert.sh static/data/SomeDir/*.rtf
#
# Requires Apache Tika, unrtf and par. (Tika sucks at RTF->text.)
# On Mac OS X, `brew install tika unrtf par`

set -e
shopt -s nocasematch

tempfile=`mktemp -t convert`
trap "rm -f $tempfile" EXIT

for src in "$@" ; do
  dest="${src%%.*}.txt"
  if [ -e "$dest" ]; then
    echo "Already exists: $dest"
  elif [ -f "$src" ]; then
    echo -n "Creating $dest..."
    if [ "${src##*.}" == "rtf" ]; then
      unrtf --text "$src" | iconv -t utf-8 -c | par > "$dest"
      echo "OK"
    else
      (
        echo '---'
        tika -m "$src"
        echo '---'
        echo
        tika -t "$src" | par
      ) >"$tempfile"
      ./node_modules/coffee-script/bin/coffee fixup.coffee "$tempfile" >"$dest"
      echo "OK"
      echo -e "\t$( cat "$dest" | grep -Ei '^dc:title' | cut -d\  -f2- )"
    fi
  else
    echo "Not a file: $src"
  fi
done
