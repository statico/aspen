# Aspen client app. License: MIT

DATA_BASEURL = '/data'
ITEMS_PER_PAGE = 10 # Sync with app.coffee

angular.module('aspen', ['ngSanitize', 'ngRoute', 'angularUtils.directives.dirPagination'])

  .factory 'utils', ($rootScope) ->
    timer = null
    return {
      setTitle: (title) ->
        $rootScope.title = title
      defer: (fn) ->
        setTimeout fn, 0
      throttle: do ->
        return (delay, fn) ->
          clearTimeout timer
          timer = setTimeout fn, delay
      cancelPendingThrottle: ->
        clearTimeout timer
    }

  .factory 'server', ($http, $rootScope) ->
    return {
      query: (query, page, slop, cb) ->
        slop = if slop then 1 else null
        $http.get('/query', params: { q: query, page: page - 1, slop: slop })
          .success (data) ->
            if not data.response?.numFound?
              cb JSON.stringify data, null, '  '
            cb null, data
          .error (data) ->
            if data?.error
              cb data.error
            else
              cb data
    }

  .directive 'focusIf', (utils) ->
    return {
      restrict: 'A'
      link: (scope, element, attrs) ->
        utils.defer ->
          if scope.$eval attrs.focusIf
            element.focus()
          else
            element.blur()
    }

  .controller 'MainController', (server, utils, $rootScope, $scope, $sce, $location, $window) ->

    $scope.itemsPerPage = ITEMS_PER_PAGE
    $scope.results = null
    $scope.totalItems = 0
    $scope.totalPages = 0
    $scope.inProgress = false
    updateScopeFromLocation = ->
      s = $location.search()
      $scope.query = s.q or ''
      $scope.currentPage = Number(s.p) or 1
      $scope.filename = s.f
      $scope.slop = Boolean(s.slop)
    updateScopeFromLocation()

    updateTitle = ->
      if $scope.filename
        utils.setTitle "#{ $scope.filename } - Aspen"
      else if $scope.query
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
          $scope.filename = null
          $scope.currentPage = 1
          doSearch()

    $scope.onSearchButtonClicked = ->
      utils.cancelPendingThrottle()
      $scope.filename = null
      $scope.currentPage = 1
      doSearch()

    # Pagination interaction

    $scope.$watch 'currentPage', ->
      doSearch()

    # Fetching results

    doSearch = ->
      $scope.inProgress = true

      server.query $scope.query, $scope.currentPage, $scope.slop, (err, data) ->
        updateTitle()
        $scope.inProgress = false
        $location.search
          q: $scope.query
          p: if Number($scope.currentPage) is 1 then null else $scope.currentPage
          f: $scope.filename
          slop: if $scope.slop then 1 else null

        if err
          $scope.error = err
          return

        $scope.error = null
        $scope.results = []
        $scope.totalItems = data.hits.total
        $scope.totalPages = Math.ceil($scope.totalItems / ITEMS_PER_PAGE)

        for obj in data.hits.hits
          highlight = obj.highlight?.text ? obj.highlight?['text.english']
          $scope.results.push {
            id: obj._id
            url: "#{ DATA_BASEURL }/#{ obj._source.path }"
            title: obj._source.title ? obj._source.path
            snippet: $sce.trustAsHtml(highlight?.join ' ... ')
            score: obj._score
          }

        $window.scrollTo 0, 0

    doSearch()
