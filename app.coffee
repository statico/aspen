#!./node_modules/.bin/coffee
#
# Aspen frontend web server. License: MIT

bodyParser = require 'body-parser'
coffeeMiddleware = require 'coffee-middleware'
express = require 'express'
fs = require 'fs'
less = require 'less-middleware'
logger = require 'morgan'
request = require 'request'
pathlib = require 'path'
serveIndex = require 'serve-index'

require('./lib/localenv').init __dirname

{getMeta} = require './lib/meta'
{esQuery} =  require './lib/elasticsearch'

MAX_DOCUMENT_CHARACTERS = 4e8
ITEMS_PER_PAGE = 10
STATIC_BASEDIR = pathlib.join(__dirname, 'static')
META_SUFFIX = '-META.json'
BOX_VIEW_BASEURL = 'https://view-api.box.com/1'

app = express()
app.set 'views', pathlib.join(__dirname, 'views')
app.set 'view engine', 'jade'
app.use bodyParser.json()
app.use bodyParser.urlencoded(extended: true)
app.use less(STATIC_BASEDIR)
app.use coffeeMiddleware(src: STATIC_BASEDIR)
app.locals.pretty = true

# MAIN VIEWS ----------------------------------------------------------------

app.get '/', (req, res) ->
  if req.query.q
    # Legacy redirect from Aspen 1.0.
    res.redirect "/#/search/#{ encodeURIComponent req.query.q }"
  else
    res.render 'index'

# RPCs ----------------------------------------------------------------------

app.get '/query', (req, res) ->
  # Chrome+Angular caches this.
  res.header 'Cache-Control', 'no-cache'

  # Stupify smart quotes which sometimes get pasted in.
  query = req.query.q
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")

  obj =
    query:
      query_string:
        query: query
        default_operator: 'and'
        fields: ['text.english']
        analyzer: 'english_nostop'
    highlight:
      order: 'score'
      fields:
        'text.english':
          fragment_size: 400
          number_of_fragments: 3
        text:
          fragment_size: 400
          number_of_fragments: 3
    _source: ['title', 'path']
    size: ITEMS_PER_PAGE
    from: Math.max(ITEMS_PER_PAGE * (Number(req.query.page) or 0), 0)

  respond = (code, content) -> res.status(code).json content
  if req.query.d
    obj.explain = true
    respond = (code, content) ->
      res.header 'Content-type', 'text/plain'
      res.status(code).send JSON.stringify(content, null, '  ')

  esQuery obj, (err, _, body) ->
    if err
      respond 500, { error: err }
    else
      respond 200, body

app.get '/metadata', (req, res) ->
  return res.send(400) if /\.\.|\0/.test req.query.path

  metadata = getMeta pathlib.join(STATIC_BASEDIR, req.query.path)

  if metadata?.boxview
    options =
      method: 'POST'
      url: BOX_VIEW_BASEURL + '/sessions'
      headers:
        'Authorization': "Token #{ process.env.BOX_VIEW_API_KEY }"
        'Content-Type': 'application/json'
      body: JSON.stringify { document_id: metadata.boxview.id }
      json: true
    request options, (err, result, body) ->
      if err
        res.send 500, err
      else
        res.json 200, { boxview: body }

  else
    return res.json { error: "No metadata" }

# ---------------------------------------------------------------------------

app.use '/bower_components', express.static(pathlib.join(__dirname, 'bower_components'))
app.use express.static(pathlib.join(__dirname, 'static'))
app.use serveIndex(pathlib.join(__dirname, 'static'), icons: true)
app.use logger('dev')

port = process.env.PORT ? 8080
app.listen port, ->
  console.log "Listening on http://localhost:#{ port }"
