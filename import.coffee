#!./node_modules/coffee-script/bin/coffee

Promise = require 'promise'
fs = require 'fs'
pathlib = require 'path'
request = require 'request'
walk = require 'walk'
lineReader = require 'line-reader'

require './localenv'

BASEDIR = pathlib.join(__dirname, 'static/data')

post = (body, cb) ->
  console.log 'Executing:', body
  request {
    url: "#{ process.env.SOLR_URL }/update"
    method: 'POST'
    body: body
    headers: { 'Content-type': 'text/xml; charset=utf-8' }
  }, cb

clear = ->
  return Promise.denodeify(post)('<delete><query>*:*</query></delete>')

commit = ->
  return Promise.denodeify(post)('<commit/>')

upload = (path, title, filetype, cb) ->
  relpath = pathlib.relative BASEDIR, path
  options =
    url: "#{ process.env.SOLR_URL }/update/extract"
    method: 'POST'
    qs:
      'literal.id': relpath
      'literal.url': relpath
      'literal.title': title
      'literal.filetype': filetype
      commit: true
  req = request options, (err, res, body) ->
    return cb err if err
    console.log "Uploaded #{ relpath } - \"#{ title }\""
    cb()
  form = req.form()
  form.append 'myfile', fs.createReadStream path

addDocuments = ->
  return new Promise((fulfill, reject) ->

    promises = []
    walker = walk.walk BASEDIR, followLinks: true

    walker.on 'file', (root, stats, next) ->
      {name} = stats
      path = pathlib.join root, name
      relpath = pathlib.relative BASEDIR, path

      # Ignore dotfiles.
      return next() if /^\./.test name

      # Old-school text files where the top line is like:
      # @@Addison, Home Front, p. 200
      if match = name.match /.txt$/i
        promises.push Promise.denodeify(upload)(path, relpath, 'text/plain')
        next()

      else
        console.log 'UNKNOWN FILE:', path
        next()

    walker.on 'end', ->
      fulfill Promise.all(promises)
  )

clear().then(commit)
  .then(addDocuments)
  .then ->
    console.log "Done."
  .catch (err) ->
    console.error "ERROR: #{ err }"
