fs = require 'fs'
pathlib = require 'path'
request = require 'request'

BOX_VIEW_BASEURL = process.env.BOX_VIEW_BASEURL or 'https://upload.view-api.box.com/1/documents'
BOX_VIEW_API_KEY = process.env.BOX_VIEW_API_KEY or
  throw new Error('BOX_VIEW_API_KEY must be present in environment')

{getMeta, setMeta} = require './meta'

exports.boxViewUpload = (basedir, relpath, cb) ->
  fullpath = pathlib.join(basedir, relpath)

  meta = getMeta(fullpath) or {}
  if meta.boxview?
    return cb "#{ relpath } - already uploaded"

  options =
    url: BOX_VIEW_BASEURL
    method: 'POST'
    headers: { Authorization: "Token #{ BOX_VIEW_API_KEY }" }

  req = request options, (err, res, body) ->
    return cb err if err
    body = JSON.parse body
    return cb relpath + ' - ' + body.message if body?.type is 'error'

    meta.boxview = body
    setMeta fullpath, meta
    cb()

  form = req.form()
  form.append 'name', relpath
  form.append 'file', fs.createReadStream fullpath
