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
    this.state = {
      content: null,
      contentWithMarkup: null,
      currentLocation: 0
    }
    this.canGoToPreviousLocation = this.canGoToPreviousLocation.bind(this)
    this.canGoToNextLocation = this.canGoToNextLocation.bind(this)
    this.goToNextLocation = this.goToNextLocation.bind(this)
    this.goToPreviousLocation = this.goToPreviousLocation.bind(this)
  }

  get url () {
    return getOrigin() + '/static/data/' + this.props.hit._source.path
  }

  async componentDidMount () {
    const res = await fetch(this.url)
    const content = await res.text()
    this.setState({ content }, () => {
      this.setLocation(0)
    })
  }

  canGoToNextLocation () {
    return this.state.currentLocation < this.props.hit.highlight_locations.length - 1
  }
  canGoToPreviousLocation () {
    return this.state.currentLocation > 0
  }
  goToNextLocation () {
    if (this.canGoToNextLocation()) this.setLocation(this.state.currentLocation + 1)
  }
  goToPreviousLocation () {
    if (this.canGoToPreviousLocation()) this.setLocation(this.state.currentLocation - 1)
  }

  setLocation (newLocation) {
    this.setState({ currentLocation: newLocation }, () => {
      const tuple = this.props.hit.highlight_locations[this.state.currentLocation]
      if (tuple == null) return
      const [start, end] = tuple

      let content = this.state.content
      content = content.substring(0, start) + '__STARTSPAN__' +
        content.substring(start, end) + '__ENDSPAN__' +
        content.substring(end)
      content = content
        .replace(/</g, '&lt;')
        .replace('__STARTSPAN__', '<mark>')
        .replace('__ENDSPAN__', '</mark>')

      this.setState({ contentWithMarkup: content }, () => {
        const container = this.contentViewer.parentElement
        const mark = this.contentViewer.getElementsByTagName('mark')[0]
        container.scrollTop = mark.offsetTop - 100
      })
    })
  }

  render () {
    const { hit } = this.props
    const { contentWithMarkup } = this.state
    return (
      <div className="modal fade show d-block" role="dialog" onClick={this.props.onDismiss}>
        <style jsx>{`
          .modal { background: rgba(0,0,0,.5) }
          .modal-content, .modal-body { max-height: 90vh }
          .modal-body { overflow-y: scroll; overflow-x: auto }
          @media (min-width: 768px) {
            .modal-dialog { width: 90%; max-width:1200px }
          }
        `}</style>
        <div className="modal-dialog" role="document" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title mr-auto">{hit._source.path}</h5>
              <a className="btn btn-secondary d-none d-md-inline ml-3" href={this.url} onClick={this.props.onDismiss}>
                <span className="fa fa-external-link"></span>
                <span className="d-none d-lg-inline ml-2">Open</span>
              </a>
              <button className="btn btn-secondary ml-3" onClick={this.props.onDismiss}>
                <span className="fa fa-close"></span>
                <span className="d-none d-lg-inline ml-2">Close</span>
              </button>
            </div>
            <div className="modal-header justify-content-start">
              <div className="btn-group">
                <button className="btn btn-secondary"
                    disabled={!this.canGoToPreviousLocation()}
                    onClick={this.goToPreviousLocation}
                    >
                  <span className="fa fa-angle-left"></span>
                  <span className="d-none d-lg-inline ml-2">Previous</span>
                </button>
                <button className="btn btn-secondary"
                    disabled={!this.canGoToNextLocation()}
                    onClick={this.goToNextLocation}
                    >
                  <span className="d-none d-lg-inline mr-2">Next</span>
                  <span className="fa fa-angle-right"></span>
                </button>
              </div>
              <span className="ml-2">
                Match {this.state.currentLocation + 1} {' '}
                of {this.props.hit.highlight_locations.length}
              </span>
            </div>
            {!contentWithMarkup && <div className="modal-body text-center m-3">
              <span className="fa fa-spin fa-circle-o-notch"/>
            </div>}
            {contentWithMarkup && <div className="modal-body">
              <pre
                ref={(el) => { this.contentViewer = el }}
                dangerouslySetInnerHTML={{__html: contentWithMarkup}}
              />
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

class Pagination extends React.PureComponent {

  render () {
    const { currentPage, totalPages } = this.props
    const hasPreviousPage = currentPage > 0
    const hasNextPage = currentPage < totalPages - 1

    // Since the pagination can get unweildly with, say, 100 pages, only show 10 or so buttons.
    const [firstPage, lastPage] =
      (currentPage < 5) ? [0, Math.min(totalPages, 9)] :
      (currentPage > (totalPages - 6)) ? [Math.max(0, totalPages - 10), totalPages] :
      [currentPage - 5, currentPage + 5]
    const pages = Array.from(new Array(lastPage - firstPage), (v, i) => firstPage + i)

    return (
      <ul className="pagination justify-content-center">

        <li className={'page-item ' + (hasPreviousPage ? '' : 'disabled')} key="previous">
          <a href="#" className="page-link"
            tabIndex={hasPreviousPage ? null : -1}
            onClick={() => { this.props.onSelectPage(currentPage - 1); e.stopPropagation() }}
          ><span className="fa fa-angle-left"/></a>
        </li>

        {pages.map(i => {
          return <li className={'page-item ' + (i === currentPage ? 'disabled' : '')} key={i}>
            <a href="#" className="page-link"
              tabIndex={i === currentPage ? -1 : null}
              onClick={(e) => { this.props.onSelectPage(i) }}
            >{i + 1}</a>
          </li>
        })}

        <li className={'page-item ' + (hasNextPage ? '' : 'disabled')} key="next">
          <a href="#" className="page-link"
            tabIndex={hasNextPage ? null : -1}
            onClick={(e) => { this.props.onSelectPage(currentPage + 1); e.stopPropagation() }}
          ><span className="fa fa-angle-right"/></a>
        </li>

      </ul>
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
      page: page && page > 0 ? page : 0,
      sloppy: !!sloppy,
      results: null,
      inProgress: false,
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
      this.setState({ inProgress: true })
      const queryString = qs.stringify({
        query,
        page: page && page !== 0 ? page : undefined,
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
          {drillDownResultId == hit._id && <DrillDownOverlay hit={hit} onDismiss={this.handleDrillDownDismiss}/>}
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
