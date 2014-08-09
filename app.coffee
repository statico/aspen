#!./node_modules/coffee-script/bin/coffee

bodyParser = require 'body-parser'
coffeeMiddleware = require 'coffee-middleware'
express = require 'express'
fs = require 'fs'
less = require 'less-middleware'
logger = require 'morgan'
pathlib = require 'path'

# Copy env from ./env
env = pathlib.join __dirname, 'env'
if fs.existsSync env
  lines = fs.readFileSync(env, 'utf8').split '\n'
  for line in lines
    continue unless line
    [key, value] = line.split '='
    unless key and value
      console.warn "Ignoring env line: '#{ line }'"
      continue
    process.env[key] = value

app = express()
app.set 'views', pathlib.join(__dirname, 'views')
app.set 'view engine', 'jade'
app.use logger('dev')
app.use bodyParser.json()
app.use bodyParser.urlencoded(extended: true)
app.use less(pathlib.join(__dirname, 'static'))
app.use coffeeMiddleware(src: pathlib.join(__dirname, 'static'))
app.use express.static(pathlib.join(__dirname, 'static'))

app.use (err, req, res, next) ->
  res.status err.status or 500
  res.render 'error',
    message: err.message
    error: {}
  return

app.get '/', (req, res) ->
  res.render 'index'

port = process.env.PORT ? 8080
app.listen port, ->
  console.log "Listening on http://localhost:#{ port }"
