/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const pathlib = require('path');
const request = require('request');
const crypto = require('crypto');

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

// Syntactic sugar for below.
const _doRequest = (cb, options) =>
  request(options, function(err, res, body) {
    if (err) { return cb(err); }
    if (200 <= res.statusCode && res.statusCode < 300) {
      return cb(err, res, body);
    } else {
      return cb(`Error ${ res.statusCode }: ${ JSON.stringify(body) }`);
    }
  })
;

const esReset = (exports.esReset = cb =>
  request({
    url: `${ ELASTICSEARCH_URL }/aspen`,
    method: 'delete',
    json: true
  }, function(err, res, body) {
    console.log('Results from DELETE:', body);
    return _doRequest(cb, {
      url: `${ ELASTICSEARCH_URL }/aspen`,
      method: 'post',
      json: true,
      body: {
        mappings: {
          file: {
            properties: {
              title: {
                type: 'string'
              },
              path: {
                type: 'string'
              },
              text: {
                type: 'string',
                term_vector: 'with_positions_offsets_payloads',
                fields: {
                  english: {
                    type: 'string',
                    analyzer: 'english_nostop',
                    term_vector: 'with_positions_offsets_payloads',
                    store: true
                  }
                }
              }
            }
          }
        },
        settings: {
          analysis: {
            filter: {
              english_stemmer: {
                type: 'stemmer',
                language: 'english'
              },
              english_possessive_stemmer: {
                type: 'stemmer',
                language: 'possessive_english'
              }
            },
            analyzer: {
              english_nostop: {
                tokenizer: 'standard',
                filter: ['english_possessive_stemmer', 'lowercase',  'english_stemmer']
              }
            }
          }
        }
      }
    });
})
);

const esUpload = (exports.esUpload = function(basedir, fullpath, title, cb) {
  const relpath = pathlib.relative(basedir, fullpath);
  const id = crypto.createHash('md5').update(relpath).digest('hex');
  return _doRequest(cb, {
    url: `${ ELASTICSEARCH_URL }/aspen/file/${ id }`,
    method: 'post',
    json: true,
    body: {
      path: relpath,
      title,
      text: fs.readFileSync(fullpath, 'utf8')
    }
  }
  );
});

const esQuery = (exports.esQuery = (query, cb) =>
  _doRequest(cb, {
    url: `${ ELASTICSEARCH_URL }/aspen/file/_search`,
    method: 'post',
    json: true,
    body: query
  }
  )
);

