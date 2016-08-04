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
            $locationProvider.html5Mode(true);
            $locationProvider.hashPrefix('!');
            $routeProvider
            .when('/view/:filename', {
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
.directive('simpleHtml', ['$compile', '$anchorScroll', 'Page',
           function($compile, $anchorScroll, Page){
               return {
                   link: function($scope, $element, $attrs) {
                       var compile = function( newHTML  ) {
                           newHTML = $compile(newHTML)($scope);
                           $element.html('').append(newHTML);
                           if(!Page.getTitle()) {
                               var heads = $element.find('h1');
                               if(heads.length > 0) {
                                   Page.setTitle(heads[0].textContent)
                               }
                           }
                           $anchorScroll();
                       };
                       var htmlName = $attrs.simpleHtml;
                       $scope.$watch(htmlName, function( newHTML  ) {
                           if(!newHTML) return;
                           compile(newHTML);
                       });
                   }
               }
           }
])
.factory('Page', function() {
    var title;
    return {
        setTitle: function(newTitle) {
            title = newTitle;
        },
        getTitle: function() {
            return title;
        }
    };
})
.controller('PageController', ['$scope', '$anchorScroll', 'Page',
            function($scope, $anchorScroll, Page) {
                $scope.Page = Page;
                $scope.goTo = function(anchor) {
                    $anchorScroll(anchor);
                }
            }
])
.controller('IndexController', ['$scope', '$http', 'Page',
            function($scope, $http, Page) {
                Page.setTitle("Home")
                $scope.setTitle = function(title) {
                    Page.setTitle(title);
                };
                $http.get('posts.json').success(function(data) {
                    $scope.postList = data;
                });
            }
])
.controller('PostDetailController', ['$scope', '$routeParams', '$http', 'Page',
            function($scope, $routeParams, $http, Page) {
                $http.get('posts/'+$routeParams.filename+'.md').success(function(data) {
                    $scope.postHtml = marked(data);
                });
            }
]);
