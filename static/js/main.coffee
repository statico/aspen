# Aspen client app. License: MIT

DATA_BASEURL = '/data'
ITEMS_PER_PAGE = 10 # Sync with app.coffee

throttle = do ->
  timer = null
  return (fn) ->
    clearTimeout timer
    timer = setTimeout fn, 400

angular.module('aspen', ['ngSanitize', 'angularUtils.directives.dirPagination'])

  .controller('SearchController',
    ['$scope', '$http', '$sce', '$window', '$document', '$location', '$rootScope'
      ($scope, $http, $sce, $window, $document, $location, $rootScope) ->

        $rootScope.title = 'Aspen'

        $scope.inProgress = false
        $scope.itemsPerPage = ITEMS_PER_PAGE
        $scope.results = null
        $scope.totalItems = 0
        $scope.currentPage = 1
        $scope.totalPages = 0
        $scope.error = null

        $scope.onSearchKeyDown = ->
          throttle ->
            $scope.currentPage = 1
            $scope.doSearch()

        $scope.onSearchButtonClicked = ->
          $scope.currentPage = 1
          $scope.doSearch()

        $scope.doSearch = ->
          $scope.inProgress = true
          $location.search { q: $scope.query, p: $scope.currentPage }

          $rootScope.title = "#{ $scope.query } - Aspen"

          $http.get('/query', params: { q: $scope.query, page: $scope.currentPage - 1 }).success (data) ->
            $scope.inProgress = false

            if not data.response?.numFound?
              $scope.error = JSON.stringify data, null, '  '
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

        $scope.onLocationChange = ->
          search = $location.search()
          if search.q?
            $scope.query = search.q
            $scope.currentPage = Number(search.p) or 1
            $scope.doSearch()
        $scope.onLocationChange()
        $rootScope.$on '$locationChangeSuccess', $scope.onLocationChange
    ]
  )
