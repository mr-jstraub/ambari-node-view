/**
 * Edit Enivornment Controller
 **/
angular.module('mNodeView')
    .controller('EditEnvController', ['$scope', 'DefEnvironment', function ($scope, DefEnvironment) {
        /* {Service[]} List of services */
        $scope.services = DefEnvironment.services;
        /* {Component[]} List of components */
        $scope.comps = DefEnvironment.comps;
        /* {Service} current service being edited */
        $scope.editServiceObj = null;
        /* {Component} current component being edited */
        $scope.editCompObj = null;

        $scope.editService = function (id) {
            var service = DefEnvironment.getServiceById(id);

            if (service) {
                $scope.editServiceObj = service;
            }
        };
        $scope.editComp = function (id) {
            var comp = DefEnvironment.getComponentById(id);

            if (comp) {
                $scope.editCompObj = comp;
            }
        };

    }]);
