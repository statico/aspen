#!./node_modules/coffee-script/bin/coffee

async = require 'async'
colors = require 'colors'
commander = require 'commander'
pathlib = require 'path'

require('./lib/localenv').init __dirname

{solrUpload, solrClearAll, solrClearQuery} = require './lib/solr'
{esUpload, esReset} = require './lib/elasticsearch'
{walk} = require './lib/walker'
{extractTitle} = require './lib/plaintext'

commander
  .version('0.0.1')
  .option('-d, --basedir <path>', 'Set the path to static/data/', __dirname + '/static/data')
  .option('-c, --concurrency <n>', 'Limit solr indexing to this many docs at once', Infinity)

commander
  .command('solr [subdirs...]')
  .description('Index static/data/ (or a subdir) into Solr')
  .action (subdirs) ->
    {basedir, concurrency} = commander

    indexfn = ({relpath, fullpath, richtext}, done) ->
      if richtext
        solrUpload basedir, fullpath, null, (err) ->
          if err
            console.error "✗ ".red, err
          else
            console.log "✓ ".green, "#{ relpath } -> rich text"
          done()
      else
        extractTitle fullpath, (title) ->
          solrUpload basedir, fullpath, title, (err) ->
            if err
              console.error "✗ ".red, err
            else
              console.log "✓ ".green, "#{ relpath } -> plaintext, title='#{ title }'"
          done()

    queue = async.queue indexfn, concurrency

    walkfn = (relpath, fullpath, richtext) ->
      queue.push {relpath: relpath, fullpath: fullpath, richtext: richtext}, (err) ->
        console.error "Couldn't push to queue: #{ err }".red if err

    if subdirs.length
      for dir in subdirs
        walk basedir, dir, walkfn
    else
      walk basedir, walkfn

commander
  .command('solr-clear <query>')
  .description('Clears some documents from Solr, like "RML/*"')
  .action (query) ->
    solrClearQuery query, (err, res, body) ->
      console.log "✓ ".green, "Done."

commander
  .command('solr-clearall')
  .description('Empty the Solr database')
  .action ->
    solrClearAll ->
      console.log "✓ ".green, "Done."

commander
  .command('es [subdirs...]')
  .description('Index static/data/ (or a subdir) into ElasticSearch')
  .action (subdirs) ->
    {basedir, concurrency} = commander

    indexfn = ({relpath, fullpath, richtext}, done) ->
      if richtext
        console.error "✗ ".red, "Not indexing richtext yet"
      else
        extractTitle fullpath, (title) ->
          esUpload basedir, fullpath, title, (err) ->
            if err
              console.error "✗ ".red, err
            else
              console.log "✓ ".green, "#{ relpath } -> plaintext, title='#{ title }'"
          done()

    queue = async.queue indexfn, concurrency

    walkfn = (relpath, fullpath, richtext) ->
      queue.push {relpath: relpath, fullpath: fullpath, richtext: richtext}, (err) ->
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

