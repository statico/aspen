# Aspen client app. License: MIT

DATA_BASEURL = '/data'
ITEMS_PER_PAGE = 10 # Sync with app.coffee

angular.module('aspen', ['ngSanitize', 'ngRoute', 'angularUtils.directives.dirPagination'])

  .factory 'utils', ($rootScope) ->
    timer = null
    return {
      setTitle: (title) ->
        $rootScope.title = title
      throttle: do ->
        return (delay, fn) ->
          clearTimeout timer
          timer = setTimeout fn, delay
      cancelPendingThrottle: ->
        clearTimeout timer
    }

  .factory 'server', ($http, $rootScope) ->
    return {

      query: (query, page, cb) ->
        $http.get('/query', params: { q: query, page: page - 1 })
          .success (data) ->
            if not data.response?.numFound?
              cb JSON.stringify data, null, '  '
            cb null, data

      metadata: (path, cb) ->
        $http.get('/metadata', params: { path: path })
          .success((data) ->
            cb null, data
          )
    }

  .directive 'boxDocumentViewer', ->
    return {
      restrict: 'A'
      link: (scope, element, attrs) ->
        viewer = Crocodoc.createViewer element, {
          url: attrs.boxDocumentViewer
          zoom: Crocodoc.ZOOM_AUTO
        }
        viewer.load()
        element.on '$destroy', -> viewer.destroy()
    }

  .controller 'InputController', (utils, $scope, $rootScope, $routeParams) ->

    $scope.query = ''

    $rootScope.$on '$routeChangeSuccess', ->
      $scope.query = $routeParams.query

    $scope.onSearchKeyDown = ->
      utils.throttle 400, ->
        $scope.$apply ->
          $rootScope.$broadcast 'queryUpdated', $scope.query

    $scope.onSearchButtonClicked = ->
      utils.cancelPendingThrottle()
      $rootScope.$broadcast 'queryUpdated', $scope.query

  .controller 'SearchResultsController', (server, utils, $scope, $sce, $routeParams, $window, $rootScope) ->

    $scope.itemsPerPage = ITEMS_PER_PAGE
    $scope.results = null
    $scope.totalItems = 0
    $scope.totalPages = 0
    $scope.error = null
    $scope.query = $routeParams.query
    $scope.currentPage = Number($routeParams.page) or 1

    utils.setTitle "#{ $scope.query } - Aspen"

    $scope.$watch 'currentPage', ->
      $rootScope.$broadcast 'queryUpdated', $scope.query, $scope.currentPage

    $scope.onResultClick = (result) ->
      $rootScope.$broadcast 'documentRequested', $scope.query, result.url

    server.query $scope.query, $scope.currentPage, (err, data) ->
      if err
        $scope.error = err
        return

      $scope.error = null
      $scope.results = []
      $scope.totalItems = data.response.numFound
      $scope.totalPages = Math.floor(data.response.numFound / ITEMS_PER_PAGE)

      for obj in data.response.docs
        {id, url, title} = obj
        $scope.results.push {
          id: id
          url: "#{ DATA_BASEURL }/#{ url }"
          title: title?[0] ? url
          snippet: $sce.trustAsHtml(data.highlighting[id].text?.join ' ... ')
        }

      $window.scrollTo 0, 0

  .controller 'DocumentViewerController', (server, $scope, $routeParams) ->
    $scope.query = decodeURIComponent $routeParams.query
    $scope.url = decodeURIComponent $routeParams.url
    $scope.ready = false

    server.metadata $scope.url, (err, data) ->
      $scope.ready = true
      $scope.error = err
      $scope.metadata = data

  .config ($routeProvider, $locationProvider) ->

    $routeProvider
      .when('/', {
        templateUrl: 'blank.html'
      })
      .when('/search/:query/:page?', {
        templateUrl: 'results.html'
        controller: 'SearchResultsController'
      })
      .when('/view/:query/:url', {
        templateUrl: 'view.html'
        controller: 'DocumentViewerController'
      })
      .otherwise({
        redirectTo: '/'
      })

  .run (utils, $rootScope, $location) ->
    utils.setTitle 'Aspen'

    $rootScope.$on 'queryUpdated', (_, query, page=1) ->
      if Number(page) is 1
        $location.path "/search/#{ query }"
      else
        $location.path "/search/#{ query }/#{ page }"

    $rootScope.$on 'documentRequested', (_, query, url) ->
      $location.path "/view/#{ encodeURIComponent query }/#{ encodeURIComponent url }"
