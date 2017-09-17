import React from 'react'

export default class Pagination extends React.PureComponent {

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
            onClick={() => { this.props.onSelectPage(currentPage - 1); e.preventDefault() }}
          ><span className="fa fa-angle-left"/></a>
        </li>

        {pages.map(i => {
          return <li className={'page-item ' + (i === currentPage ? 'disabled' : '')} key={i}>
            <a href="#" className="page-link"
              tabIndex={i === currentPage ? -1 : null}
              onClick={(e) => { this.props.onSelectPage(i); e.preventDefault() }}
            >{i + 1}</a>
          </li>
        })}

        <li className={'page-item ' + (hasNextPage ? '' : 'disabled')} key="next">
          <a href="#" className="page-link"
            tabIndex={hasNextPage ? null : -1}
            onClick={(e) => { this.props.onSelectPage(currentPage + 1); e.preventDefault() }}
          ><span className="fa fa-angle-right"/></a>
        </li>

      </ul>
    )
  }
}

