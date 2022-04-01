import React from "react"

class PageItem extends React.PureComponent {
  render() {
    const { enabled, page, onSelectPage, icon, text } = this.props
    return (
      <li className={"page-item " + (enabled ? "" : "disabled")}>
        <a
          href="#"
          className="page-link"
          tabIndex={enabled ? null : -1}
          onClick={(e) => {
            this.props.onSelectPage(page)
            e.preventDefault()
          }}
        >
          {icon && <span className={"fa fa-" + icon} />}
          {text && text}
        </a>
      </li>
    )
  }
}

export default class Pagination extends React.PureComponent {
  render() {
    const { currentPage, totalPages, onSelectPage } = this.props

    // Since the pagination can get unweildly with, say, 100 pages, only show 10 or so buttons with
    // the currently selected page in the middle.
    const [firstPage, lastPage] =
      currentPage < 5
        ? [0, Math.min(totalPages, 9)]
        : currentPage > totalPages - 6
        ? [Math.max(0, totalPages - 10), totalPages]
        : [currentPage - 5, currentPage + 5]

    const pages = Array.from(
      new Array(lastPage - firstPage),
      (v, i) => firstPage + i
    )

    return (
      <ul className="pagination justify-content-center">
        <PageItem
          onSelectPage={onSelectPage}
          icon="angle-left"
          enabled={currentPage > 0}
          page={currentPage - 1}
        />
        {pages.map((i) => {
          return (
            <PageItem
              onSelectPage={onSelectPage}
              key={i}
              text={i + 1}
              enabled={i !== currentPage}
              page={i}
            />
          )
        })}
        <PageItem
          onSelectPage={onSelectPage}
          icon="angle-right"
          enabled={currentPage < totalPages - 1}
          page={currentPage + 1}
        />
      </ul>
    )
  }
}
