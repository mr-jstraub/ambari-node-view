/**
 * Nodeview - Controller
 **/
angular.module('mNodeView', ['mBuild'])
    .controller('NodeViewController', ['$scope', '$location', 'DefEnvironment', 'MainCluster', 'BuildCluster', function ($scope, $location, DefEnvironment, MainCluster, BuildCluster) {
        /* {Cluster} Reference to cluster object */
        $scope.cluster = MainCluster;
        /* {Object} Cluster nodes */
        $scope.clusterNodes = {'none': MainCluster.nodes};
        /* {String} Cluster name */
        $scope.clusterName = MainCluster.name;
        /* {String} Cluster version */
        $scope.clusterVersion = MainCluster.version;
        /* {Service[]} List of services */
        $scope.services = DefEnvironment.services;
        /* {Component[]} List of components */
        $scope.comps = DefEnvironment.comps;
        // reset showZones feature
        $scope.config.showZones = false;

        /* Convert cluster object to buildcluster format for editing*/
        /* TODO: BETA */
        $scope.editCluster = function () {
            BuildCluster.clusterMeta['name'] = $scope.cluster.name;
            BuildCluster.clusterMeta['isKerberized'] = ($scope.cluster == 'Kerberos') ? 'true' : 'false';
            var version = ($scope.cluster.version) ? $scope.cluster.version.split('-') : [];
            BuildCluster.clusterMeta['stack'] = (version.length >= 1) ? version[0] : 'HDP';
            BuildCluster.clusterMeta['stackVersion'] = (version.length >= 2) ? version[1] : '2.3';

            // prepare nodes
            BuildCluster.cluster = [];
            for (var k in $scope.cluster.nodes) {
                var node = $scope.cluster.nodes[k];
                var bnode = {};
                bnode['cardinality'] = node.card;
                bnode['name'] = (node.hostnames.length > 0) ? node.hostnames[0] : 'node.example.com';
                bnode['comps'] = [];
                bnode['zone'] = node.zone;
                for (var ck in node.comps) {
                    var comp = node.comps[ck];
                    bnode['comps'].push({
                        'name': comp['name'],
                        'shortname': comp['shortname'],
                        'id': comp['id'],
                        'baseColor': comp.service.baseColor,
                        'fontColor': comp.service.fontColor
                    });
                }
                BuildCluster.cluster.push(bnode);
            }

            $location.path('/build');
        };

        /**
         * Groups nodes by their zone
         **/
        function groupNodesByZone(nds) {
            if (!nds) return {'none': MainCluster.nodes};
            var zones = {};
            // group nodes
            for (var k in nds) {
                var node = nds[k];
                var zone = (node.zone != '') ? node.zone : 'None';
                if (zone in zones) {
                    zones[zone].push(node);
                } else {
                    zones[zone] = [node];
                }
            }
            return zones;
        }

        // watch for changes in the showZones config
        $scope.$watch('config.showZones', function () {
            $scope.clusterNodes = ($scope.config.showZones === true) ? groupNodesByZone(MainCluster.nodes) : {'none': MainCluster.nodes};
        }, true);

        // TODO
        /*
         this.config = {
         //Defines the number of components within a node on a single row, 0 to disable
         comps_per_row: 3
         };
         */
    }]);

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
