import Head from 'next/head'
import React from 'react'
import fetch from 'isomorphic-unfetch'
import getOrigin from '../lib/utils'

export default class Index extends React.Component {

  static async getInitialProps ({ req }) {
    return { query: req.query.q }
  }

  constructor (props) {
    super(props)
    this.state = {
      query: props.query,
      results: null,
      inProgress: false
    }
    this.handleQueryChange = this.handleQueryChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount () {
    this.doSearch()
  }

  handleQueryChange (event) {
    this.setState({ query: event.target.value })
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.doSearch() }, 500)
  }

  handleSubmit (event) {
    this.setState({ query: this.input.value })
    clearTimeout(this.timer)
    this.doSearch()
    event.preventDefault()
  }

  async doSearch () {
    let { query } = this.state
    if (query != null) {
      // XXX need page, sloppy
      this.setState({ inProgress: true })
      let response = await fetch(getOrigin() + '/search?query=' + encodeURIComponent(query))
      let results = await response.json()
      this.setState({ inProgress: false, results: results })
    } else {
      this.setState({ results: null })
    }
  }

  render () {
    let { query, inProgress, results, totalItems, totalPages } = this.state
    return (
      <div>

        <Head>
          <title>Aspen</title>
          <meta name="robots" content="noindex, nofollow"/>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"/>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"/>
        </Head>

        <div className="container">
          <style jsx>{`
          background: #eee;
          padding: 1em 0;
          margin-bottom: 1em;
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
            checked={this.state.sloppy}
            onChange={this.handleSloppyChange}
          />
          <label htmlFor="slop" className="hidden-xs">Sloppy</label>
          <label htmlFor="slop" className="visible-xs-inline">S</label>
        </span>
      </form>

    </div>

    {query && <div>

      {results && results.error && <div className="alert alert-danger">
        Error: {results.error}
      </div>}

      {inProgress && <div className="text-success">
        <span className="fa fa-spin fa-circle-o-notch"/>
      </div>}

      {!inProgress && totalItems && <div className="text-success">
        {results.TotalItems} results found.
        Page {results.currentPage} of {results.totalPages}.
      </div>}

      {!inProgress && !totalPages && <div className="text-danger">
        0 results found.
      </div>}

    </div>}

    {results && results.length && <div className="container results">

      <pre>{JSON.stringify(this.state.results, null, '  ')}</pre>

    </div>}

  </div>
    )
  }
}
