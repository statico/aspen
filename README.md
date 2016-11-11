# Aspen

- Web app to search a large corpus of plain text files
- Lets you deep dive into search results without leaving the browser
- Powerful search query support
- Performs some basic cleanup of plaintext data and can extract document titles
- Responsive UI that works on mobile
- Runs in Docker

[![example](http://imgur.com/vvopYzB.gif)](http://imgur.com/vvopYzB)

## Getting Started

### 1. Symlink your documents directory into static/data

```
$ ln -s $HOME/ebooks static/data
$ ls static/data/
VOLUME1.txt VOLUME2.txt VOLUME3.txt
```

**If you have non-plaintext documents, like PDFs and MSWord,** use the convert utility to convert them to plaintext:

```
$ docker run -it --rm -v ~/ebooks:/aspen/static/data statico/aspen convert static/data/Something.docx
```

**Need plaintext documents for testing?** Check out the [Top 100 eBooks on Project Gutenberg](https://www.gutenberg.org/browse/scores/top).

### 3. Run Elasticsearch

The easiest way is through [Docker](https://www.docker.com/). I've only ever tested Aspen with Elasticsearch 1.x.

Make a place to store corpus data:

```
$ mkdir -p esdata
```

Create a new Docker network so Elasticsearch and the webapp can communicate:

```
$ docker network create aspen
```

Run Elasticsearch:

```
$ docker run --name elasticsearch -d --net=aspen -p 9200:9200 \
    -v $PWD/esdata:/usr/share/elasticsearch/data \
    -v $PWD/esconfig:/usr/share/elasticsearch/config \
    elasticsearch:1.7 --config=config/basic.yml
```

If you `curl -s http://localhost:9200/` you should see something like `"status": 200`.

Next, initialize and clear Elasticsearch:

```
$ docker run -it --rm --net=aspen -v ~/ebooks:/aspen/static/data statico/aspen es-reset
```

### 2. Import documents

This imports everything in `static/data/` and is idempotent:

```
$ docker run -it --rm --net=aspen -v ~/ebooks:/aspen/static/data statico/aspen import
```

Alternatively, to only import a single folder or document, pass the filename relative to `static/data/`:

```
$ docker run -it --rm --net=aspen -v ~/ebooks:/aspen/static/data statico/aspen import SomeFolder/Something.txt
```

**Getting queue size errors from Elasticsearch?** Try setting the import concurrency to something lower, like `import -c 1`.

### 3. Install dependencies

```
$ npm install
$ npm install -g bower
$ bower install
```

### 4. Run the server

```
$ npm run -s web
```

And go to http://localhost:8080/

## Running in Production

Similar to development, but 

```
$ docker network create aspen
$ docker run --name aspen -d --restart=always --net=aspen -p 8900:8080 \
    -v ~/data/ebooks:/aspen/static/data statico/aspen
$ docker run --name elasticsearch -d --restart=always --net=aspen -e "JAVA_OPTS=-server" \
    -v ~/data/esdata:/usr/share/elasticsearch/data \
    -v ~/data/esconfig:/usr/share/elasticsearch/config \
    elasticsearch:1.7 --config=config/basic.yml
```

## Links

* [Elasticsearch Guide](http://www.elasticsearch.org/guide/)
* Michael Bromley's [angularUtils](https://github.com/michaelbromley/angularUtils) for its Angular pagination directive
* `convert` requires: [Apache Tika](https://tika.apache.org/), [unrtf](https://www.gnu.org/software/unrtf/), and [par](http://www.nicemice.net/par/). (On Mac OS X, run `brew install tika unrtf par`)
