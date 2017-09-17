import Head from 'next/head'
import Link from 'next/link'
import React from 'react'
import fetch from 'isomorphic-unfetch'
import qs from 'qs'
import { ITEMS_PER_PAGE, getOrigin } from '../lib/utils'
import { pluralize } from 'humanize-plus'

class DrillDownOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.state = {}
    this.loadContent()
  }

  url () {
    return getOrigin() + '/static/data/' + this.props.hit._source.path
  }

  async loadContent () {
    const res = await fetch(this.url())
    const content = await res.text()
    console.log('XXX', content)
    this.setState({ content })
  }

  render () {
    const { hit } = this.props
    const { content } = this.state
    return (
      <div className="modal fade show d-block" role="dialog" onClick={this.props.onDismiss}>
        <style jsx>{`
          .modal { background: rgba(0,0,0,.5) }
          .modal-content, .modal-body { max-height: 90vh }
          .modal-body { overflow-y: scroll }
        `}</style>
        <div className="modal-dialog modal-lg" role="document" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title mr-auto">{hit._source.path}</h5>
              <a className="btn btn-light ml-3" href={this.url()} onClick={this.props.onDismiss}>
                <span className="fa fa-external-link"></span>
                <span className="d-none d-md-inline ml-2">Open</span>
              </a>
              <button className="btn btn-light ml-3" onClick={this.props.onDismiss}>
                <span className="fa fa-close"></span>
                <span className="d-none d-md-inline ml-2">Close</span>
              </button>
            </div>
            {content && <div className="modal-body">
              <pre>{content}</pre>
            </div>}
          </div>
        </div>
      </div>
    )
  }

}

class SearchResult extends React.Component {
  render () {
    const { hit } = this.props // See Elasticsearch for how results are returned.
    const highlight = hit.highlight && (hit.highlight['text'] || hit.highlight['text.english'])
    return (
      <div className="result" onClick={this.props.onClick || null}>
        <style jsx>{`
          div { cursor: pointer }
          div:hover strong { text-decoration: underline; color #007bff }
          mark { background: transparent; color: #b00; font-weight: bold }
        `}</style>
        <strong>{hit._source.title || hit._source.path}</strong>
        <small className="ml-2 text-secondary">{hit._source.path}</small>
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
      inProgress: false,
      drillDownResultId: null
    }

    this.handleSearch = this.handleSearch.bind(this)
    this.handleResultClick = this.handleResultClick.bind(this)
    this.handleDrillDownDismiss = this.handleDrillDownDismiss.bind(this)
  }

  componentDidMount () {
    this.doSearch()
  }

  handleSearch (newState) {
    this.setState(newState, () => { this.doSearch() })
  }

  handleResultClick (hitId) {
    this.setState({ drillDownResultId: hitId })
  }

  handleDrillDownDismiss () {
    this.setState({ drillDownResultId: null })
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
    const { query, page, sloppy, inProgress, results, drillDownResultId } = this.state
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
        button, a, label { cursor: pointer }
        label { font-weight: normal }
      `}</style>
      <style>{`
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
        {results.hits.hits.map(hit => <div key={hit._id}>
          <SearchResult hit={hit} onClick={() => { this.handleResultClick(hit._id) }}/>
          {drillDownResultId == hit._id && <DrillDownOverlay hit={hit} onDismiss={this.handleDrillDownDismiss}/>}
        </div>)}
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
