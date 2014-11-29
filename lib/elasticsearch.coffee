fs = require 'fs'
pathlib = require 'path'
request = require 'request'

ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL or 'http://localhost:9200'

# Syntactic sugar for below.
_doRequest = (cb, options) ->
  request options, (err, res, body) ->
    return cb err if err
    if 200 <= res.statusCode < 300
      cb err, res, body
    else
      cb "Error #{ res.statusCode }: #{ JSON.stringify body }"

esReset = exports.esReset = (cb) ->
  request {
    url: "#{ ELASTICSEARCH_URL }/aspen"
    method: 'delete'
    json: true
  }, (err, res, body) ->
    console.log 'Results from DELETE:', body
    _doRequest cb,
      url: "#{ ELASTICSEARCH_URL }/aspen"
      method: 'put'
      json: true
      body:
        mappings:
          title:
            type: 'string'
          path:
            type: 'string'
          text:
            type: 'string'
            analyzer: 'english'
            term_vector: 'with_positions_offsets'
            #store: true # ???

esUpload = exports.esUpload = (basedir, fullpath, title, cb) ->
  relpath = pathlib.relative basedir, fullpath
  _doRequest cb,
    url: "#{ ELASTICSEARCH_URL }/aspen/file"
    method: 'post'
    json: true
    body:
      path: relpath
      title: title
      text: fs.readFileSync fullpath, 'utf8'

esQuery = exports.esQuery = (query, cb) ->
  _doRequest cb,
    url: "#{ ELASTICSEARCH_URL }/aspen/file/_search"
    method: 'post'
    json: true
    body: query

