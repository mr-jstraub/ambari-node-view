/**
 * Edit Node - Controller
 **/
angular.module('mNodeView')
    .controller('EditNodeController', ['$scope', 'DefEnvironment', 'MainCluster', function ($scope, DefEnvironment, MainCluster) {
        /* {Nodes[]} List of available nodes */
        $scope.nodes = MainCluster.nodes;
        /* {Component[]} kust of components */
        $scope.comps = DefEnvironment.comps;
        /* {Node} The selected node */
        $scope.node = null;
        /* {Component} The selected component */
        $scope.comp = null;
        /* {boolean} True if form is invalid */
        $scope.isFormValid = true;

        /**
         * Adds the selected component to the selected node
         **/
        $scope.addToNode = function () {
            if (!$scope.node || !$scope.comp || !$scope.node.addComponent($scope.comp)) {
                $scope.isFormValid = false;
                return;
            }
            $scope.isFormValid = true;
        };

        $scope.formChange = function () {
            $scope.isFormValid = true;
        };
    }]);
