#!./node_modules/coffee-script/bin/coffee
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

require './localenv'

MAX_DOCUMENT_CHARACTERS = 4e6
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
    # Legacy redirect.
    res.redirect "/#/#{ encodeURIComponent req.query.q }"
  else
    res.render 'index'

# RPCs ----------------------------------------------------------------------

app.get '/query', (req, res) ->
  res.header 'Cache-Control', 'no-cache'
  options =
    method: 'GET'
    url: "#{ process.env.SOLR_URL }/query"
    json: true
    qs:
      q: req.query.q
      rows: ITEMS_PER_PAGE
      start: Math.max(ITEMS_PER_PAGE * (Number(req.query.page) or 0), 0)
      fl: 'id,url,title'
      'hl': true
      'hl.fl': 'text'
      'hl.snippets': 3
      'hl.mergeContiguous': true
      'hl.maxAnalyzedChars': MAX_DOCUMENT_CHARACTERS
      'hl.score.pivot': 2000
      defType: 'edismax'
      pf: 'text' # Boost phrases.
      ps: 100
      bq: 'url:*pdf^5 url:*docx^5' # Boost newer scans.
  request options, (err, result, body) ->
    if err
      res.json { error: err }
    else
      res.json body

app.get '/metadata', (req, res) ->
  return res.send(400) if /\.\.|\0/.test req.query.path

  path = pathlib.join STATIC_BASEDIR, req.query.path + META_SUFFIX
  return res.json({}) unless fs.existsSync path

  metadata = JSON.parse fs.readFileSync path

  if metadata.boxview
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
        res.json { boxview: body }

  else
    return res.send(501)

# ---------------------------------------------------------------------------

app.use '/bower_components', express.static(pathlib.join(__dirname, 'bower_components'))
app.use express.static(pathlib.join(__dirname, 'static'))
app.use serveIndex(pathlib.join(__dirname, 'static'), icons: true)
app.use logger('dev')

port = process.env.PORT ? 8080
app.listen port, ->
  console.log "Listening on http://localhost:#{ port }"
