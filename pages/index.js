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
        <style>{`
          div { margin-bottom: 1em; }
          .title { font-weight: bold; }
          em {
            color: #b00;
            font-weight: bold;
            font-style: normal;
          }
        `}</style>
        <span className="title">{r._source.title || r._source.path}</span>
        &nbsp;
        <small className="text-muted">{r._source.path}</small>
        <br/>
        <p dangerouslySetInnerHTML={{__html: highlight}}/>
      </div>
    )
  }
}

class SearchBar extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      query: props.query,
      sloppy: !!props.sloppy
    }
    this.handleImmediateChange = this.handleImmediateChange.bind(this)
    this.handleDelayedChange = this.handleDelayedChange.bind(this)
  }

  _handleChange (cb) {
    this.setState({
      query: this.queryInput.value,
      sloppy: !!this.sloppyCheckbox.checked
    }, cb)
  }

  handleImmediateChange () {
    this.props.onSearch(this.state)
  }

  handleDelayedChange () {
    this._handleChange(() => {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => { this.props.onSearch(this.state) }, 500)
    })
  }

  render () {
    const { query, sloppy } = this.state
    return <div>

      <style jsx>{`
        header {
          background: #eee;
          padding: 1em 0;
          margin-bottom: 1em;
        }
        .lead {
          margin-bottom: 0;
        }
        form > *, form > .nowrap > * {
          margin-right: 1em;
        }
        input[type=text] {
          width: 55%;
          padding: 5px 7px;
        }
        img { width: 100px; }
        @media (max-width: 1200px) {
          input[type=text] { width: 30%; }
        }
        @media (max-width: 768px) {
          header { padding: 0.5em 0; }
          input[type=text] { width: 60%; }
          form > * { margin-right: 0.5em; }
          img.logo { width: 2em; }
        }
      `}</style>

      <header><div className="container">

        <form onSubmit={this.handleImmediateChange}>
          <a href="/">
            <img src="/static/dodge-aspen.png"/>
            <label htmlFor="query" className="lead hidden-xs">Aspen</label>
          </a>
          <input id="query" type="text" autoFocus
            value={query == null ? '' : query}
            ref={(el) => { this.queryInput = el }}
            onChange={this.handleDelayedChange}
          />
          <button className="btn btn-primary">
            <span className="hidden-xs">Search</span>
            <span className="visible-xs fa fa-search fa-reverse"/>
          </button>
          <span className="nowrap">
            <input id="slop" type="checkbox"
              checked={sloppy}
              ref={(el) => { this.sloppyCheckbox = el }}
              onChange={this.handleImmediateChange}
            />
            <label htmlFor="slop" className="hidden-xs">Sloppy</label>
            <label htmlFor="slop" className="visible-xs-inline">S</label>
          </span>
        </form>

      </div></header>

    </div>
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

    this.handleSearch = this.handleSearch.bind(this)
  }

  componentDidMount () {
    this.doSearch()
  }

  handleSearch (newState) {
    this.setState(newState, () => { this.doSearch() })
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
          font-size: 18px;
        }
        a {
          cursor: pointer;
          color: #00e;
        }
      `}</style>

      <SearchBar query={query} sloppy={sloppy} onSearch={this.handleSearch}/>

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
