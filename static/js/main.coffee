DATA_BASEURL = '/data'

angular.module('aspen', ['ngSanitize'])

  .controller('SearchController',
    ['$scope', '$http', '$sce',
      ($scope, $http, $sce) ->

        $scope.doSearch = ->
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
                snippet: $sce.trustAsHtml(data.highlighting[id].content?.join '...')
              }

        # XXXXX
        $scope.query = 'jock'
        $scope.doSearch()

    ]
  )
