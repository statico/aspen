#!./node_modules/coffee-script/bin/coffee
#
# Fixes up text after a scan.

fs = require 'fs'
commander = require 'commander'

commander
  .version('0.0.1')
  .usage('[options] <filename>')
  .option('-w, --wordlist <path>', 'Path to English wordlist', __dirname + '/words.txt')

commander.parse process.argv
commander.help() unless commander.args.length is 1

words = {}
for word in fs.readFileSync(commander.wordlist, 'utf8').split '\n'
  words[word] = true

contents = fs.readFileSync commander.args[0], 'utf8'
lines = contents.split '\n'
for line, i in lines

  # Fix trailing garbage.
  line = line.replace /\s+\.$/, ''

  # Fix weird scans which broke up words like "under<0xC2><0xAD>  stand"
  line = line.replace /(\w+)[\s\xC2\xAD]{2,}(\w+)/g, (whole, a, b) ->
    word = a + b
    if word.toLowerCase() of words
      return word
    else
      return whole

  lines[i] = line

console.log lines.join '\n'
