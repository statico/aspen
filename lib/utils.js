exports.ELASTICSEARCH_URL = (process && process.env.ELASTICSEARCH_URL) || 'http://localhost:9200'

exports.RESULTS_PER_PAGE = 10

exports.getOrigin = function getOrigin () {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    return `${protocol}//${hostname}${port ? ':' + port : ''}`
  } else {
    return `http://localhost:${process.env.PORT || 3000}`
  }
}
