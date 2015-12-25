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

{esQuery} =  require './lib/elasticsearch'

MAX_DOCUMENT_CHARACTERS = 4e8
ITEMS_PER_PAGE = 10
STATIC_BASEDIR = pathlib.join(__dirname, 'static')

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

app.get '/test', (req, res) ->
  res.render 'test'

# RPCs ----------------------------------------------------------------------

app.get '/query', (req, res) ->
  if not req.query.q
    res.status(400).send('Missing q parameter')
    return

  # Chrome+Angular caches this.
  res.header 'Cache-Control', 'no-cache'

  # Stupify smart quotes which sometimes get pasted in.
  query = req.query.q
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")

  # Escape backslashes. Nobody is going to use regex searching; it's more useful to be able to
  # search the path: field easily.
  query = query.replace /\//g, '\\/'

  # Run the query twice. Get full highlight data first (but that's huge, so don't send it to the
  # user), then use that data to annotate the data the client gets. Basically, this:
  # http://stackoverflow.com/q/15072806/102704 and http://stackoverflow.com/q/4512656/102704
  buildQueryObject = (meta) ->

    # The main query.
    must =
      query_string:
        query: query
        default_operator: 'and'
        fields: ['text.english']
        analyzer: 'english_nostop'
        lenient: true
        phrase_slop: if req.query.slop then 50 else 0

    # An optional query we use to boost results and highlighting.
    should =
      match_phrase:
        message:
          query: query
          boost: 10
          lenient: true

    highlight =
      type: 'plain'
      fragment_size: 500
      number_of_fragments: if meta then 0 else 3
      highlight_query:
        bool:
          minimum_should_match: 0
          must: must
          should: should

    obj =
      _source: ['title', 'path']
      size: ITEMS_PER_PAGE
      from: Math.max(ITEMS_PER_PAGE * (Number(req.query.page) or 0), 0)
      query: must
      rescore:
        window_size: 50
        query:
          rescore_query_weight: 10
          rescore_query: should
      highlight:
        order: 'score'
        fields:
          'text.english': highlight
          text: highlight

    if meta
      obj.highlight.pre_tags = ['__HLS__'] # Highlight start
      obj.highlight.post_tags = ['__HLE__'] # Highlight end

    return obj

  # First pass: get highlight information.
  obj1 = buildQueryObject true
  esQuery obj1, (err, _, meta) ->
    return res.status(500).json { error: err } if err

    # Second pass: what we annotate and send to the client.
    obj2 = buildQueryObject false
    esQuery obj2, (err, _, body) ->

      # Add query time to the total.
      body.took += meta.took

      # Debug mode when testing the URL in the browser.
      respond = (code, content) -> res.status(code).json content
      if req.query.d
        obj2.explain = true
        respond = (code, content) ->
          res.header 'Content-type', 'text/plain'
          res.status(code).send JSON.stringify(content, null, '  ')

      # Annotate with highlight marker information.
      if body.hits?.hits?.length
        for hit, index in body.hits.hits

          locations = [] # Tuples of [start, stop] locations for each matches.
          metahit = meta.hits.hits[index]
          content = metahit.highlight['text.english']?[0] ? metahit.highlight.text?[0]
          if not content
            console.error "Can't get meta content for hit #{ index } of query: #{ query }"
            continue

          # Highlighter only highlights one term at a time, so compact phrase matches.
          content = content.replace /__HLE__\s+__HLS__/g, ' '

          # Markers are 7 characters long. That's easy to remember.
          # o = pointer to original text document
          # c = pointer to content with __HLE__ and __HLS__ markers
          # os, oe = start and end of original highlight location
          # cs, ce = start and end of highlighted location
          o = c = 0
          loop
            cs = content.indexOf '__HLS__', c
            break if cs is -1
            ce = content.indexOf '__HLE__', cs
            os = cs - locations.length * 14
            oe = ce - locations.length * 14 - 7
            locations.push [os, oe]
            o = oe
            c = ce

          hit.highlight_locations = locations

      if err
        respond 500, { error: err }
      else
        respond 200, body

# ---------------------------------------------------------------------------

app.use '/bower_components', express.static(pathlib.join(__dirname, 'bower_components'))
app.use express.static(pathlib.join(__dirname, 'static'))
app.use serveIndex(pathlib.join(__dirname, 'static'), icons: true)
app.use logger('dev')

port = process.env.PORT ? 8080
app.listen port, ->
  console.log "Listening on http://localhost:#{ port }"
