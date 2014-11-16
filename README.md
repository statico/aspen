# Aspen

A quick-and-dirty example of Solr + Node + Express + Angular.

This expects lots of content to be symlinked in `static/data`.

## Getting Started

    $ npm install -g bower
    $ npm install
    $ bower install
    $ ln -s ../solr-4.9.0 solr-dist
    $ ln -s ../data static/data
    $ npm run solr-dev &
    $ ./import.coffee solr

## Notes

* PDF documents should have the correct title embedded in them.

## Commands

- Dev solr start

    $ npm run solr-dev

- Dev server

    $ npm run web-dev

- Manual file import

    $ cd static/data/
    $ x=path/to/file.pdf ; curl "http://localhost:8983/solr/update/extract?literal.id=$x&literal.url=$x&commit=true" -F "myfile=@$x"

## Example Solr Query

* http://localhost:8983/solr/query?q=jock&fl=id,title,url&hl=true&hl.fl=content,title&hl.fragsize=300&hl.snippets=3&hl.mergeContiguous=true

## Links

* Main Solr wiki: https://cwiki.apache.org/confluence/display/solr/
* Extended DisMax Query Parser: https://cwiki.apache.org/confluence/display/solr/The+Extended+DisMax+Query+Parser
* Postings Highlighter: https://cwiki.apache.org/confluence/display/solr/Postings+Highlighter
* Michael Bromley's [angularUtils](https://github.com/michaelbromley/angularUtils) for its Angular pagination directive
