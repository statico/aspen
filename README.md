# Aspen

Aspen lets you search a large corpus of plain text files via the browser.

[![license](https://img.shields.io/github/license/statico/aspen.svg?style=flat)](https://github.com/statico/aspen/blob/master/LICENSE)
[![build status](https://img.shields.io/github/workflow/status/statico/aspen/Create%20and%20publish%20a%20Docker%20image.svg?style=flat-square)](https://ghcr.io/statico/aspen)

[![example](https://imgur.com/30X4t9A.gif)](https://imgur.com/30X4t9A)

- Powerful search query support through [Elasticsearch query string syntax](https://www.elastic.co/guide/en/elasticsearch/reference/1.7/query-dsl-query-string-query.html#query-string-syntax)
- Performs some basic cleanup of plaintext data and can extract document titles
- Responsive UI that works on mobile
- Runs in [Docker](https://ghcr.io/statico/aspen)

## Getting Started using Docker Compose

### 1. Collect your documents

Put all your files in one place, like `~/ebooks/`:

```
$ tree ~/ebooks
/Users/ian/ebooks
└── Project\ Gutenberg/
    ├── Beowulf.txt
    ├── Dracula.txt
    ├── Frankenstein.txt
```

### 2. Run Aspen & Elasticsearch

```
$ docker-compose up -d
Creating network "aspen_default" with the default driver
Creating elasticsearch ... done
Creating aspen         ... done
```

### 3. Convert any non-plaintext (PDFs, MS Word) documents to plaintext

Use the included `convert` utility, which wraps [Apache Tika](https://tika.apache.org), to convert them to plaintext. Pass it a filename relative to your data directory:

```
$ ls ~/ebooks
Project Gutenberg Test.docx

$ docker-compose run aspen convert Test.docx
Starting elasticsearch ... done
Test.docx doesn't exist, trying /data/Test.docx
Creating /data/Test.txt...
...
OK

$ ls ~/ebooks
Project Gutenberg Test.docx         Test.txt
```

#### 4. Import content into Elasticsearch

Start by resetting Elasticsearch to make sure everything is working:

```
$ docker-compose run aspen es-reset
Starting elasticsearch ... done
Results from DELETE: { acknowledged: true }
✓ Done.
```

Now import all `.txt` documents. The `import` script will try to figure out the title of the document automatically:

```
$ docker-compose run aspen import
Starting elasticsearch ... done
→ Base directory is /app/public/data
▲ Ignoring non-text path: Test.docx
→ Test.txt → Test Document
→ Project Gutenberg/Beowulf.txt → The Project Gutenberg EBook of Beowulf
→ Project Gutenberg/Dracula.txt → The Project Gutenberg EBook of Dracula, by Bram Stoker
→ Project Gutenberg/Frankenstein.txt → Project Gutenberg's Frankenstein, by Mary Wollstonecraft (Godwin) Shelley
✓ Done!
```

You can also run `import` with a directory or file name relative to the data directory. For example, `import Project\ Gutenberg` or `import Project\ Gutenberg\Dracula.txt`.

**Sometimes plaintext documents act strangely.** Maybe `bin/import` can't extract a title or maybe the search highlights are off. The file might have the wrong line endings or one of those annoying [UTF-8 BOM headers](https://stackoverflow.com/questions/2223882/whats-different-between-utf-8-and-utf-8-without-bom). Try running [dos2unix](http://dos2unix.sourceforge.net/) on your text files to fix them.

#### 5. Done!

Go to http://localhost:3000/ and start searching!

## Development Setup

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

See steps 1-4 in the above "Using Docker" section. In short, get your text files together in one place, set up Elasticsearch, and import them with the `bin/import` command.

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

## Development Notes

- This started as an Angular 1 + CoffeeScript example. I recently migrated it to use Next.js, ES6 and React. You can view a full diff [here](https://github.com/statico/aspen/compare/4af174d...next).
- I'm still using Elasticsearch 1.7 because I haven't bothered to learn the newer versions.

## Links

- [Elasticsearch Guide](http://www.elasticsearch.org/guide/)
- [Elasticsearch 1.7 Reference](https://www.elastic.co/guide/en/elasticsearch/reference/1.7/index.html)
- [`tree` command](https://www.geeksforgeeks.org/tree-command-unixlinux/)
