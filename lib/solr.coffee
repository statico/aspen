fs = require 'fs'
pathlib = require 'path'
request = require 'request'

SOLR_URL = process.env.SOLR_URL or 'http://localhost:8983/solr'

solrPost = exports.solrPost = (body, cb) ->
  console.log 'Solr Query:', body
  request {
    url: "#{ SOLR_URL }/update"
    method: 'POST'
    body: body
    headers: { 'Content-type': 'text/xml; charset=utf-8' }
  }, cb

solrCommit = exports.solrCommit = (cb) ->
  solrPost '<commit/>', cb

solrClearQuery = exports.solrClearQuery = (query, cb) ->
  solrPost "<delete><query>id:#{ query }</query></delete>", (err, res, body) ->
    return cb err if err
    solrCommit cb

solrClearAll = exports.solrClearAll = (cb) ->
  solrPost '<delete><query>*:*</query></delete>', (err, res, body) ->
    return cb err if err
    solrCommit cb

solrUpload = exports.solrUpload = (basedir, fullpath, title, cb) ->
  relpath = pathlib.relative basedir, fullpath
  options =
    url: "#{ SOLR_URL }/update/extract"
    method: 'POST'
    qs:
      'literal.id': relpath
      'literal.url': relpath
      commit: true
  if title
    options.qs['literal.title'] = title
  req = request options, cb
  form = req.form()
  form.append 'myfile', fs.createReadStream fullpath
