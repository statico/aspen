/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const lineReader = require('line-reader');

// Extracts a usable title from the older plaintext scans.
exports.extractTitle = function(path, cb) {

  // A145Speeches/1922-1928_4100-4199.txt
  let match;
  if (match = path.match(/Speeches\/(\d{4}.*?)\.\w+$/)) {
    let title = `A145 Speeches ${match[1].replace(/_/g, ' ')}`;
    const contents = fs.readFileSync(path, 'utf8');
    match = contents.match(/^(\d+)/);
    if (match) {
      title += ` p. ${ match[1] }`;
    } else {
      title += " p. 1";
    }
    return cb(title);
  }

  // Finest Hour
  if (match = path.match(/FinestHour\/No\.(\d+)\.txt$/)) {
    return cb(`Finest Hour No. ${ Number(match[1]) } (plaintext)`);
  }

  // New tika-converted titles with metadata *and* old-school text files where
  // the top line is like: "@@Addison, Home Front, p. 200"
  let first = null;
  const pattern = /^(.*(@@|TITLE:)|JOURNAL OF THE CHURCHILL CENTRE|FINEST HOUR)/;
  const strip = /^.*(@@|TITLE:\s+)/;

  return lineReader.eachLine(path, function(line, last) {

    // New metadata from convert.sh and tika.
    if (match = line.match(/^dc:title:\s*(.*)/)) {
      cb(match[1]);
      return false;
    }

    if (/^### /.test(line)) { return true; } // Ignore UnRTF messages.

    if (first == null) { first = line; }

    if (pattern.test(line)) {
      cb(line.replace(strip, ''));
      return false;
    }

    if (last) {
      cb(first);
      return false;
    }

    return true;
  });
};
