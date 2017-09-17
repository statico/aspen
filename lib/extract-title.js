const fs = require('fs')
const lineReader = require('line-reader')

// Extracts a usable title from the older plaintext scans.
module.exports = async function extractTitle (path) {

  // A145Speeches/1922-1928_4100-4199.txt
  let match
  if (match = path.match(/Speeches\/(\d{4}.*?)\.\w+$/)) {
    let title = `A145 Speeches ${match[1].replace(/_/g, ' ')}`
    const contents = fs.readFileSync(path, 'utf8')
    match = contents.match(/^(\d+)/)
    if (match) {
      title += ` p. ${ match[1] }`
    } else {
      title += " p. 1"
    } return title
  }

  // Finest Hour
  if (match = path.match(/FinestHour\/No\.(\d+)\.txt$/)) {
    return `Finest Hour No. ${ Number(match[1]) } (plaintext)`
  }

  // New tika-converted titles with metadata *and* old-school text files where
  // the top line is like: "@@Addison, Home Front, p. 200"
  let first = null
  const pattern = /^(.*(@@|TITLE:)|JOURNAL OF THE CHURCHILL CENTRE|FINEST HOUR)/
  const strip = /^.*(@@|TITLE:\s+)/

  return new Promise((resolve, reject) => {
    lineReader.eachLine(path, function(line, last) {

      if (first == null) { first = line }

      if (last) {
        resolve(first)
        return false
      }

      // Ignore blank lines
      if (/^\s*$/.test(line)) return true

      // New metadata from convert.sh and tika.
      if (match = line.match(/^dc:title:\s*(.*)/)) {
        resolve(match[1])
        return false
      }

      // Ignore UnRTF messages.
      if (/^### /.test(line)) { return true }

      if (pattern.test(line)) {
        resolve(line.replace(strip, ''))
        return false
      }

      return true
    })
  })
}
