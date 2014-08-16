DATA_BASEURL = '/data'

angular.module('aspen', ['ngSanitize'])

  .controller('SearchController',
    ['$scope', '$http', '$sce', '$document', '$location', '$rootScope'
      ($scope, $http, $sce, $document, $location, $rootScope) ->

        throttle = do ->
          timer = null
          return (fn) ->
            clearTimeout timer
            timer = setTimeout fn, 400

        $scope.onSearchKeyDown = ->
          throttle $scope.doSearch

        $scope.doSearch = ->
          $location.path $scope.query
          $rootScope.title = "#{ $scope.query } - Aspen"
          $http.get('/query', params: q: $scope.query).success (data) ->
            $scope.results =
              count: data.response.numFound
              items: []
            for obj in data.response.docs
              {id, url, title} = obj
              $scope.results.items.push {
                id: id
                url: "#{ DATA_BASEURL }/#{ url }"
                title: title?[0] ? url
                snippet: $sce.trustAsHtml(data.highlighting[id].text?.join ' ... ')
              }

        $scope.onLocationChange = ->
          if $scope.query = $location.path().substr 1
            $scope.doSearch()

        $scope.onLocationChange()
        $rootScope.$on '$locationChangeSuccess', $scope.onLocationChange

        $rootScope.title = 'Aspen'
    ]
  )
