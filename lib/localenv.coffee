fs = require 'fs'
pathlib = require 'path'

# Copy env from ./env
exports.init = (basedir) ->
  env = pathlib.join basedir, 'env'
  if fs.existsSync env
    lines = fs.readFileSync(env, 'utf8').split '\n'
    for line in lines
      continue unless line
      [key, value] = line.split '='
      unless key and value
        console.warn "Ignoring env line: '#{ line }'"
        continue
      process.env[key] = value

