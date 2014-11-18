#!./node_modules/coffee-script/bin/coffee

async = require 'async'
colors = require 'colors'
commander = require 'commander'
pathlib = require 'path'

require('./lib/localenv').init __dirname

{boxViewUpload} = require './lib/boxview'
{solrUpload, solrClearAll, solrClearQuery} = require './lib/solr'
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
  .command('clear <query>')
  .description('Clears some documents from Solr, like "RML/*"')
  .action (query) ->
    solrClearQuery query, (err, res, body) ->
      console.log "✓ ".green, "Done."

commander
  .command('clearall')
  .description('Empty the Solr database')
  .action ->
    solrClearAll ->
      console.log "✓ ".green, "Done."

commander
  .command('boxview [subdir]')
  .description('Look for rich text documents and upload them to BoxView')
  .action (subdir) ->
    {basedir} = commander
    walk basedir, subdir, (relpath, fullpath, richtext) ->
      return unless richtext
      boxViewUpload basedir, relpath, (err) ->
        if err
          console.error "✗ ".red, err
        else
          console.log "✓ ".green, relpath

commander
  .command('*')
  .description('Show this help')
  .action ->
    commander.help()

commander.parse process.argv

commander.help() unless commander.args.length

