import Head from 'next/head'
import Link from 'next/link'
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
          mark { font-weight: bold }
        `}</style>
        <div><strong>{r._source.title || r._source.path}</strong></div>
        <div><small className="text-secondary">{r._source.path}</small></div>
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

  handleImmediateChange (event) {
    clearTimeout(this.timer)
    this.props.onSearch(this.state)
    if (event.target.tagName.toLowerCase() === 'form') event.preventDefault()
  }

  handleDelayedChange (event) {
    this._handleChange(() => {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => { this.props.onSearch(this.state) }, 500)
    })
  }

  render () {
    const { query, sloppy } = this.state
    return <div>

      <header className="py-3 mb-3" style={{background: '#eee'}}>
        <div className="container">

          <form onSubmit={this.handleImmediateChange}>
            <div className="row justify-content-between align-items-center">

              <div className="col-auto">
                <Link><a href="/">
                  <img src="/static/dodge-aspen.png" style={{width: 100}}/>
                </a></Link>
              </div>

              <div className="col-auto pl-0 d-none d-md-inline">
                <Link><a href="/" className="text-dark">
                  <h4 className="pt-0 m-0">Aspen</h4>
                </a></Link>
              </div>

              <input className="col px-2"
                id="queryInput" type="text" autoFocus
                value={query == null ? '' : query}
                ref={(el) => { this.queryInput = el }}
                onChange={this.handleDelayedChange}
              />

            <div className="col-auto">
              <button className="btn btn-primary">
                <span className="d-none d-md-inline mr-1">Search</span>
                <span className="d-sm-inline d-md-none fa fa-search fa-reverse"/>
              </button>
            </div>

            <div className="col-auto pl-0">
              <input className="mr-1"
                id="sloppyCheckbox" type="checkbox"
                checked={sloppy}
                ref={(el) => { this.sloppyCheckbox = el }}
                onChange={this.handleImmediateChange}
              />
              <label htmlFor="sloppyCheckbox" className="d-none d-md-inline">Sloppy</label>
              <label htmlFor="sloppyCheckbox" className="d-inline d-md-none">S</label>
            </div>

          </div>
        </form>

      </div>
    </header>

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
        a { cursor: pointer }
        label { font-weight: normal; cursor: pointer }
      `}</style>
      <style jsx>{`
        section { margin-bottom: 1rem }
      `}</style>

      <SearchBar query={query} sloppy={sloppy} onSearch={this.handleSearch}/>

      {query && <div className="container">

        {results && results.error && <section className="alert alert-danger">
          Error: {results.error}
        </section>}

        {inProgress && <section className="text-secondary">
          <span className="fa fa-spin fa-circle-o-notch"/>
        </section>}

        {!inProgress && results && results.hits.total > 0 && <section className="text-success">
          {results.hits.total} {pluralize(results.hits.total, 'result')} found. {' '}
          Page {page} of {totalPages}. {' '}
          Search took {Number(results.took/1000).toFixed(1)} seconds.
        </section>}

        {!inProgress && !totalPages && query && <section className="text-danger">
          0 results found for query: {query}
        </section>}

      </div>}

      {query && results && <div className="container results">
        {results.hits.hits.map(r => <SearchResult {...r} key={r._id} />)}
      </div>}

      {<div className="container"><div className="card"><div className="card-body">
        <strong>Quick Help</strong><br/>
        "Sloppy" checkbox will search over page breaks but is less accurate.<br/>
        Capitalization doesn't count except for <code>AND</code> and <code>OR</code><br/>
        Must contain "foo" and either "bar" or "quux": <code>foo (bar OR quux)</code><br/>
        Must contain "foo" but not "bar": <code>foo -bar</code><br/>
        Must contain the exact phrase, "the quick brown fox": <code>"the quick brown fox"</code><br/>
        Search for foo but only in a certain folder: <code>path:"SomeFolder/5" foo</code>
      </div></div></div>}

    </div>
  }
}
