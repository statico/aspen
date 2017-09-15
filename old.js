#!./node_modules/.bin/node
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// Aspen frontend web server. License: MIT

const bodyParser = require('body-parser');
const coffeeMiddleware = require('coffee-middleware');
const express = require('express');
const fs = require('fs');
const less = require('less-middleware');
const logger = require('morgan');
const request = require('request');
const pathlib = require('path');
const serveIndex = require('serve-index');

const {esQuery} =  require('./lib/elasticsearch');

const MAX_DOCUMENT_CHARACTERS = 4e8;
const STATIC_BASEDIR = pathlib.join(__dirname, 'static');

const app = express();
app.set('views', pathlib.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(less(STATIC_BASEDIR));
app.use(coffeeMiddleware({src: STATIC_BASEDIR}));
app.locals.pretty = true;

// MAIN VIEWS ----------------------------------------------------------------

app.get('/', function(req, res) {
  if (req.query.q) {
    // Legacy redirect from Aspen 1.0.
    return res.redirect(`/#/search/${ encodeURIComponent(req.query.q) }`);
  } else {
    return res.render('index');
  }
});

app.get('/test', (req, res) => res.render('test'));

// RPCs ----------------------------------------------------------------------

app.get('/query', function(req, res) {
  if (!req.query.q) {
    res.status(400).send('Missing q parameter');
    return;
  }

  // Chrome+Angular caches this.
  res.header('Cache-Control', 'no-cache');

  // Stupify smart quotes which sometimes get pasted in.
  let query = req.query.q
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'");

  // Escape backslashes. Nobody is going to use regex searching; it's more useful to be able to
  // search the path: field easily.
  query = query.replace(/\//g, '\\/');

  // Run the query twice. Get full highlight data first (but that's huge, so don't send it to the
  // user), then use that data to annotate the data the client gets. Basically, this:
  // http://stackoverflow.com/q/15072806/102704 and http://stackoverflow.com/q/4512656/102704
  const buildQueryObject = function(meta) {

    // The main query.
    const must = {
      query_string: {
        query,
        default_operator: 'and',
        fields: ['text.english'],
        analyzer: 'english_nostop',
        lenient: true,
        phrase_slop: req.query.slop ? 50 : 0
      }
    };

    // An optional query we use to boost results and highlighting.
    const should = {
      match_phrase: {
        message: {
          query,
          boost: 10,
          lenient: true
        }
      }
    };

    const highlight = {
      type: 'plain',
      fragment_size: 500,
      number_of_fragments: meta ? 0 : 3,
      highlight_query: {
        bool: {
          minimum_should_match: 0,
          must,
          should
        }
      }
    };

    const obj = {
      _source: ['title', 'path'],
      size: ITEMS_PER_PAGE,
      from: Math.max(ITEMS_PER_PAGE * (Number(req.query.page) || 0), 0),
      query: must,
      rescore: {
        window_size: 50,
        query: {
          rescore_query_weight: 10,
          rescore_query: should
        }
      },
      highlight: {
        order: 'score',
        fields: {
          'text.english': highlight,
          text: highlight
        }
      }
    };

    if (meta) {
      obj.highlight.pre_tags = ['__HLS__']; // Highlight start
      obj.highlight.post_tags = ['__HLE__']; // Highlight end
    }

    return obj;
  };

  // First pass: get highlight information.
  const obj1 = buildQueryObject(true);
  return esQuery(obj1, function(err, _, meta) {
    if (err) { return res.status(500).json({ error: err }); }

    // Second pass: what we annotate and send to the client.
    const obj2 = buildQueryObject(false);
    return esQuery(obj2, function(err, _, body) {
      if (err) { return res.status(500).json({ error: err }); }

      // Add query time to the total.
      body.took += meta.took;

      // Debug mode when testing the URL in the browser.
      let respond = (code, content) => res.status(code).json(content);
      if (req.query.d) {
        obj2.explain = true;
        respond = function(code, content) {
          res.header('Content-type', 'text/plain');
          return res.status(code).send(JSON.stringify(content, null, '  '));
        };
      }

      // Annotate with highlight marker information.
      if (__guard__(body.hits != null ? body.hits.hits : undefined, x => x.length)) {
        for (let index = 0; index < body.hits.hits.length; index++) {

          var c;
          const hit = body.hits.hits[index];
          const locations = []; // Tuples of [start, stop] locations for each matches.
          const metahit = meta.hits.hits[index];
          let content = (metahit.highlight['text.english'] != null ? metahit.highlight['text.english'][0] : undefined) != null ? (metahit.highlight['text.english'] != null ? metahit.highlight['text.english'][0] : undefined) : (metahit.highlight.text != null ? metahit.highlight.text[0] : undefined);
          if (!content) {
            console.error(`Can't get meta content for hit ${ index } of query: ${ query }`);
            continue;
          }

          // Highlighter only highlights one term at a time, so compact phrase matches.
          content = content.replace(/__HLE__\s+__HLS__/g, ' ');

          // Markers are 7 characters long. That's easy to remember.
          // o = pointer to original text document
          // c = pointer to content with __HLE__ and __HLS__ markers
          // os, oe = start and end of original highlight location
          // cs, ce = start and end of highlighted location
          let o = (c = 0);
          while (true) {
            const cs = content.indexOf('__HLS__', c);
            if (cs === -1) { break; }
            const ce = content.indexOf('__HLE__', cs);
            const os = cs - (locations.length * 14);
            const oe = ce - (locations.length * 14) - 7;
            locations.push([os, oe]);
            o = oe;
            c = ce;
          }

          hit.highlight_locations = locations;
        }
      }

      if (err) {
        return respond(500, { error: err });
      } else {
        return respond(200, body);
      }
    });
  });
});

// ---------------------------------------------------------------------------

app.use('/bower_components', express.static(pathlib.join(__dirname, 'bower_components')));
app.use(express.static(pathlib.join(__dirname, 'static')));
app.use(serveIndex(pathlib.join(__dirname, 'static'), {icons: true}));
app.use(logger('dev'));

const port = process.env.PORT != null ? process.env.PORT : 8080;
app.listen(port, () => console.log(`Listening on http://localhost:${ port }`));

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
