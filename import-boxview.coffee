#!./node_modules/coffee-script/bin/coffee

Promise = require 'promise'
fs = require 'fs'
pathlib = require 'path'
request = require 'request'
walk = require 'walk'

require './localenv'

BASEDIR = pathlib.join(__dirname, 'static/data')

BOX_VIEW_BASEURL = 'https://upload.view-api.box.com/1/documents'
META_SUFFIX = '-META.json'

subdir = process.argv[2] ? '.'

upload = (path) ->
  return new Promise((fulfill, reject) ->
    metapath = path + META_SUFFIX
    relpath = pathlib.relative BASEDIR, path
    if fs.existsSync metapath
      console.log "#{ relpath } already uploaded"
      return fulfill()

    options =
      url: BOX_VIEW_BASEURL
      method: 'POST'
      headers: { Authorization: "Token #{ process.env.BOX_VIEW_API_KEY }" }
    req = request options, (err, res, body) ->
      return reject err if err
      body = JSON.parse body
      return reject body.message if body?.type is 'error'

      console.log "Uploaded #{ relpath }"
      metadata = { boxview: body }
      fs.writeFileSync metapath, JSON.stringify(metadata, '  ', null)

      fulfill()
    form = req.form()
    form.append 'name', relpath
    form.append 'file', fs.createReadStream path
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
        return next()

      if match = name.match /\.(pdf|docx?)$/i
        promises.push upload(path)

      next()

    walker.on 'end', ->
      fulfill Promise.all(promises)
  )

addDocuments()
  .then ->
    console.log "Done."
  .catch (err) ->
    console.error "ERROR: #{ err }"
