import DrillDown from '../components/drill-down.js'
import Head from 'next/head'
import Link from 'next/link'
import Pagination from '../components/pagination.js'
import React from 'react'
import Router from 'next/router'
import SearchBar from '../components/search-bar.js'
import fetch from 'isomorphic-unfetch'
import qs from 'qs'
import { RESULTS_PER_PAGE, getOrigin } from '../lib/utils'
import { pluralize } from 'humanize-plus'

export default class Index extends React.Component {

  static async getInitialProps (props) {
    let { query, page, sloppy } = props.query
    return { query, page, sloppy }
  }

  constructor (props) {
    super(props)

    const { query, sloppy } = props
    const page = (Number(props.page) || 1) - 1 // 'page' query param is 1-indexed
    this.state = {
      query,
      page: page && page > 0 ? page : 0,
      sloppy: !!sloppy,
      results: null,
      inProgress: !!query, // Make sure the shows a spinner instead of "0 results found" on load.
      drillDownResultId: null
    }

    this.handleSearch = this.handleSearch.bind(this)
    this.handleResultClick = this.handleResultClick.bind(this)
    this.handleDrillDownDismiss = this.handleDrillDownDismiss.bind(this)
    this.handlePageSelect = this.handlePageSelect.bind(this)
  }

  componentDidMount () {
    this.doSearch()
  }

  handleSearch (newState) {
    this.setState(newState, () => {
      this.setState({ page: 0 }, () => {
        this.doSearch()
    })})
  }

  handleResultClick (hitId) {
    this.setState({ drillDownResultId: hitId })
  }

  handleDrillDownDismiss () {
    this.setState({ drillDownResultId: null })
  }

  handlePageSelect (newPage) {
    this.setState({ results: null, page: newPage }, () => { this.doSearch() })
  }

  async doSearch () {
    const { query, page, sloppy } = this.state

    if (query == null) {
      this.setState({ results: null })
      return
    }

    try {
      this.setState({ inProgress: true, results: null })
      const queryString = qs.stringify({
        query,
        page: page && page > 0 ? page + 1 : undefined,
        sloppy: sloppy ? 1 : undefined
      })
      Router.push('/?' + queryString)
      const response = await fetch(getOrigin() + '/search?' + queryString)
      const results = await response.json()
      this.setState({ results: results })
    } finally {
      this.setState({ inProgress: false })
    }
  }

  render () {
    const { query, page, sloppy, inProgress, results, drillDownResultId } = this.state
    const totalPages = results && Math.ceil(results.hits.total / RESULTS_PER_PAGE)
    return <div>

      <Head>
        <title>{ query ? `${query} -` : '' } Aspen</title>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css"/>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"/>
        <link rel="shortcut icon" href="/static/favicon.png"/>
      </Head>

      <style global jsx>{`
        body {
          background: #fafafa;
          color: #111;
          font-size: 18px;
        }
        button, .btn, a, label { cursor: pointer }
        label { font-weight: normal }
        mark { background: transparent; color: #dc3545; font-weight: bold }
      `}</style>

      <SearchBar query={query} sloppy={sloppy} onSearch={this.handleSearch}/>

      {query && <div className="container">

        {results && results.error && <div className="alert alert-danger mb-3">
          Error: {results.error}
        </div>}

        {inProgress && <div className="text-secondary mb-3">
          <span className="fa fa-spin fa-circle-o-notch"/>
        </div>}

        {!inProgress && results && results.hits.total > 0 && <div className="text-success mb-3">
          {results.hits.total} {pluralize(results.hits.total, 'result')} found. {' '}
          Page {page + 1} of {totalPages}. {' '}
          Search took {Number(results.took/1000).toFixed(1)} seconds.
        </div>}

        {!inProgress && !totalPages && query && <div className="text-danger mb-3">
          0 results found for query: {query}
        </div>}

      </div>}

      {query && results && <div className="container results mb-3">
        {results.hits.hits.map(hit => <div key={hit._id}>
          <SearchResult hit={hit} onClick={() => { this.handleResultClick(hit._id) }}/>
          {drillDownResultId == hit._id && <DrillDown hit={hit} onDismiss={this.handleDrillDownDismiss}/>}
        </div>)}
      </div>}

      {query && results && totalPages > 1 && <div className="container mb-3 text-center">
        <Pagination currentPage={page} totalPages={totalPages} onSelectPage={this.handlePageSelect}/>
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

class SearchResult extends React.Component {
  render () {
    const { hit } = this.props // See Elasticsearch for how results are returned.
    const highlight = hit.highlight && (hit.highlight['text'] || hit.highlight['text.english'])
    return (
      <div className="result" onClick={this.props.onClick || null}>
        <style jsx>{`
          div { cursor: pointer }
          div:hover strong { text-decoration: underline; color #007bff }
        `}</style>
        <strong>{hit._source.title || hit._source.path}</strong>
        <small className="ml-2 text-secondary">{hit._source.path}</small>
        <br/>
        <p dangerouslySetInnerHTML={{__html: highlight}}/>
      </div>
    )
  }
}

