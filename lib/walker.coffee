walklib = require 'walk'
pathlib = require 'path'

# Pass basedir and optional subdir.
# Callback args are: relpath, fullpath, richtext
exports.walk = (basedir, subdir, cb) ->
  if not cb?
    cb = subdir
    subdir = null
  if not subdir
    subdir = '.'

  walker = walklib.walk pathlib.join(basedir, subdir), followLinks: true

  walker.on 'file', (root, stats, next) ->
    {name} = stats
    fullpath = pathlib.join root, name
    relpath = pathlib.relative basedir, fullpath

    if /^\./.test name
      # Ignore dotfiles.

    else if (/\.txt$/i).test name
      cb relpath, fullpath, false

    else if (/\.(pdf|rtf|docx?)$/i).test name
      cb relpath, fullpath, true

    else
      # Ignore.

    next()
