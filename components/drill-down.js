import React from 'react'
import { getOrigin } from '../lib/utils'

export default class DrillDownOverlay extends React.Component {

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
              <a className="btn btn-secondary d-none d-md-inline ml-3" href={this.url} onClick={this.props.onDismiss} target="_new">
                <span className="fa fa-external-link"></span>
                <span className="d-none d-lg-inline ml-2">View File</span>
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

