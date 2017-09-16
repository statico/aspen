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
          .title { font-weight: bold }
          em { color: #b00; font-weight: bold; font-style: normal }
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
        header { background: #eee; padding: 1rem 0; margin-bottom: 1rem }
        .lead { margin-bottom: 0 }
        .item { margin-right: 1rem }
        input[type=text] { width: 55%; padding: 5px 7px }
        img { width: 100px }
        .nowrap { white-space: nowrap }
        label { font-weight: normal; cursor: pointer }
        @media (max-width: 1200px) {
          input[type=text] { width: 30% }
        }
        @media (max-width: 768px) {
          header { padding: 0.5rem 0 }
          input[type=text] { width: 60% }
          .item { margin-right: 0.5rem }
          img.logo { width: 2rem }
        }
      `}</style>

      <header><div className="container">

        <form onSubmit={this.handleImmediateChange}>
          <a href="/">
            <img src="/static/dodge-aspen.png" className="item"/>
            <label htmlFor="query" className="item lead hidden-xs">Aspen</label>
          </a>
          <input id="query" type="text" autoFocus className="item"
            value={query == null ? '' : query}
            ref={(el) => { this.queryInput = el }}
            onChange={this.handleDelayedChange}
          />
          <button className="item btn btn-primary">
            <span className="hidden-xs">Search</span>
            <span className="visible-xs fa fa-search fa-reverse"/>
          </button>
          <span className="nowrap">
            <input id="slop" type="checkbox"
              checked={sloppy}
              ref={(el) => { this.sloppyCheckbox = el }}
              onChange={this.handleImmediateChange}
            />
            &nbsp;
            <label htmlFor="slop" className="item hidden-xs">Sloppy</label>
            <label htmlFor="slop" className="item visible-xs-inline">S</label>
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
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css"/>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"/>
      </Head>

      <style global jsx>{`
        body {
          background: #fafafa;
          color: #111;
          font-family: Georgia, serif;
          font-size: 18px;
        }
        a { cursor: pointer; color: #00e;
        }
      `}</style>
      <style jsx>{`
        section { margin-bottom: 1rem }
      `}</style>

      <SearchBar query={query} sloppy={sloppy} onSearch={this.handleSearch}/>

      {query && <div className="container">

        {results && results.error && <section className="alert alert-danger">
          Error: {results.error}
        </section>}

        {inProgress && <section className="text-muted text-center">
          <span className="fa fa-spin fa-circle-o-notch"/>
        </section>}

        {!inProgress && results && results.hits.total > 0 && <section className="text-success">
          {results.hits.total} {pluralize(results.hits.total, 'result')} found.
          Page {page} of {totalPages}.
          Search took {Number(results.took/1000).toFixed(1)} seconds.
        </section>}

        {!inProgress && !totalPages && query && <section className="text-danger">
          0 results found.
          {results && results.took && <span>
            Search took {Number(results.took/1000).toFixed(1)} seconds.
          </span>}
        </section>}

      </div>}

      {query && results && <div className="container results">
        {results.hits.hits.map(r => <SearchResult {...r} key={r._id} />)}
      </div>}

      {!inProgress && <div className="container"><div className="card"><div className="card-body">
          <h4 className="card-title">Quick Help</h4>
          <div className="card-text">
          "Sloppy" checkbox will search over page breaks but is less accurate.<br/>
          Capitalization doesn't count except for <code>AND</code> and <code>OR</code><br/>
          Must contain "foo" and either "bar" or "quux": <code>foo (bar OR quux)</code><br/>
          Must contain "foo" but not "bar": <code>foo -bar</code><br/>
          Must contain the exact phrase, "the quick brown fox": <code>"the quick brown fox"</code><br/>
          Search for foo but only in a certain folder: <code>path:"SomeFolder/5" foo</code>
          </div>
      </div></div></div>}

    </div>
  }
}
