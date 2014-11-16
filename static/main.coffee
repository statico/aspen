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

  .controller 'MainController', (server, utils, $rootScope, $scope, $sce, $location, $window) ->

    $scope.itemsPerPage = ITEMS_PER_PAGE
    $scope.results = null
    $scope.totalItems = 0
    $scope.totalPages = 0
    $scope.inProgress = false

    updateScopeFromLocation = ->
      $scope.query = $location.search().q or ''
      $scope.currentPage = Number($location.search().p) or 1
    updateScopeFromLocation()

    updateTitle = ->
      if $scope.query
        utils.setTitle "#{ $scope.query } - Aspen"
      else
        utils.setTitle 'Aspen'
    updateTitle()

    # URL interaction

    oldState = null
    $rootScope.$on '$locationChangeSuccess', ->
      newState = JSON.stringify $location.search()
      if newState != oldState
        updateScopeFromLocation()
        doSearch()
        oldState = newState

    # Search field interaction

    $scope.onSearchKeyDown = ->
      utils.throttle 400, ->
        $scope.$apply ->
          $scope.currentPage = 1
          doSearch()

    $scope.onSearchButtonClicked = ->
      utils.cancelPendingThrottle()
      $scope.currentPage = 1
      doSearch()

    # Pagination interaction

    $scope.$watch 'currentPage', ->
      doSearch()

    # Fetching results

    doSearch = ->
      $scope.inProgress = true

      server.query $scope.query, $scope.currentPage, (err, data) ->
        updateTitle()
        $scope.inProgress = false
        $location.search
          q: $scope.query
          p: if Number($scope.currentPage) is 1 then null else $scope.currentPage
          f: null

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

    doSearch()

  #.controller 'DocumentViewerController', (server, $scope, $routeParams) ->
    #$scope.query = decodeURIComponent $routeParams.query
    #$scope.url = decodeURIComponent $routeParams.url
    #$scope.ready = false

    #server.metadata $scope.url, (err, data) ->
      #$scope.ready = true
      #$scope.error = err
      #$scope.metadata = data

