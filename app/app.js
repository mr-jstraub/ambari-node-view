/**
 * Visualize your clusters components and services.
 * This app exports parts of the blueprint from the Ambari API
 * in order to visualize the setup.
 *
 * Version: 0.6.0 (Beta)
 * Author: Jonas Straub 
 */

var app = angular.module('nodeviewApp', ['mImportExport', 'mBuild', 'mBlueprint', 'mNodeView', 'ngRoute', 'dndLists', 'xeditable', 'ui.bootstrap']);

app.run(function(editableOptions, editableThemes) {
  editableThemes.bs3.inputClass = 'input-sm';
  editableThemes.bs3.buttonsClass = 'btn-xs';
  editableOptions.theme = 'bs3';
});

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'app/mods/nodeview/node_view.html',
        controller: 'NodeViewController as nodeCtrl'
    })
    .when('/legend', {
        templateUrl: 'app/mods/nodeview/legend.html',
        controller: 'NodeViewController as nodeCtrl'
    })
    .when('/build', {
        templateUrl: 'app/mods/build/cluster_build.html',
        controller: 'BuildController as buildCtrl'
    })
    .when('/blueprint', {
        templateUrl: 'app/mods/blueprint/blueprint.html',
        controller: 'BlueprintController as bpCtrl'
    })
    .when('/settings/services', {
        templateUrl: 'app/mods/nodeview/settings_services.html',
        controller: 'EditEnvController as editEnvCtrl'
    })
    .when('/settings/components', {
        templateUrl: 'app/mods/nodeview/settings_components.html',
        controller: 'EditEnvController as editEnvCtrl'
    })
    .when('/about', {
        templateUrl: 'app/html/about.html'
    })
    .when('/help', {
        templateUrl: 'app/html/about.html'
    })
    .when('/settings/download', {
        templateUrl: 'app/tmpl/download_exporter.html'
    })
    .when('/settings/importexport', {
        templateUrl: 'app/mods/importexport/importexport.html',
        controller: 'ImportExportController as imexCtrl'
    })
    .otherwise({
      redirectTo:'/'
    });
});

/**
 * Main Controller
 **/
app.controller('MainController', ['$scope', '$route', '$routeParams', '$location', function($scope, $route, $routeParams, $location){
    // routing
    $scope.$route = $route;
    $scope.$location = $location;
    $scope.$routeParams = $routeParams;
    // config
    $scope.config = {'useFullnames': true};
}]);








