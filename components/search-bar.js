import React from 'react'

export default class SearchBar extends React.Component {

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
    // Don't reload the page if this came from an onSubmit.
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
                <a href="/">
                  <h4 className="m-0">
                    <span className="fa fa-leaf text-success"/>
                    <span className="d-none d-md-inline text-dark pt-0 my-0 ml-1">Aspen</span>
                  </h4>
                </a>
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
              <label htmlFor="sloppyCheckbox" className="d-inline d-md-none mr-1">S</label>
            </div>

          </div>
        </form>

      </div>
    </header>

    </div>
  }
}
