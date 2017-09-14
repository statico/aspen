/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const walklib = require('walk');
const pathlib = require('path');

// Pass basedir and optional subdir.
// Callback args are: relpath, fullpath
exports.walk = function(basedir, subdir, cb) {
  if ((cb == null)) {
    cb = subdir;
    subdir = null;
  }
  if (!subdir) {
    subdir = '.';
  }

  const walker = walklib.walk(pathlib.join(basedir, subdir), {followLinks: true});

  return walker.on('file', function(root, stats, next) {
    const {name} = stats;
    const fullpath = pathlib.join(root, name);
    const relpath = pathlib.relative(basedir, fullpath);

    if (/^\./.test(name)) {
      // Ignore dotfiles.

    } else if ((/\.txt$/i).test(name)) {
      cb(relpath, fullpath);
    }

    else {}
      // Ignore.

    return next();
  });
};
