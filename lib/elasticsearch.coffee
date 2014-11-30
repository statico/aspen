fs = require 'fs'
pathlib = require 'path'
request = require 'request'
crypto = require 'crypto'

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
      method: 'post'
      json: true
      body:
        mappings:
          file:
            properties:
              title:
                type: 'string'
              path:
                type: 'string'
              text:
                type: 'string'
                term_vector: 'with_positions_offsets_payloads'
                fields:
                  english:
                    type: 'string'
                    analyzer: 'english_nostop'
                    term_vector: 'with_positions_offsets_payloads'
                    store: true
        settings:
          analysis:
            filter:
              english_stemmer:
                type: 'stemmer'
                language: 'english'
              english_possessive_stemmer:
                type: 'stemmer'
                language: 'possessive_english'
            analyzer:
              english_nostop:
                tokenizer: 'standard'
                filter: ['english_possessive_stemmer', 'lowercase',  'english_stemmer']

esUpload = exports.esUpload = (basedir, fullpath, title, cb) ->
  relpath = pathlib.relative basedir, fullpath
  id = crypto.createHash('md5').update(relpath).digest('hex')
  _doRequest cb,
    url: "#{ ELASTICSEARCH_URL }/aspen/file/#{ id }"
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

