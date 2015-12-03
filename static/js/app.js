'use strict';

marked.setOptions({
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    }
});

var blogApp = angular.module('blogApp', [
    'ngRoute',
])
.config(['$routeProvider', '$locationProvider',
               function($routeProvider, $locationProvider) {
                   $locationProvider.hashPrefix('!');
                   $routeProvider
                   .when('/posts/:filename', {
                       template: '<div class="markdown-body post" simple-html="postHtml">',
                       controller: 'PostDetailController'
                   })
                   .when('/', {
                       templateUrl: 'static/templates/index.html',
                       controller: 'IndexController'
                   })
                   .otherwise({
                       redirectTo: '/'
                   });
               }

])
.directive('simpleHtml', function($compile){
    return {
        link: function($scope, $element, $attrs) {
            var compile = function( newHTML  ) {
                newHTML = $compile(newHTML)($scope);
                $element.html('').append(newHTML);
            };
            var htmlName = $attrs.simpleHtml;
            $scope.$watch(htmlName, function( newHTML  ) {
                if(!newHTML) return;
                compile(newHTML);
            });
        }
    }
})
.controller('IndexController', ['$scope', '$http',
            function($scope, $http) {
                $http.get('posts.json').success(function(data) {
                    $scope.postList = data;
                })
            }
])
.controller('PostDetailController', ['$scope', '$routeParams', '$http',
            function($scope, $routeParams, $http) {
                $http.get('posts/'+$routeParams.filename).success(function(data) {
                    $scope.postHtml = marked(data);
                })
            }
]);
