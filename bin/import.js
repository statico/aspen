#!/usr/bin/env node
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const async = require('async');
const colors = require('colors');
const commander = require('commander');
const fs = require('fs');
const pathlib = require('path');

const {esUpload, esReset} = require('../lib/elasticsearch');
const {walk} = require('../lib/walker');
const {extractTitle} = require('../lib/plaintext');

commander
  .version('0.0.1')
  .usage('<subdirs ...>')
  .option('-d, --basedir <path>', 'Set the path to static/data/', __dirname + '/../static/data')
  .option('-c, --concurrency <n>', 'Limit indexing to this many docs at once', 5)
  .parse(process.argv);

const {basedir, concurrency} = commander;
const subdirs = commander.args;

const indexfn = ({relpath, fullpath}, done) =>
  extractTitle(fullpath, title =>
    esUpload(basedir, fullpath, title, function(err) {
      if (err) {
        console.error("✗ ".red, err);
      } else {
        console.log("✓ ".green, `${ relpath }`, `-> ${ title }`.bold.blue);
      }
      return done();
    })
  )
;

const queue = async.queue(indexfn, concurrency);

const walkfn = (relpath, fullpath) =>
  queue.push({relpath, fullpath}, function(err) {
    if (err) { return console.error(`Couldn't push to queue: ${ err }`.red); }
  })
;

if (subdirs.length) {
  for (let dir of Array.from(subdirs)) {
    const path = pathlib.join(basedir, dir);
    if (fs.statSync(path).isDirectory()) {
      walk(basedir, dir, walkfn);
    } else {
      const relpath = pathlib.relative(basedir, path);
      const fullpath = pathlib.resolve(basedir, path);
      queue.push({relpath, fullpath});
    }
  }
} else {
  walk(basedir, walkfn);
}

