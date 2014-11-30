#!./node_modules/coffee-script/bin/coffee

async = require 'async'
colors = require 'colors'
commander = require 'commander'
pathlib = require 'path'

require('./lib/localenv').init __dirname

{esUpload, esReset} = require './lib/elasticsearch'
{walk} = require './lib/walker'
{extractTitle} = require './lib/plaintext'

commander
  .version('0.0.1')
  .option('-d, --basedir <path>', 'Set the path to static/data/', __dirname + '/static/data')
  .option('-c, --concurrency <n>', 'Limit indexing to this many docs at once', Infinity)

commander
  .command('es [subdirs...]')
  .description('Index static/data/ (or a subdir) into ElasticSearch')
  .action (subdirs) ->
    {basedir, concurrency} = commander

    indexfn = ({relpath, fullpath}, done) ->
      extractTitle fullpath, (title) ->
        esUpload basedir, fullpath, title, (err) ->
          if err
            console.error "✗ ".red, err
          else
            console.log "✓ ".green, "#{ relpath }", "-> #{ title }".bold.blue
        done()

    queue = async.queue indexfn, concurrency

    walkfn = (relpath, fullpath) ->
      queue.push {relpath: relpath, fullpath: fullpath}, (err) ->
        console.error "Couldn't push to queue: #{ err }".red if err

    if subdirs.length
      for dir in subdirs
        walk basedir, dir, walkfn
    else
      walk basedir, walkfn

commander
  .command('es-reset')
  .description('Empty and initialize the ElasticSearch database')
  .action ->
    esReset ->
      console.log "✓ ".green, "Done."

commander
  .command('*')
  .description('Show this help')
  .action ->
    commander.help()

commander.parse process.argv

commander.help() unless commander.args.length

