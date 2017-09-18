# Aspen

- Web app to search a large corpus of plain text files
- Lets you deep dive into search results without leaving the browser
- Powerful search query support through [Elasticsearch query string syntax](https://www.elastic.co/guide/en/elasticsearch/reference/1.7/query-dsl-query-string-query.html#query-string-syntax)
- Performs some basic cleanup of plaintext data and can extract document titles
- Responsive UI that works on mobile
- Runs in Docker

[![example](https://imgur.com/30X4t9A.gif)](https://imgur.com/30X4t9A)

## Getting Started using Docker

#### 1. Set up your data directory

Put all your files in one place. This directory will be served via `/static/data/` on the web server.

```
$ mkdir ~/ebooks
```

**If you have non-plaintext documents, like PDFs and MSWord,** use the included `convert` utility to convert them to plaintext. Pass it a filename relative to your data directory:

```
$ ls ~/ebooks
Something.docx

$ docker run --rm -v ~/ebooks:/data statico/aspen convert /data/Something.docx
Creating /data/Test.txt...
+ exec java -jar /tika.jar --config=/aspen/config/tika.xml -m /data/Test.docx
OK

$ ls ~/ebooks
Something.docx
Something.txt
```

#### 2. Start and initialize Elasticsearch

Make a place to store Elasticsearch corpus data:

```
$ mkdir -p esdata
```

Create a new Docker network so Elasticsearch and the web app can communicate:

```
$ docker network create aspen
```

Run Elasticsearch:

```
$ docker run --name elasticsearch -d --net=aspen -p 9200:9200 \
    -v $PWD/esdata:/usr/share/elasticsearch/data \
    -v $PWD/config:/usr/share/elasticsearch/config \
    elasticsearch:1.7 --config=config/basic.yml
```

Make sure it's up by running `curl localhost:9200` -- you should see something like `"status": 200`.

Now clear and initialize Elasticsearch:

```
$ docker run --rm --net=aspen statico/aspen es-reset
```

#### 3. Import your documents

This imports everything in `~/ebooks/` recursively and is idempotent:

```
$ docker run --rm --net=aspen -v ~/ebooks:/data statico/aspen import
```

Alternatively, to only import a single folder or document, pass the filename relative to your data directory, like this:

```
$ docker run --rm --net=aspen -v ~/ebooks:/data statico/aspen import foo/bar.txt
```

#### 4. Start the web app

```
$ docker run --name aspen -d --net=aspen -p 3000:3000 \
    -v ~/ebooks:/data statico/aspen
```

Now go to http://localhost:3000 and try your new search engine!

## Getting Started with Local Development

#### 1. Install dependencies

It's easiest to use Elasticsearch via [Docker](https://www.docker.com/).

You can get Node and Yarn via [Homebrew](https://brew.sh/) on Mac, or you can download [Node.js v8.5 or later](https://nodejs.org/en/download/) and `npm install -g yarn` to get Yarn.

For document conversation (`bin/convert`) you'll want:

1. [Apache Tika](https://tika.apache.org/)
1. [UnRTF](https://www.gnu.org/software/unrtf/)
1. [Par](http://www.nicemice.net/par/)

On macOS you can `brew install node tika unrtf par`.

#### 2. Clone the repo

```
$ git clone git@github.com:statico/aspen.git
$ cd aspen
$ yarn install
```

#### 3. Set up Elasticsearch and import your data

See steps 1-3 in the above "Using Docker" section. In short, get your text files together in one place, set up Elasticsearch, and import them with the `bin/import` command.

#### 4. Start the web app

Aspen is built using [Next.js](https://github.com/zeit/next.js/), which is Node + ES6 + Express + React + hot reloading + lots more. Simply run:

```
$ yarn run dev
```

...and go to http://localhost:3000

If you are working on `server.js` and want automatic server restarting, do:

```
$ yarn global add nodemon
$ nodemon -w server.js -w lib -x yarn -- run dev
```

## Running in Production Using Docker

Similar to development, but 

```
$ docker network create aspen
$ docker run --name aspen -d --restart=always --net=aspen -p 8900:8080 \
    -v ~/data/ebooks:/aspen/static/data statico/aspen
$ docker run --name elasticsearch -d --restart=always --net=aspen -e "JAVA_OPTS=-server" \
    -v ~/data/esdata:/usr/share/elasticsearch/data \
    -v ~/data/config:/usr/share/elasticsearch/config \
    elasticsearch:1.7 --config=config/basic.yml
```

## Development Notes

- This started as an Angular 1 + CoffeeScript example. I recently migrated it to use Next.js, ES6 and React. You can view a full diff [here](https://github.com/statico/aspen/compare/master...next).
- I'm still using Elasticsearch 1.7 because I haven't bothered to learn the newer versions.

## Links

* [Elasticsearch Guide](http://www.elasticsearch.org/guide/)
* [Elasticsearch 1.7 Reference](https://www.elastic.co/guide/en/elasticsearch/reference/1.7/index.html)
