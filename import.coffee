#!./node_modules/coffee-script/bin/coffee

Promise = require 'promise'
fs = require 'fs'
pathlib = require 'path'
request = require 'request'
walk = require 'walk'
lineReader = require 'line-reader'

require './localenv'

BASEDIR = pathlib.join(__dirname, 'static/data')

subdir = process.argv[2] ? '.'

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

upload = (path, title) ->
  return new Promise((fulfill, reject) ->
    relpath = pathlib.relative BASEDIR, path
    options =
      url: "#{ process.env.SOLR_URL }/update/extract"
      method: 'POST'
      qs:
        'literal.id': relpath
        'literal.url': relpath
        commit: true
    if title
      options.qs['literal.title'] = title
    req = request options, (err, res, body) ->
      return reject err if err
      console.log "Uploaded #{ relpath } - \"#{ title }\""
      fulfill()
    form = req.form()
    form.append 'myfile', fs.createReadStream path
  )

extractTitle = (path) ->
  return new Promise((fulfill, reject) ->

    # A145Speeches/1922-1928_4100-4199.txt
    if match = path.match /Speeches\/(\d{4}.*?)\.\w+$/
      title = "A145 Speeches " + match[1].replace(/_/g, ' ')
      contents = fs.readFileSync path, 'utf8'
      match = contents.match /^(\d+)/
      if match
        title += " p. #{ match[1] }"
      else
        title += " p. 1"
      return fulfill title

    # Finest Hour
    if match = path.match /FinestHour\/No\.(\d+)\.txt$/
      return fulfill "Finest Hour No. #{ Number match[1] } (plaintext)"

    # Old-school text files where the top line is like:
    # @@Addison, Home Front, p. 200
    first = null
    match = /^(.*(@@|TITLE:)|JOURNAL OF THE CHURCHILL CENTRE|FINEST HOUR)/
    strip = /^.*(@@|TITLE:\s+)/

    lineReader.eachLine path, (line, last) ->
      first ?= line

      if match.test line
        fulfill line.replace(strip, '')
        return false

      if last
        fulfill first
        return false

      return true
  )

addDocuments = ->
  return new Promise((fulfill, reject) ->

    promises = []
    walker = walk.walk pathlib.join(BASEDIR, subdir), followLinks: true

    walker.on 'file', (root, stats, next) ->
      {name} = stats
      path = pathlib.join root, name
      relpath = pathlib.relative BASEDIR, path

      if /^\./.test name
        # Ignore dotfiles.

      else if match = name.match /\.txt$/i
        promises.push extractTitle(path).then((title) -> upload(path, title))

      else if name.match = /\.(pdf|rtf)$/i
        # Title and filetype should get extracted automatically.
        promises.push upload(path, null)

      else
        console.error "Skipping unknown file extension: #{ relpath }"

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
