import Head from 'next/head'
import React from 'react'
import fetch from 'isomorphic-unfetch'
import qs from 'qs'
import { ITEMS_PER_PAGE, getOrigin } from '../lib/utils'
import { pluralize } from 'humanize-plus'

class SearchResult extends React.Component {
  render () {
    const r = this.props // See Elasticsearch for how results are returned.
    const highlight = r.highlight && (r.highlight['text'] || r.highlight['text.english'])
    return (
      <div className="result">
        <span className="title">{r._source.title || r._source.path}</span>
        &nbsp;
        <small className="text-muted">{r._source.path}</small>
        <br/>
        <p dangerouslySetInnerHTML={{__html: highlight}}/>
      </div>
    )
  }
}

export default class Index extends React.Component {

  static async getInitialProps ({ req }) {
    let { query, page, sloppy } = req.query
    return { query, page, sloppy }
  }

  constructor (props) {
    super(props)

    const { query, sloppy } = props
    const page = Number(props.page)
    this.state = {
      query,
      page: page && page > 1 ? page : 1,
      sloppy: !!sloppy,
      results: null,
      inProgress: false
    }

    this.handleQueryChange = this.handleQueryChange.bind(this)
    this.handleSloppyChange = this.handleSloppyChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    this.doSearch()
  }

  handleQueryChange (event) {
    this.setState({ query: event.target.value }, () => {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => { this.doSearch() }, 500)
    })
  }

  handleSloppyChange (event) {
    this.setState({ sloppy: event.target.checked }, () => {
      clearTimeout(this.timer)
      this.doSearch()
    })
  }

  handleSubmit (event) {
    event.preventDefault()
    this.setState({ query: this.input.value }, () => {
      clearTimeout(this.timer)
      this.doSearch()
    })
  }

  async doSearch () {
    const { query, page, sloppy } = this.state

    if (query == null) {
      this.setState({ results: null })
      return
    }

    try {
      this.setState({ inProgress: true })
      const queryString = qs.stringify({
        query,
        page: page && page != 1 ? page : undefined,
        sloppy: sloppy ? 1 : undefined
      })
      const response = await fetch(getOrigin() + '/search?' + queryString)
      const results = await response.json()
      this.setState({ results: results })
    } finally {
      this.setState({ inProgress: false })
    }
  }

  render () {
    const { query, page, sloppy, inProgress, results } = this.state
    const totalPages = results && Math.ceil(results.hits.total / ITEMS_PER_PAGE)
    return <div>

      <Head>
        <title>{ query ? `${query} -` : '' } Aspen</title>
        <meta name="robots" content="noindex, nofollow"/>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"/>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"/>
      </Head>

      <style global jsx>{`
        body {
          background: #fafafa;
          color: #111;
          font-family: Georgia, serif;
          font-size: 16px;
        }
        a {
          cursor: pointer;
          color: #00e;
        }
      `}</style>
      <style jsx>{`
        header {
          background: #eee;
          padding: 1em 0;
          margin-bottom: 1em;
        }
        .lead {
          margin-bottom: 0;
        }
        form > * {
          margin-right: 1em;
        }
        input[type=text] {
          width: 55%;
          padding: 5px 7px;
        }
        img { width: 100px; }
      `}</style>

      <header><div className="container">

        <form onSubmit={this.handleSubmit}>
          <a href="/">
            <img src="/static/dodge-aspen.png"/>
            <label htmlFor="query" className="lead hidden-xs">Aspen</label>
          </a>
          <input id="query" type="text" autoFocus
            value={query == null ? '' : query}
            ref={(input) => { this.input = input }}
            onChange={this.handleQueryChange}
          />
          <button className="btn btn-primary">
            <span className="hidden-xs">Search</span>
            <span className="visible-xs fa fa-search fa-reverse"/>
          </button>
          <span className="nowrap">
            <input id="slop" type="checkbox"
              checked={sloppy}
              onChange={this.handleSloppyChange}
            />
            <label htmlFor="slop" className="hidden-xs">Sloppy</label>
            <label htmlFor="slop" className="visible-xs-inline">S</label>
          </span>
        </form>

      </div></header>

      {query && <div className="container">

        {results && results.error && <div className="alert alert-danger">
          Error: {results.error}
        </div>}

        {inProgress && <div className="text-success">
          <span className="fa fa-spin fa-circle-o-notch"/>
        </div>}

        {!inProgress && results && query && <div className="text-success">
          {results.hits.total} {pluralize(results.hits.total, 'result')} found.
          Page {page} of {totalPages}.
          Search took {Number(1000/results.took).toFixed(1)} seconds.
        </div>}

        {!inProgress && !totalPages && query && <div className="text-danger">
          0 results found.
        </div>}

      </div>}

      {query && results && <div className="container results">
        {results.hits.hits.map(r => <SearchResult {...r} key={r._id} />)}
      </div>}

      <div className="container">
        <div className="well">
          <strong>Quick Help</strong><br/>
          "Sloppy" checkbox will search over page breaks but is less accurate.<br/>
          Capitalization doesn't count except for <code>AND</code> and <code>OR</code><br/>
          Must contain "foo" and either "bar" or "quux": <code>foo (bar OR quux)</code><br/>
          Must contain "foo" but not "bar": <code>foo -bar</code><br/>
          Must contain the exact phrase, "the quick brown fox": <code>"the quick brown fox"</code><br/>
          Search for foo but only in a certain folder: <code>path:"SomeFolder/5" foo</code>
        </div>
      </div>

    </div>
  }
}
