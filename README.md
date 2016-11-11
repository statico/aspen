# Aspen

A quick-and-dirty example of Elasticsearch + Node + Express + Angular.

This expects lots of content to be symlinked in `static/data`.

## Getting Started

First, download the Elasticsearch zip from http://www.elasticsearch.org/download/ -- currently supported version is 1.4.1 -- then unzip it in to this directory.

Then,

    $ npm install -g bower
    $ npm install
    $ bower install
    $ ln -s ../data static/data
    $ ln -s elasticsearch-1.4.1 elasticsearch-dist
    $ npm run es-dev &
    $ ./import.coffee es-reset
    $ ./import.coffee es

## Plaintext Only

Only plaintext documents are supported. To convert a MSWord doc or PDF to plaintext, install [Apache Tika](http://tika.apache.org/) and [par](http://www.nicemice.net/par/) and run `convert.sh`.

## Links

* [Elasticsearch Guide](http://www.elasticsearch.org/guide/)
* Michael Bromley's [angularUtils](https://github.com/michaelbromley/angularUtils) for its Angular pagination directive

## Production Use

```
$ docker network create aspen
$ docker run --name aspen -d --net=aspen -p 8900:8080 \
    -v ~/data/ebooks:/aspen/static/data statico/aspen
$ docker run --name elasticsearch -d --net=aspen -e "JAVA_OPTS=-server" \
    -v ~/data/esdata:/usr/share/elasticsearch/data \
    -v ~/data/esconfig:/usr/share/elasticsearch/config \
    elasticsearch:1.4 --config=config/basic.yml
```

## Maintenance

### Adding a new book

1. Locally...
    1. Copy the docx to static/data
    1. `./convert.sh static/data/Hillsdale/Foo.docx`
    1. `npm run syncup`
1. Remotely...
    1. `import.coffee es Hillsdale/Foo.txt`


