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
          url: scope.$eval attrs.boxDocumentViewer
          zoom: Crocodoc.ZOOM_AUTO
        }
        viewer.load()
        element.on '$destroy', -> viewer.destroy()
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

      server.query $scope.query, $scope.currentPage, (err, data) ->
        updateTitle()
        $scope.inProgress = false
        $location.search
          q: $scope.query
          p: if Number($scope.currentPage) is 1 then null else $scope.currentPage
          f: $scope.filename

        if err
          $scope.error = err
          return

        $scope.error = null
        $scope.results = []
        $scope.totalItems = data.response.numFound
        $scope.totalPages = Math.ceil(data.response.numFound / ITEMS_PER_PAGE)

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

    # File viewing

    $scope.onResultClick = (result) ->
      url = result.url
      server.metadata url, (err, data) ->
        if data?.boxview?
          document.location.href = data.boxview.urls.view
        else
          document.location.href = url

###
    populateViewer = (url) ->
      $scope.filename = url
      $location.search f: url

      $scope.fileIframeURL = null
      $scope.fileBoxViewURL = null

      server.metadata url, (err, data) ->
        if err
          $scope.error = "Couldn't display filename: #{ err }"
          return

        if data.boxview?
          document.location.href = data.boxview.urls.view
          #$scope.fileIframeURL = data.boxview.urls.view
          #$scope.fileBoxViewURL = data.boxview.urls.assets

        #else if (/\.txt$/i).test url
          #$scope.fileIframeURL = url

        else
          document.location.href = '/static/' + url

    populateViewer($scope.filename) if $scope.filename

    $scope.hideViewer = ->
      $scope.filename = null
      $location.search f: null

    $scope.onResultClick = (result) ->
      populateViewer(result.url)

  .config ($sceDelegateProvider) ->
    $sceDelegateProvider.resourceUrlWhitelist(['self', 'https://view-api.box.com/**'])
###
