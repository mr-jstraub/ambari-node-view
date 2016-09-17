/**
 * Cluster-Build Controller
 **/
angular.module('mBuild', ['mNodeView', 'mBlueprint'])
    .controller('BuildController', ['$scope', '$location', 'DefEnvironment', 'MainCluster', 'BuildCluster', 'Blueprint', function($scope, $location, DefEnvironment, MainCluster, BuildCluster, Blueprint){
        /* {int} maxNodes Maximum number of nodes allowed */
        $scope.maxNodes = 1000;
        /* {String} defHostname Default hostname of node */
        $scope.defHostname = 'node.example.com';
        /* {String} defZone Default zone of node*/
        $scope.defZone = 'no zone';
        /* {Service} curService Currently selected service */
        $scope.curService = null;
        /* {int} curBundle Currently selected bundle index */
        $scope.curBundle = null;
        /* {Service[]} List of services */
        $scope.services = DefEnvironment.services;
        /* {Component[]} Components of selected service w/o circ. structure */
        $scope.buildcomps = [];
        /* {Node[]} Nodes of cluster */
        $scope.buildnodes = BuildCluster.cluster;
        /* CLuster variables */
        $scope.clusterMeta = BuildCluster.clusterMeta;
        /* List of available bundles */
        $scope.bundles = BuildCluster.bundles;

        /**
         * Finalizes the cluster and imports it.
         */
        $scope.finalize = function(){
            console.debug('Finalizing built cluster.');

            // prepare nodes
            var clusterNodes = [];
            for(var k in $scope.buildnodes){
                var node = $scope.buildnodes[k];
                var nodeHNames = $scope.genHostnames(node['name'], node['cardinality']);
                clusterNodes.push({'hostnames': nodeHNames, 'comps': node.comps, 'zone': node['zone']});
            }

            // prepare stack
            $scope.clusterMeta.stack = $scope.clusterMeta.stackId + '-' + $scope.clusterMeta.stackVersion;

            // reset blueprint bundle calculation
            Blueprint.resetBundle = true;

            // import cluster
            MainCluster.importBuiltCluster(clusterNodes, $scope.clusterMeta.name, $scope.clusterMeta.stack, $scope.clusterMeta.isKerberized);

            $location.path('/');
        };

        /**
         * Generates hostnames according to the given name.
         * Allowed formats:
         *   {0} => First occurence will be used for count until cardinality
         *          is reached. In this case 0 represents the beginning, this
         *          can be any given positive number.
         *   #{0} => The # in front of the start number adds trailing zeros
         *           to the beginning of the hostname, e.g. 01,02,03 instead
         *           of 1,2,3
         * @returns Array of calculated hostnames
         */
        $scope.genHostnames = function(name, cardinality){
            if(typeof(name) !==  'string'){
                console.warn('Cannot process this data type (non-string)');
                return [];
            }

            // get hostname info info
            var isTrZeros = (name.match(/(#)+\{\d+\}/)) ? true : false;
            // remove trailing info from name
            name = name.replace(/#+/, '');
            // determine av. start of host_partial (e.g. 1000, 0, 22,...)
            var startMatch = name.match(/\{(\d+)\}/);
            var start = 0;
            // generated hostnames
            var hosts = [];
            var pfx = name;
            var sfx = '';

            // nothing to do, hostname is fine
            if(!startMatch && cardinality <= 1){
                return [name];
            }

            // host_partial start was defined
            if(startMatch){
                start = Number((name.match(/\{(\d+)\}/) || [0, 0])[1]);
                startSplit = name.split(/\{\d+\}/);
                pfx = startSplit[0];
                sfx = startSplit[1];
            }

            // determine host_partial size
            var size = ((start + cardinality) + "").length;

            // generate hostnames
            for(var i = 0; i < cardinality; i++){
                var hostPartial = (start++) + "";
                if(isTrZeros){
                    hostPartial = "000" + hostPartial;
                    hostPartial = hostPartial.substr(hostPartial.length-size);
                }
                hosts.push(pfx + hostPartial + sfx);
            }

            return hosts;
        };

        /**
         * New service selected, prepare components.
         * DragNDrop module used JSON, hence we cannot use the comps
         * from the service object directly.
         * @param {Service} selService the selected service
         */
        $scope.selectComps = function(selService){
            $scope.buildcomps = [];
            $scope.curService = selService;
            for(var key in selService.comps){
                var comp = selService.comps[key];
                $scope.buildcomps.push({'name':comp['name'], 'shortname': comp['shortname'], 'id': comp['id'], 'baseColor': selService.baseColor, 'fontColor': selService.fontColor});
            }
        };

        /**
         * New bundle selected, prepare components.
         * DragNDrop module used JSON, hence we cannot use the comps
         * from the service object directly.
         * @param {int} idx Index of selected bundle
         */
        $scope.selectBundleComps = function(idx){
            $scope.buildcomps = [];
            $scope.curBundle = idx;
            var bundle = $scope.bundles[idx];

            for(var ck in bundle.comps){
                var comp = DefEnvironment.getComponentById(bundle.comps[ck]);
                if(!comp) continue;
                $scope.buildcomps.push({'name':comp['name'], 'shortname': comp['shortname'], 'id': comp['id'], 'baseColor': comp.service.baseColor, 'fontColor': comp.service.fontColor});
            }
        };

        /**
         * Make sure the entered cardinality + the number of existing nodes
         * does not exceed 1000 nodes.
         * @param {int} newNum entered cardinality
         * @param {int} oldNum old cardinality
         */
        $scope.checkCardinality = function(newNum, oldNum){
            if((newNum + $scope.numClusterNodes() - oldNum) > $scope.maxNodes){
                return "Only 1000 nodes are allowed."
            }
        };

        /**
         * Counts the current amount of nodes in this cluster
         * @returns amount of nodes
         */
        $scope.numClusterNodes = function(){
            var result = 0;
            for(var key in $scope.buildnodes){
                result += 1 * $scope.buildnodes[key]['cardinality'];
            }
            return result;
        };

        /**
         * Adds a new node to this cluster.
         */
        $scope.addNode = function(){
            if($scope.numClusterNodes() >= $scope.maxNodes){
                console.warn('Cannot add more than ' + $scope.maxNodes + ' nodes');
                return;
            }
            $scope.buildnodes.push({'name': $scope.defHostname, 'comps': [], 'cardinality': 1});
        };

        /**
         * Removes the selected node from the cluster
         * @param {int} idx index of node
         */
        $scope.removeNode = function(idx){
            console.debug('Removing node with idx: ' + idx);
            $scope.buildnodes.splice(idx, 1);
        };

        /**
         * Checks whether the selected node already has a component
         * with this id.
         * @param event drag event
         * @param item selected component
         * @param node selected node
         * @returns false in case node is already available, otherwise the comp
         */
        $scope.isUnique = function(event, item, node){
            if('node' in item && item['node'] == node.name){
                console.warn('allowed');
                return item;
            }
            for(var k in node.comps){
                if(item.id == node.comps[k]['id']){
                    return false;
                }
            }
            item['node'] = node.name;
            return item;
        };

    }]);