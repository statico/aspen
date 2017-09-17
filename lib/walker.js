const walklib = require('walk')
const { join, relative } = require('path')

// Pass basedir and optional subdir.
// Callback args are: relpath, fullpath
export default async function walk (basedir, subdir = null) {
  const walker = walklib.walk(join(basedir, subdir), { followLinks: true })
  return walker.on('file', function(root, stats, next) {
    const {name} = stats
    const fullpath = join(root, name)
    const relpath = relative(basedir, fullpath)

    if (/^\./.test(name)) {
      // Ignore dotfiles.

    } else if ((/\.txt$/i).test(name)) {
      cb(relpath, fullpath)
    }

    else {}
      // Ignore.

    return next()
  })
}
