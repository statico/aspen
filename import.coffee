#!./node_modules/coffee-script/bin/coffee

colors = require 'colors'
commander = require 'commander'
pathlib = require 'path'

require('./lib/localenv').init __dirname

{boxViewUpload} = require './lib/boxview'
{solrUpload} = require './lib/solr'
{walk} = require './lib/walker'
{extractTitle} = require './lib/plaintext'

commander
  .version('0.0.1')
  .option('-d, --basedir <path>', 'Set the path to static/data/', __dirname + '/static/data')

commander
  .command('solr [subdir]')
  .description('Index static/data/ (or a subdir) into Solr')
  .action (subdir) ->
    {basedir} = commander
    walk basedir, subdir, (relpath, fullpath, richtext) ->
      if richtext
        solrUpload basedir, fullpath, null, (err) ->
          if err
            console.error "✗ ".red, err
          else
            console.log "✓ ".green, "#{ relpath } -> rich text"
      else
        extractTitle fullpath, (title) ->
          solrUpload basedir, fullpath, title, (err) ->
            if err
              console.error "✗ ".red, err
            else
              console.log "✓ ".green, "#{ relpath } -> plaintext, title='#{ title }'"

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
  .command('clearall')
  .description('Empty the Solr database')
  .action ->
    solrClear ->
      solrCommit ->
        console.log "✓ ".green, "Done."

commander
  .command('*')
  .description('Show this help')
  .action ->
    commander.help()

commander.parse process.argv

commander.help() unless commander.args.length

