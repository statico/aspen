const fs = require("fs");
const lineReader = require("line-reader");

// Extracts a usable title from the older plaintext scans.
module.exports = async function extractTitle(path) {
  // New tika-converted titles with metadata *and* old-school text files where
  // the top line is like: "@@Metamorphosis, p. 200"
  let first = null;
  const pattern = /^(.*(@@|TITLE:))/;
  const strip = /^.*(@@|TITLE:\s+)/;

  return new Promise((resolve, reject) => {
    lineReader.eachLine(path, function (line, last) {
      if (last) {
        resolve(first);
        return false;
      }

      if (/^\s*$/.test(line)) return true; // Blank lines
      if (/^### /.test(line)) return true; // UnRTF junk
      if (!/[A-Za-z]/.test(line)) return true; // Ignore other junk
      if (/^pict\d+/.test(line)) return true; // Ignore images

      // New metadata from convert.sh and tika.
      if ((match = line.match(/^dc:title:\s*(.*)/))) {
        resolve(match[1]);
        return false;
      }

      if (first == null) first = line;

      if (pattern.test(line)) {
        resolve(line.replace(strip, ""));
        return false;
      }

      return true;
    });
  });
};
