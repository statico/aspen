# aspen

## getting started

    $ npm install
    $ ln -s ../solr-4.9.0 solr-dist
    $ ln -s ../data static/data
    $ npm run solr &
    $ ./import.coffee

## commands

- Dev server
    $ npm run dev

- Dev solr start
    $ npm run solr

## example solr query

    http://localhost:8983/solr/query?q=jock&fl=id,title,url&hl=true&hl.fl=content,title&hl.fragsize=300&hl.snippets=3&hl.mergeContiguous=true

## docs

    https://cwiki.apache.org/confluence/display/solr/
