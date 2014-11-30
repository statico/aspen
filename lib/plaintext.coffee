fs = require 'fs'
lineReader = require 'line-reader'

# Extracts a usable title from the older plaintext scans.
exports.extractTitle = (path, cb) ->

  # A145Speeches/1922-1928_4100-4199.txt
  if match = path.match /Speeches\/(\d{4}.*?)\.\w+$/
    title = "A145 Speeches " + match[1].replace(/_/g, ' ')
    contents = fs.readFileSync path, 'utf8'
    match = contents.match /^(\d+)/
    if match
      title += " p. #{ match[1] }"
    else
      title += " p. 1"
    return cb title

  # Finest Hour
  if match = path.match /FinestHour\/No\.(\d+)\.txt$/
    return cb "Finest Hour No. #{ Number match[1] } (plaintext)"

  # Old-school text files where the top line is like:
  # @@Addison, Home Front, p. 200
  first = null
  match = /^(.*(@@|TITLE:)|JOURNAL OF THE CHURCHILL CENTRE|FINEST HOUR)/
  strip = /^.*(@@|TITLE:\s+)/

  lineReader.eachLine path, (line, last) ->
    first ?= line

    if match.test line
      cb line.replace(strip, '')
      return false

    if last
      cb first or path.replace(/^.+\//, '')
      return false

    return true
