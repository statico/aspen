import React from 'react'
import request from 'superagent'
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
    const response = await request(this.url).withCredentials()
    const content = response.text

    // Surround each highlight with <mark> tags, and also escape any existing markup (even though
    // there shouldn't be any)
    let markup = ''
    let last = 0
    for (let [start, end] of this.props.hit.highlight_locations) {
      markup += content.substring(last, start) + '__STARTSPAN__' + content.substring(start, end) + '__ENDSPAN__'
      last = end
    }
    markup += content.substring(last)
    markup = markup
      .replace(/</g, '&lt;')
      .replace(/__STARTSPAN__/g, '<mark>')
      .replace(/__ENDSPAN__/g, '</mark>')

    // Markdown-style paragraphs
    markup = markup.replace(/\n\n+/g, '<br/><br/>')

    this.setState({ contentWithMarkup: markup }, () => {
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
      const container = this.contentViewer.parentElement
      const mark = this.contentViewer.getElementsByTagName('mark')[newLocation]
      if (!mark) {
        console.warn(`Tried to scroll to mark ${newLocation} but it was null`)
        return
      }
      container.scrollTop = mark.offsetTop - 100
    })
  }

  render () {
    const { hit } = this.props
    const { contentWithMarkup } = this.state
    const directoryUrl = this.url.substring(0, this.url.lastIndexOf('/') + 1)
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
                <span className="fa fa-file"></span>
                <span className="d-none d-lg-inline ml-2">View File</span>
              </a>
              <a className="btn btn-secondary d-none d-md-inline ml-3" href={directoryUrl} onClick={this.props.onDismiss} target="_new">
                <span className="fa fa-folder-open"></span>
                <span className="d-none d-lg-inline ml-2">Open Folder</span>
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
                  <span className="ml-2">Previous</span>
                </button>
                <button className="btn btn-secondary"
                    disabled={!this.canGoToNextLocation()}
                    onClick={this.goToNextLocation}
                    >
                  <span className="mr-2">Next</span>
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
              <div
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

