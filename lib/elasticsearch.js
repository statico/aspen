const crypto = require('crypto')
const fetch = require('isomorphic-unfetch')
const fs = require('fs')
const { ELASTICSEARCH_URL, ITEMS_PER_PAGE } = require('./utils')
const { relative } = require('path')

async function request (path, method, body) {
  let url = ELASTICSEARCH_URL + path
  let headers = body ? { 'Content-Type': 'application/json' } : null
  let response = await fetch(url, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null
  })
  return await response.json()
}

exports.reset = async function reset () {
  let res = await request('/aspen', 'DELETE')
  console.log('Results from DELETE:', res)

  // These are all settings I created using trial and error to find the right way to store and index
  // plaintext English documents with title metadata and search result highlighting information.
  await request('/aspen', 'POST', {
    mappings: {
      file: {
        properties: {
          title: { type: 'string' },
          path: { type: 'string' },
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
            filter: ['english_possessive_stemmer', 'lowercase', 'english_stemmer']
          }
        }
      }
    }
  })
}

exports.upload = async function upload (basedir, fullpath, title) {
  const relpath = relative(basedir, fullpath)
  const id = crypto.createHash('md5').update(relpath).digest('hex')
  await request(`/aspen/file/${id}`, 'POST', {
    path: relpath,
    text: fs.readFileSync(fullpath, 'utf8'),
    title
  })
}

function buildQueryObject (query, page, sloppy, needMetadata) {
  // The main query.
  const must = {
    query_string: {
      query,
      default_operator: 'and',
      fields: ['text.english'],
      analyzer: 'english_nostop',
      lenient: true,
      phrase_slop: sloppy ? 50 : 0
    }
  }

  // An optional query we use to boost results and highlighting.
  const should = {
    match_phrase: {
      message: {
        query,
        boost: 10,
        lenient: true
      }
    }
  }

  const highlight = {
    type: 'plain',
    fragment_size: 500,
    number_of_fragments: needMetadata ? 0 : 3,
    highlight_query: {
      bool: {
        minimum_should_match: 0,
        must,
        should
      }
    }
  }

  const obj = {
    _source: ['title', 'path'],
    size: ITEMS_PER_PAGE,
    from: Math.max(ITEMS_PER_PAGE * (Number(page) || 0), 0),
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
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        'text.english': highlight,
        text: highlight
      }
    }
  }

  if (needMetadata) {
    obj.highlight.pre_tags = ['__HLS__'] // Highlight start
    obj.highlight.post_tags = ['__HLE__'] // Highlight end
  }

  return obj
}

exports.search = async function search (query, page, sloppy) {
  // Stupify smart quotes which sometimes get pasted in.
  query = query.replace(/“|”/g, '"').replace(/‘|’/g, "'")

  // Escape backslashes. Nobody is going to use regex searching; it's more useful to be able to
  // search the path: field easily.
  query = query.replace(/\//g, '\\/')

  // Run the query twice. Get full highlight data first (but that's huge, so don't send it to the
  // user), then use that data to annotate the data the client gets. Basically, this:
  // http://stackoverflow.com/q/15072806/102704 and http://stackoverflow.com/q/4512656/102704
  //
  // First pass: get highlight information.
  let meta = await request('/aspen/file/_search', 'POST', buildQueryObject(query, page, sloppy, true))

  // Second pass: what we annotate and send to the client.
  let body = await request('/aspen/file/_search', 'POST', buildQueryObject(query, page, sloppy, false))

  // Add query time to the total.
  body.took += meta.took

  // Annotate with highlight marker information.
  if (body.hits && body.hits.hits && body.hits.hits.length) {
    for (let index = 0; index < body.hits.hits.length; index++) {
      const hit = body.hits.hits[index]
      const locations = [] // Tuples of [start, stop] locations for each matches.
      const metahit = meta.hits.hits[index]

      let h = metahit.highlight
      let content = (h['text.english'] && h['text.english'][0] != null &&
        h['text'] && h['text'][0] != null) ? h['text'][0] : null
      if (!content) {
        console.error(`Can't get meta content for hit ${index} of query: ${query}`)
        continue
      }

      // Highlighter only highlights one term at a time, so compact phrase matches.
      content = content.replace(/__HLE__\s+__HLS__/g, ' ')

      // Markers are 7 characters long. That's easy to remember.
      // o = pointer to original text document
      // c = pointer to content with __HLE__ and __HLS__ markers
      // os, oe = start and end of original highlight location
      // cs, ce = start and end of highlighted location
      let o = 0
      let c = 0
      while (true) {
        const cs = content.indexOf('__HLS__', c)
        if (cs === -1) { break }
        const ce = content.indexOf('__HLE__', cs)
        const os = cs - (locations.length * 14)
        const oe = ce - (locations.length * 14) - 7
        locations.push([os, oe])
        o = oe
        c = ce
      }

      hit.highlight_locations = locations
    }
  }

  return body
}
