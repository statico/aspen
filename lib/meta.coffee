crypto = require 'crypto'
fs = require 'fs'
pathlib = require 'path'

# Since the files in static/data/ come from lots of different sources and it's
# often rsync'ed around, it's best to store state about these files in
# a separate metafile. Make sure the metafile checksums the file's contents so
# that we don't have stale metadata.

_md5 = (data) ->
  return crypto.createHash('md5').update(data).digest('hex')

metaPathTo = exports.metaPathTo = (path) ->
  return path + '-META.json'

metaExists = exports.metaExists = (path) ->
  return fs.existsSync metaPathTo(path)

getMeta = exports.getMeta = (path) ->
  try
    content = fs.readFileSync(metaPathTo(path))
    obj = JSON.parse content
  catch e
    return null

  hash = _md5 fs.readFileSync(path)
  return null if hash != obj.hash
  return obj

setMeta = exports.setMeta = (path, obj={}) ->
  obj.hash = _md5 fs.readFileSync(path)
  fs.writeFileSync metaPathTo(path), JSON.stringify(obj, null, '  ')
  return
