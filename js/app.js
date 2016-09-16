/**
 * Visualize your clusters components and services.
 * This app exports parts of the blueprint from the Ambari API
 * in order to visualize the setup.
 *
 * Version: 0.3.0 (Beta)
 * Author: Jonas Straub 
 */

var app = angular.module('nodeviewApp', ['ngRoute', 'dndLists', 'xeditable', 'ui.bootstrap']);

app.run(function(editableOptions, editableThemes) {
  editableThemes.bs3.inputClass = 'input-sm';
  editableThemes.bs3.buttonsClass = 'btn-xs';
  editableOptions.theme = 'bs3';
});

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'node_view.html',
        controller: 'NodeViewController as nodeCtrl'
    })
    .when('/legend', {
        templateUrl: 'legend.html',
        controller: 'NodeViewController as nodeCtrl'
    })
    .when('/build', {
        templateUrl: 'cluster_build.html',
        controller: 'BuildController as buildCtrl'
    })
    .when('/blueprint', {
        templateUrl: 'blueprint.html',
        controller: 'BlueprintController as bpCtrl'
    })
    .when('/settings/services', {
        templateUrl: 'settings_services.html',
        controller: 'EditEnvController as editEnvCtrl'
    })
    .when('/settings/components', {
        templateUrl: 'settings_components.html',
        controller: 'EditEnvController as editEnvCtrl'
    })
    .when('/about', {
        templateUrl: 'about.html'
    })
    .when('/help', {
        templateUrl: 'about.html'
    })
    .when('/settings/download', {
        templateUrl: 'download_exporter.html'
    })
    .when('/settings/importexport', {
        templateUrl: 'importexport.html',
        controller: 'ImportExportController as imexCtrl'
    })
    .otherwise({
      redirectTo:'/'
    });
});


/**
 * Blueprint Controller (----BETA----)
 **/
app.controller('BlueprintController', ['$scope', 'DefEnvironment', 'MainCluster', 'BuildCluster', 'Blueprint', function($scope, DefEnvironment, MainCluster, BuildCluster, Blueprint){
    /* Blueprint/Clustername name */
    $scope.blueprintName = '';
    /* Blueprint Object */
    $scope.blueprintObj = null;
    /* Hostgroup Object */
    $scope.hostgroupObj = null;
    /* Generated/Finalized blueprint JSON */
    $scope.blueprintJson = '';
    /* Generated/Finalized hostgroup JSON */
    $scope.hostgroupJson = '';
    /* New config item */
    $scope.newConfig = {'bprint': 'YES','hg': 'none', 'loc': '', 'id': '', 'val': ''};
    /* Form blueprint hostgroup mapping selection */
    $scope.bprintFormSelect = [{'id': 'YES', 'name': 'Blueprint'}, {'id': 'NO', 'name': 'Hostgroup-Mapping'}];
    /* Config items format: {<key=loc+id>: {'loc':...'id':... 'val':...}} */
    $scope.configItems = Blueprint.configItems;
    /* Config locations (typeahead values) */
    $scope.configLocations = Blueprint.configLocations;
    /* Config ids (typeahead values) */
    $scope.configIds = Blueprint.configIds;
    /* List of available hostgroups (prepared during base bprint prep.) */
    $scope.hostGroupNames = [];


    
    // Watch for changes in MainCluster to recreate the blueprint
    $scope.$watch('MainCluster', function() {
        $scope.genBlueprint();
    }, true);

    /**
     * Triggers the necessary methods to create the blueprint
     */
    $scope.genBlueprint = function(){
        // prepare blueprint
        $scope.prepareBaseBlueprint(MainCluster.nodes);
        $scope.prepareBlueprintConfigBundles();
        $scope.prepareBlueprintConfig();

        $scope.updateBlueprintConfig(false);

        // generate json
        $scope.blueprintJson = angular.toJson($scope.blueprintObj, 1);
        $scope.hostgroupJson = angular.toJson($scope.hostgroupObj, 1);
    };

    // TODO: Validate location
    /**
     * Adds the given configuration to the specified location
     * @param {String} loc Location e.g. core-site, hdfs-site
     * @param {String} id Config name .e.g fsDefaultFs
     * @param {*} value Config valu
     * @param {String} bprint YES = Blueprint, NO=Hostgroup Mapping
     * @param {String} hg hostgroup or none if general cluster config
     * @param {boolean} triggerUpdate True triggers an update of the blueprint json
     */
    $scope.addConfigItem = function(loc, id, val, bprint, hg, triggerUpdate){
        if(!loc || !id){
            console.warn('Cannot add config item with empty location and param');
            return false;
        }

        // add or update config item
        $scope.configItems[loc + '_' + id] = {'bprint': bprint, 'hg': hg, 'loc': loc, 'id': id, 'val': val};

        // trigger blueprint update
        if(triggerUpdate){
            $scope.prepareBaseBlueprint(MainCluster.nodes);
            $scope.updateBlueprintConfig(true);
        }
        return true;
    };

    /**
     * Adds a new config item from the form
     */
    $scope.addConfigItemFromForm = function(){
        if(!$scope.newConfig.loc || !$scope.newConfig.id){
            console.warn('Cannot add config item with empty location and param');
            return false;
        }
        $scope.addConfigItem($scope.newConfig.loc, $scope.newConfig.id, $scope.newConfig.val, $scope.newConfig.bprint, $scope.newConfig.hg, true);

        // reset new config object
        $scope.newConfig = {'bprint': 'YES', 'hg': 'none', 'loc': '', 'id': '', 'val': ''};;
        return true;
    };

    /**
     * Removes a config item 
     */ 
    $scope.removeConfigItem = function(idx){
        if(idx in $scope.configItems){
            delete $scope.configItems[idx];
            $scope.prepareBaseBlueprint(MainCluster.nodes);
            $scope.updateBlueprintConfig(true);
        }
    };

    /**
     * Removes a config item by using regex matching
     */ 
    $scope.removeConfigItemByRegex = function(regex){
        for(var k in $scope.configItems){
            if(k.match(regex)){
                $scope.removeConfigItem(k);
            }
        }
    };

    /**
     * Prepare base blueprint (adding components,hostgroups, etc.)
     */
    $scope.prepareBaseBlueprint = function(nodes){
        var blueprint = {'configurations': [], 'host_groups':[], 'Blueprints' : {} };
        var hostgroup = {'blueprint': '', 'default_password': 'replace-with-strong-password', 'configurations': [], 'host_groups': []};
        $scope.hostGroupNames = [];
        $scope.blueprintName = prepareBlueprintName(MainCluster.name);

        // get stack name and stack version
        var stackMeta = getStackMeta(MainCluster.version);
        // add blueprint name and stack info
        blueprint['Blueprints']['stack_name'] = stackMeta.name;
        blueprint['Blueprints']['stack_version'] = stackMeta.version;
        // add hostgroup meta
        hostgroup['blueprint'] = $scope.blueprintName;
        blueprint['Blueprints']['blueprint_name'] = $scope.blueprintName;
        

        //  prepare hostgroups and components
        var hostGroupCount = 0;
        for(var nk in nodes){
            var node = nodes[nk];
            var nodeComps = [];
            var nodeHosts = [];
            var hostGroupName = Blueprint.hostgroupPfx + (++hostGroupCount);

            // process host components (only blueprintable comps!)
            for(var ck in node.comps){
                var comp = node.comps[ck];
                if(comp.isBlueprintable()){
                    nodeComps.push({'name': comp.id.toUpperCase()});
                }
            }

            // prepare hostnames
            for(var hk in node.hostnames){
                nodeHosts.push({'fqdn': node.hostnames[hk]});
            }

            // add to blueprint
            if(nodeComps.length > 0){
                blueprint.host_groups.push({'name': hostGroupName, 'components': nodeComps, 'cardinality': node.getCardinality() + ""});
            }

            // add to hostgroup mapping
            hostgroup['host_groups'].push({'name': hostGroupName, 'hosts': nodeHosts});

            // save hostgroupnames for config updates
            $scope.hostGroupNames.push(hostGroupName);
        }

        // add to scope
        $scope.blueprintObj = blueprint;
        $scope.hostgroupObj = hostgroup;
    };

    /**
     * Prepares the blueprint configuration by
     * removing config items of old hosts, removing bundle configuration,etc.
     */
    $scope.prepareBlueprintConfig = function(){
        // remove config of old hostgroups
        for(var k in $scope.configItems){
            var item = $scope.configItems[k];
            if(item.hg != '' && item.hg != 'none' && $scope.hostGroupNames.indexOf(item.hg) < 0){
                // remove config item
                $scope.removeConfigItem(k);
            }
        }
    };

    /**
     * Prepare bundle blueprint configurations
     */
    $scope.prepareBlueprintConfigBundles = function(){
        // only prepare if resetBundle flag is set
        if(!Blueprint.resetBundle){
            return;
        }

        /* HDFS HA bundle */
        // check whether bundle is available
        var res = detectBundle(Blueprint.hdfsBundle, $scope.blueprintObj['host_groups']);
        // remove hdfs HA config
        $scope.removeConfigItem('core-site_fs.defaultFS');
        $scope.removeConfigItem('core-site_ha.zookeeper.quorum');
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.client\.failover\.proxy\.provider\..*/);
        $scope.removeConfigItem('hdfs-site_dfs.ha.automatic-failover.enabled');
        $scope.removeConfigItem('hdfs-site_dfs.ha.fencing.methods');
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.ha\.namenodes\..*/);
        $scope.removeConfigItem('hdfs-site_dfs.namenode.http-address');
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.http-address\..*\.nn1/);
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.http-address\..*\.nn2/);
        $scope.removeConfigItem('hdfs-site_dfs.namenode.https-address');
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.https-address\..*\.nn1/);
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.https-address\..*\.nn2/);
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.rpc-address\..*\.nn1/);
        $scope.removeConfigItemByRegex(/hdfs-site_dfs\.namenode\.rpc-address\..*\.nn2/);
        $scope.removeConfigItem('hdfs-site_dfs.namenode.shared.edits.dir');
        $scope.removeConfigItem('hdfs-site_dfs.nameservices');
        // add config
        if(res){
            $scope.addConfigItem('core-site', 'fs.defaultFS', "hdfs://" + $scope.blueprintName, 'YES', 'none', false);
            $scope.addConfigItem('core-site', 'ha.zookeeper.quorum', "%HOSTGROUP::"+res['zookeeper_server'][0]+"%:2181,%HOSTGROUP::"+res['zookeeper_server'][1]+"%:2181,%HOSTGROUP::"+res['zookeeper_server'][2]+"%:2181", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.client.failover.proxy.provider." + $scope.blueprintName, 'org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider', 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.ha.automatic-failover.enabled', 'true', 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.ha.fencing.methods', 'shell(/bin/true)', 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.ha.namenodes." + $scope.blueprintName, 'nn1,nn2', 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.namenode.http-address', "%HOSTGROUP::"+res['namenode'][0]+"%:50070", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.http-address." + $scope.blueprintName + ".nn1", "%HOSTGROUP::"+res['namenode'][0]+"%:50070", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.http-address." + $scope.blueprintName + ".nn2", "%HOSTGROUP::"+res['namenode'][1]+"%:50070", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.namenode.https-address', "%HOSTGROUP::"+res['namenode'][0]+"%:50470", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.https-address." + $scope.blueprintName + ".nn1", "%HOSTGROUP::"+res['namenode'][0]+"%:50470", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.https-address." + $scope.blueprintName + ".nn2", "%HOSTGROUP::"+res['namenode'][1]+"%:50470", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.rpc-address." + $scope.blueprintName + ".nn1", "%HOSTGROUP::"+res['namenode'][0]+"%:8020", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', "dfs.namenode.rpc-address." + $scope.blueprintName + ".nn2", "%HOSTGROUP::"+res['namenode'][1]+"%:8020", 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.namenode.shared.edits.dir', "qjournal://%HOSTGROUP::"+res['journalnode'][0]+"%:8485;%HOSTGROUP::"+res['journalnode'][1]+"%:8485;%HOSTGROUP::"+res['journalnode'][2]+"%:8485/" + $scope.blueprintName, 'YES', 'none', false);
            $scope.addConfigItem('hdfs-site', 'dfs.nameservices', $scope.blueprintName, 'YES', 'none', false);
        }

        /*Yarn HD bundle*/
        res = detectBundle(Blueprint.yarnBundle, $scope.blueprintObj['host_groups']);
        // remove yarn ha config
        $scope.removeConfigItem('yarn-site_hadoop.registry.rm.enabled');
        $scope.removeConfigItem('yarn-site_hadoop.registry.zk.quorum');
        $scope.removeConfigItem('yarn-site_yarn.log.server.url');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.admin.address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.cluster-id');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.ha.automatic-failover.zk-base-path');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.ha.enabled');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.ha.rm-ids');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.hostname');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.recovery.enabled');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.resource-tracker.address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.scheduler.address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.store.class');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.webapp.address');
        $scope.removeConfigItem('yarn-site_yarn.timeline-service.address');
        $scope.removeConfigItem('yarn-site_yarn.timeline-service.webapp.address');
        $scope.removeConfigItem('yarn-site_yarn.timeline-service.webapp.https.address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.zk-address');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.hostname.rm1');
        $scope.removeConfigItem('yarn-site_yarn.resourcemanager.hostname.rm2');
        if(res){
            $scope.addConfigItem('yarn-site', 'hadoop.registry.rm.enabled', 'false', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'hadoop.registry.zk.quorum', '%HOSTGROUP::' + res['zookeeper_server'][0] + '%:2181,%HOSTGROUP::' + res['zookeeper_server'][1] + '%:2181,%HOSTGROUP::' + res['zookeeper_server'][2] + '%:2181', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.log.server.url', 'http://%HOSTGROUP::' + res['historyserver'][0] + '%:19888/jobhistory/logs', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.address', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8050', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.admin.address', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8141', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.cluster-id', 'yarn-cluster', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.ha.automatic-failover.zk-base-path', '/yarn-leader-election', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.ha.enabled', 'true', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.ha.rm-ids', 'rm1,rm2', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.hostname', '%HOSTGROUP::' + res['resourcemanager'][0] + '%', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.recovery.enabled', 'true', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.resource-tracker.address', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8025', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.scheduler.address', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8030', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.store.class', 'org.apache.hadoop.yarn.server.resourcemanager.recovery.ZKRMStateStore', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.webapp.address', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8088', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.timeline-service.address', '%HOSTGROUP::' + res['app_timeline_server'][0] + '%:10200', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.timeline-service.webapp.address', '%HOSTGROUP::' + res['app_timeline_server'][0] + '%:8188', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.timeline-service.webapp.https.address', '%HOSTGROUP::' + res['app_timeline_server'][0] + '%:8190', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.zk-address', '%HOSTGROUP::' + res['zookeeper_server'][0] + '%:2181,%HOSTGROUP::' + res['zookeeper_server'][1] + '%:2181,%HOSTGROUP::' + res['zookeeper_server'][2] + '%:2181', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.hostname.rm1', '%HOSTGROUP::' + res['resourcemanager'][0] + '%:8190', 'YES', 'none', false);
            $scope.addConfigItem('yarn-site', 'yarn.resourcemanager.hostname.rm2', '%HOSTGROUP::' + res['resourcemanager'][1] + '%:8190', 'YES', 'none', false);
        }

        // reset flag
        Blueprint.resetBundle = false;
    };


    // TODO: better impl. necessary
    /**
     * Converts the configItems object to the blueprint json format.
     */
    $scope.updateBlueprintConfig = function(triggerJsonUpdate){
        var preRes = {'bp': {}, 'hg': {}};

        // sort and merge config items
        for(var ck in $scope.configItems){
            var item = $scope.configItems[ck];
            var hg = (item.hg) ? item.hg : 'none';
            var target = (item.bprint == 'YES') ? preRes['bp'] : preRes['hg'];

            // add new hostgroup
            if(!(hg in target)){
                target[hg] = {};
            }
            // add new location to result
            if(!(item.loc in target[hg])){
                target[hg][item.loc] = {'properties': {}};
            }
            // add config item
            target[hg][item.loc]['properties'][item.id] = item.val;
        }

        // prepare config items for blueprint (syntax formatting)
        for(var key in preRes){
            var target = (key == 'bp') ? $scope.blueprintObj : $scope.hostgroupObj;
            // traverse through config locations
            for(var ck in preRes[key]){
                var configItems = preRes[key][ck];
                // prepare result
                var res = Object.keys(configItems).map(function (itemKey) {
                    var temp = {};
                    temp[itemKey] = configItems[itemKey];
                    return temp;
                });
                // add to blueprint or hostgroup
                if(ck == 'none'){
                    target['configurations'] = res;
                }else{
                    // calculate location index 
                    var idx = getIndexByHostGroupName(target['host_groups'], ck);
                    target['host_groups'][idx]['configurations'] = res;
                }
            }
        }

        // update json results
        if(triggerJsonUpdate == true){
            $scope.blueprintJson = angular.toJson($scope.blueprintObj, 1);
            $scope.hostgroupJson = angular.toJson($scope.hostgroupObj, 1);
        }
    };

    function getIndexByHostGroupName(hgList, name){
        for(var k in hgList){
            if(hgList[k]['name'] == name){
                return k;
            }
        }
        return -1;
    };
    
    /**
     * Tries to detect if the given bundle/list of components
     * is available in the cluster.
     * @param {String} bundle components and their cardinality to search for,syntax: {'comp_id':cardinality}
     * @param {Object} Prepare blueprint hostgroups
     * @returns The result object or null of bundle was not found.
     */
    function detectBundle(bundle, hostgroups){
        var res = {};

        // prepare result and search for bundle components
        for(var k in bundle){
            res[k] = [];
            var comp = k;
            var cardinality = bundle[k];

            // traverse threw hostgroups and search for component
            for(var kh in hostgroups){
                var hostgroup = hostgroups[kh];
                // make sure only #cardinality comps are found
                if(res[comp].length >= cardinality){
                    break;
                }

                // search component
                for(var ck in hostgroup.components){
                    var hostComp = hostgroup.components[ck];
                    if(comp == hostComp.name.toLowerCase()){
                        res[comp].push(hostgroup.name);
                        break;
                    }
                }
            }

            // validate cardinality constraint
            if(res[comp].length < cardinality){
                return null;
            }
        }
        return res;
    }

    /**
     * Calculates the stack name and version from a given stack
     * string. The stack string has the format <stack name>-<stack-version>
     * @returns Object that contains the stack name and version
     */
    function getStackMeta(stack){
        var res = {'name':'', 'version':''};
        if(!stack || typeof(stack) != 'string'){
            return res;
        }
        var split = stack.split('-');
        if(split.length <= 1){
            return res;
        }
        res['name'] = split[0];
        res['version'] = split[1];
        return res;
    }

    /**
     * @returns Prepare blueprint name without spaces
     */
    function prepareBlueprintName(name){
        return (typeof(name) != 'string') ? '' : name.replace(/\W+/g, '').toLowerCase();
    }

    //TODO: temp!
    $scope.getFormHostGroups = function(){
        return ['none'].concat($scope.hostGroupNames);
    };

}]);




/**
 * Cluster-Build Controller
 **/
app.controller('BuildController', ['$scope', '$location', 'DefEnvironment', 'MainCluster', 'BuildCluster', 'Blueprint', function($scope, $location, DefEnvironment, MainCluster, BuildCluster, Blueprint){
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

/**
 * Main Controller
 **/
app.controller('MainController', ['$scope', '$route', '$routeParams', '$location', function($scope, $route, $routeParams, $location){
    // routing
    $scope.$route = $route;
    $scope.$location = $location;
    $scope.$routeParams = $routeParams;
    /* config */
    $scope.config = {'useFullnames': true};
}]);

/**
 * NodeView - Controller
 **/
app.controller('NodeViewController', ['$scope', '$location', 'DefEnvironment', 'MainCluster', 'BuildCluster', function($scope, $location, DefEnvironment, MainCluster, BuildCluster){
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
    $scope.editCluster = function(){
        BuildCluster.clusterMeta['name'] =$scope.cluster.name;
        BuildCluster.clusterMeta['isKerberized'] = ($scope.cluster == 'Kerberos') ? 'true' : 'false';
        var version = ($scope.cluster.version) ? $scope.cluster.version.split('-') : [];
        BuildCluster.clusterMeta['stack'] = (version.length >= 1) ? version[0] : 'HDP';
        BuildCluster.clusterMeta['stackVersion'] = (version.length >= 2) ? version[1] : '2.3';

        // prepare nodes
        BuildCluster.cluster = [];
        for(var k in $scope.cluster.nodes){
            var node = $scope.cluster.nodes[k];
            var bnode = {};
            bnode['cardinality'] = node.card;
            bnode['name'] = (node.hostnames.length > 0) ? node.hostnames[0] : 'node.example.com';
            bnode['comps'] = [];
            bnode['zone'] = node.zone;
            for(var ck in node.comps){
                var comp = node.comps[ck];
                bnode['comps'].push({'name':comp['name'], 'shortname': comp['shortname'], 'id': comp['id'], 'baseColor': comp.service.baseColor, 'fontColor': comp.service.fontColor});
            }
            BuildCluster.cluster.push(bnode);
        }

        $location.path('/build');
    };

    /**
     * Groups nodes by their zone
     **/
    function groupNodesByZone(nds){
        if(!nds) return {'none': MainCluster.nodes};
        var zones = {};
        // group nodes
        for(var k in nds){
            var node = nds[k];
            var zone = (node.zone != '') ? node.zone : 'None';
            if(zone in zones){
                zones[zone].push(node);
            }else{
                zones[zone] = [node];
            }
        }
        return zones;
    }

    // watch for changes in the showZones config
    $scope.$watch('config.showZones', function() {
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
 * Import and Export - Controller
 **/
app.controller('ImportExportController', ['$scope', 'DefEnvironment', 'MainCluster', 'Blueprint', function($scope, DefEnvironment, MainCluster, Blueprint){
    /* {Json string} Enviornment that will be imported */
    $scope.importEnv = DefEnvironment.getStoredEnvAsStr();
    /* {Json string} Cluster that will be imported  */
    $scope.importCluster = '';
    /* {JSON string} Exported cluster environment */
    $scope.exportEnv = DefEnvironment.expEnv();

    $scope.import = function(){
        console.debug('Try importing new cluster and environment');
        if(!$scope.importEnv || !$scope.importCluster){
            console.warn('Unable to import empty cluster or environment');
            return;
        }
        // reset blueprint bundle calculation
        Blueprint.resetBundle = true;
        // Load new env
        DefEnvironment.loadEnvFromJsonStr($scope.importEnv);
        MainCluster.importCluster($scope.importCluster);

        // reset import field
        $scope.importCluster = '';
    };

}]);

/**
 * Edit Node - Controller
 **/
app.controller('EditNodeController', ['$scope', 'DefEnvironment', 'MainCluster', function($scope, DefEnvironment, MainCluster){
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
    $scope.addToNode = function(){
        if(!$scope.node || !$scope.comp || !$scope.node.addComponent($scope.comp)){
            $scope.isFormValid = false;
            return;
        }
        $scope.isFormValid = true;
    };

    $scope.formChange = function(){
        $scope.isFormValid = true;
    };
}]);

/**
 * Edit Enivornment Controller
 **/
app.controller('EditEnvController', ['$scope', 'DefEnvironment', function($scope, DefEnvironment){
    /* {Service[]} List of services */
    $scope.services = DefEnvironment.services;
    /* {Component[]} List of components */
    $scope.comps = DefEnvironment.comps;
    /* {Service} current service being edited */
    $scope.editServiceObj = null;
    /* {Component} current component being edited */
    $scope.editCompObj = null;

    $scope.editService = function(id){
        var service = DefEnvironment.getServiceById(id);

        if(service){
            $scope.editServiceObj = service;
        }
    };
    $scope.editComp = function(id){
        var comp = DefEnvironment.getComponentById(id);

        if(comp){
            $scope.editCompObj = comp;
        }
    };

}]);


/**
 * Cluster Model
 **/
app.factory('Cluster', ['Config', 'Node', 'DefEnvironment', 'Component', function(Config, Node, DefEnvironment, Component){
    function Cluster(){
        /* {string} Name of cluster */
        this.name = '';
        /* {string} Cluster version */
        this.version = '';
        /* {string} security either none or kerberos */
        this.security = 'None';
        /* {Node[]} Object containing the Node objects of the cluster  */
        this.nodes = [];
        /* [Config[]] Optional configuration objects */
        this.config = null;
        // TODO fix this
        /* {ConfigItem[]} List of config items (same as in config) */
        this.configItems = [];
    }

    /**
     * Reset current cluster data and settings
     **/
    Cluster.prototype.reset = function(){
        this.name = '';
        this.version = '';
        this.security = 'None';
        this.nodes = [];
        this.config = null;
        this.configItems = [];
    };

    /**
     * Imports built cluster. Cluster was submitted by the build controller 
     * in an internal object oriented format.
     * @param {Object} data Cluster to be imported
     * @param {String} name Clustername
     * @param {String} stack Cluter stack
     * @param {String} isSecured True if kerberos security is enabled, false otherwise
     */
    Cluster.prototype.importBuiltCluster = function(data, name, stack, isSecured){
        console.debug('Trying to import built cluster');

        // reset cluster data
        this.reset();

        // set  new cluster info
        this.name = name;
        this.version = stack;
        this.security = (isSecured == 'true') ? 'Kerberos' : 'None';

        // add nodes to cluster
        for(var nk in data){
            var node = data[nk];
            var nodeHNames = node['hostnames'];
            var nodeZone = '';
            var nodeComps = [];

            // prepare node components
            for (var ck in node.comps){
                var compId = node.comps[ck]['id'];
                var comp = DefEnvironment.getComponentById(compId.toLowerCase());
                if(comp instanceof Component){
                    nodeComps.push(comp);
                }                  
            }

            if(node['zone'] && node['zone'] != ''){
                nodeZone = node['zone'];
            }

            // add new Node
            nodeIdx = this.addNode(nodeHNames, nodeComps, nodeZone);
            if(nodeIdx < 0){
                console.warn('Error creating new node');
                continue;
            }
        }

        console.info('Built Cluster imported');
    };

    /**
     * Import given cluster. Cluster has to be 
     * exporter by the Python-Exporter.
     * @param {String} clusterImportData Exported cluster info as strinigfied json
     * @returns True if successful, false otherwise
     **/
    Cluster.prototype.importCluster = function(clusterImportData){
        console.debug('Trying to import cluster');
        // retrieve cluster
        var clusterImport = clusterImportData;
        var clusterJson = null;
        var configs = [];

        if(!clusterImport || typeof(clusterImport) !== 'string'){
            console.warn('Import cluster is empty or wrong type provided');
            console.debug(clusterImport);
            return false;
        }

        // try parsing cluster import to json
        try {
            clusterJson = JSON.parse(clusterImport);
        }catch(e){
            console.error('Unable to import cluster. Parser error.');
            return false;
        }

        if(!clusterJson) {
            console.warn('Imported cluster seems to be empty or in wrong format');
            return false;
        }

        // reset cluster data
        this.reset();

        // set  new cluster info
        this.name = clusterJson.name;
        this.version = clusterJson.stack_version;
        this.security = (clusterJson.security_type == 'KERBEROS') ? 'Kerberos' : 'None';
        /* Array with checksum objects {idx: Index in node array, chksum: calc. Checksum}*/
        var chksums = [];

        // add nodes to cluster
        for(var key in clusterJson.hosts_info){
            var nodeData = clusterJson.hosts_info[key];
            var nodeIdx = null;
            var nodeComps = [];
            var nodeZone = '';
            var nodeChksum = "";

            // validate data
            if(!nodeData || typeof(nodeData['host_name']) !== 'string'){
                console.warn('wrong type addNode');
                continue
            }

            if(nodeData['zone'] && nodeData['zone'] != ''){
                nodeZone = nodeData['zone'];
            }

            // prepare components
            for(var compKey in nodeData['components']){
                var compId = nodeData['components'][compKey];
                // search component object
                var comp = DefEnvironment.getComponentById(compId.toLowerCase());
                if(comp instanceof Component){
                    nodeComps.push(comp);
                }                  
            }

            // calc checksum
            nodeChksum = this.calcNodeChksum(nodeComps, nodeZone);

            // check whether calc. checksum is already available
            var isNodeDuplicate = false;
            var avNodeIdx = null;
            for(var ck in chksums){
                if(chksums[ck]['chksum'] == nodeChksum){
                    avNodeIdx = chksums[ck]['idx'];
                    isNodeDuplicate = true;
                    break;
                }
            }

            if(isNodeDuplicate){
                // TODO: implement url array 
                //this.nodes[avNodeIdx].addHost(nodeData['host_name'], nodeData['url']);
                this.nodes[avNodeIdx].addHost(nodeData['host_name']);
                continue;
            }

            // add new Node
            nodeIdx = this.addNode([nodeData['host_name']], nodeComps, nodeZone);

            if(nodeIdx < 0){
                console.warn('Error creating new node');
                continue;
            }

            // save chksum
            chksums.push({'idx': nodeIdx, 'chksum': nodeChksum});
        }

        // process cluster configuration
        var configItems = [];
        for(var key in clusterJson.config){
            var config = clusterJson.config[key];
            var configObj = new Config(config.type, config.tag, config.props);
            configItems = configItems.concat(configObj.items);
            configs.push(configObj);
        }
        this.config = configs;
        this.configItems = configItems;

        console.info('Cluster imported');
    };

    /**
     * Adds a new node  to the cluster
     * @param {String[]} hostname of the new node
     * @param {Component[]} comps List of components
     * @param {String} firewall or network zone (optional)
     * @returns Index of added node or -1
     **/
    Cluster.prototype.addNode = function(hostname, comps, nzone){
        // validate data
        if(!hostname || typeof(hostname) !== 'object'){
            console.error('wrong type addNode');
            return -1;
        }

        // add new node
        var node = new Node(Node.newId(), hostname, nzone);
        if(!node){
            return -1;
        }

        // add given components
        node.addComponents(comps);
        var idx = this.nodes.push(node);
        return idx - 1;
    };

    /**
     * @returns the node with the given name or null
     **/
    Cluster.prototype.getNodeByName = function(name){
        for(var k in this.nodes){
            if(this.nodes[k].name === name){
                return this.nodes[k];
            }
        }
        return null;
    };

    /**
     * Returns the config item with the given id
     * @param {string} id of the config item
     * @returns {ConfigItem} 
     **/
    Cluster.prototype.getConfigItemById = function(groupId, itemId){
        for(var gKey in this.config){
            if(this.config[gKey].id === groupId){
                var group = this.config[gKey];
                for(var k in group.items){
                    if(group.items[k].id === itemId){
                        return group.items[k];
                    }
                }
            }
        }
        return null;
    };

    /**
     * Calculates the checksum of the given comps.
     * Used to see if two nodes are equal.
     * @param {Component[]} Array of components
     * @returns calculated checksum
     */
    Cluster.prototype.calcCompChecksum = function(comps){
        if(comps && comps.length <= 0){
            return '';
        }

        var compIds = [];
        for(var key in comps){
            compIds.push(comps[key].getSName());
        }
        return compIds.sort().toString();
    };

    /**
     * Calculates the checksum of the given comps 
     * and the network zone.
     * @param {Component[]} Array of components
     * @param {String} network zone
     * @returns calculated checksum
     */
    Cluster.prototype.calcNodeChksum = function(comps, zone){
        if(!zone){
            zone = '';
        }
        return zone + '#' + this.calcCompChecksum(comps);
    };

    return Cluster;
}]);


/**
 * Node Model
 * A node can represent a single or multiple physical nodes. 
 * Multiple physical nodes share the same component structure
 * and have a cardinality > 1
 **/
app.factory('Node', ['Component', function(Component){
    function Node(nodeId, hostnames, nzone){
        /* {string} Unique id of this node */
        this.id = nodeId;
        /* @Deprecated {string} FQDN of the node */
        this.url = '';
        /* {string} Name of the node */
        this.name = hostnames[0];
        /* {Component[]} Collection of node components */
        this.comps = [];
        /* {string} A single or multiple hostnames of the nodes */
        this.hostnames = (hostnames) ? hostnames : [];
        /* {int} card Cardinality of this node, this should be 
        identical to the number of elems in hostnames */
        this.card = (hostnames.length > 0) ? hostnames.length : 1;
        /* {string} [zone] network or firewall zone (optional) */
        this.zone = (nzone && nzone != '') ? nzone : '';
    }

    Node.CONF = {
        identifier : 'NODE',
        identifier_count : 0
    };

    /**
     * @returns a new unique node id
     **/
    Node.newId = function(){
        return Node.CONF.identifier + '-' + (++Node.CONF.identifier_count);
    };

    /**
     * Calculates the checksum of this node and updates the 
     * necessary params. Used to see if two nodes are equal.
     * @returns calculated checksum
     */
    Node.prototype.calcChecksum = function(){
        var comps = this.comps;
        if(comps && comps.length <= 0){
            return '';
        }

        var compIds = [];
        for(var key in comps){
            compIds.push(comps[key].getSName());
        }

        return compIds.sort().toString();
    };

    /**
     * Adds a physical host to this node. 
     * This increases the cardinality by 1!
     * @param {String} hostname Hostname to be added
     */
    Node.prototype.addHost = function(hostname){
        if(typeof(hostname) != 'string'){
            console.warn('Cannot add host to node, invalid hostname!');
            return;
        }
        this.hostnames.push(hostname);
        this.card += 1;
    };

    /**
     * Adds multiple service components to the node.
     * @param {Component[]} comps list of components
     */
    Node.prototype.addComponents = function(comps){
        for(var comp in comps){
            this.addComponent(comps[comp]);
        }
    };

    /**
     * Adds a new service component to the node.
     * @param {Component} comp component to be added
     * @returns True if successful
     **/
    Node.prototype.addComponent = function(comp){
        if(!(comp instanceof Component)){
            console.warn('Invalid component received');
            return false;
        }

        // validate components store
        if(!this.comps){
            console.debug('Components array needs to be reset');
            this.comps = [];
        }

        // create component and add it to component store
        if(!this.hasComponent(comp.id)){
            this.comps.push(comp);    
        }else{
            console.warn('Warning! Node: ' + this.name + ' already has given component: ' + comp.name);
            return false;
        }

        return true;
    };

    /**
     * @returns List of shortnames of services that are part of this node 
     **/
    // @TODO: remove quick-n-dirty solution
    Node.prototype.getNodeServices = function(){
        res = {};
        for(var key in this.comps){
            var comp = this.comps[key];
            res[comp.service.shortname] = comp.service;
        }
        return res;
    };

    /**
     * Checks wheter this node has the component with the
     * given name
     * @param {string} needle search string
     * @returns False if not successful, otherwise true
     **/
    Node.prototype.hasComponent = function(needle){
        // search component with given name
        for(var comp in this.comps){
            if(this.comps[comp].id === needle){
                return true;
            }
        }
        return false;
    };

    /**
     * @returns The hostname in case of a single physical node
     *          otherwise returns the string "Multiple Hosts".
     */
    Node.prototype.getHostname = function(){
        if(this.hostnames && this.hostnames.length == 1){
            return this.hostnames[0];
        }
        return 'Multiple Hosts';
    };

    /**
     * @returns {int} The cardinality of this node
     */
    Node.prototype.getCardinality = function(){
        // validate the cardinality before returning it
        if(this.card != this.hostnames.length){
            console.warn('Node has inconsistent data');
        }
        return this.card;
    };

    return Node;
}]);


/**
 * Service Model
 **/
app.factory('Service', ['Component', function(Component){
    function Service(id, group_a, group_b, group_c, name, shortname, baseColor, fontColor, comps){
        /* {string} Unique ID of this service */
        this.id = id;
        /* {string} Assigned group of this service (multiple pre-groupings are available) */
        this.group_a = group_a;
        this.group_b = group_b;
        this.group_c = group_c;
        /* {string} HEX-color for the background */
        this.baseColor = baseColor;
        /* {string} HEX-color for the font */
        this.fontColor = fontColor;
        /* {string} Long name of this service */
        this.name = name;
        /* {string} Short name (max. 7 letter) identifier */
        this.shortname = shortname;
        /* {Component[]} List of service components */
        this.comps = [];

        if(comps){
            this.addComponents(comps);
        }
    }

    /**
     * Adds mutliple components to the service.
     * @param {Object} Components to be added
     **/
    Service.prototype.addComponents = function(comps){
        for(comp in comps){
            this.addComponent(comps[comp].id, comps[comp].name, comps[comp].shortname, comps[comp].blueprint, comps[comp].ctype);
        }
    };

    /**
     * Adds a component to this service
     * @param {string} long name of this component
     * @param {string} short name of this component
     * @returns True if successful
     **/
    Service.prototype.addComponent = function(id, name, shortname, isBlueprintable, ctype){
        if(!id || typeof(id) !== 'string'){
            console.warn('Invalid Component received');
            return false;
        }

        // add component
        this.comps.push(new Component(id, this, name, shortname, isBlueprintable, ctype));
        return true;
    };

    /**
     * Checks wheter this service has a component with the
     * given long name
     * @param {string} needle search string
     * @returns False if not successful, otherwise found Component
     **/
    Service.prototype.hasComponent = function(needle){
        // search component with given name
        for(var comp in this.comps){
            if(this.comps[comp].id === needle){
                return this.comps[comp];
            }
        }
        return false;
    };

    /**
     * Exports the given service so that enviornment changes can be imported and exported.
     **/
    Service.prototype.expService = function(){
        var res = {
            'group_a' : this.group_a,
            'group_b' : this.group_b,
            'group_c' : this.group_c,
            'base_color' : this.baseColor,
            'font_color' : this.fontColor,
            'name' : this.name,
            'shortname': this.shortname,
            'components' : []
        };

        // export components
        for(var ckey in this.comps){
            var comp = this.comps[ckey];
            res['components'].push(comp.exportComp());
        }
        return res;
    };

    return Service;
}]);

/**
 * Component Model
 **/
app.factory('Component', function(){
    function Component(id, service, name, shortname, isBlueprintable, cctype){
        /* {string} unique id of this component */
        this.id = id;
        /* {string} Long name of this component */
        this.name = name;
        /* {string} short name of this component (max. 7 letters) */
        this.shortname = shortname;
        /* {Service} Back reference to parent service */
        this.service = service;
        /* {boolean} true if this component is supported by blueprints */
        this.blueprint = isBlueprintable;
        /* {string} ['s','w','m','o'] Type of component 
            o=other (default)
            w=worker
            c=client
            m=master
        */
        this.ctype = (['c','w','m','o'].indexOf(cctype) >= 0) ? cctype : 'o';
    }

    /**
     * @returns True if this component supports blueprints
     */ 
    Component.prototype.isBlueprintable = function(){
        return this.blueprint;
    };

    /**
     * @Returns the short name of this component
     **/
    Component.prototype.getSName = function(){
        return this.shortname;
    };

    /**
     * @Returns an exported version of the component (format like in env.)
     **/
    Component.prototype.exportComp = function(){
        return {'id': this.id, 'name': this.name , 'shortname': this.shortname, 'blueprint': this.blueprint, 'ctype': this.ctype};
    };

    return Component;
});


/**
 * Enviornment Model
 **/
app.factory('Environment', ['Service', function(Service){
    function Environment(input){
        /* {Service[]} List of services */
        this.services = [];
        /* {Component[]} List of all components */
        this.comps = [];
        /* {Object} Imported service and component configuration */
        this.servicesJson = {}; 

        // process initial input
        this.loadEnv(input);
    }

    /**
     * Converts the given Json string into an object and tries
     * to load the environment.
     * @param {JsonString} input New environment
     * @returns True when succesful, false otherwise
     **/
    Environment.prototype.loadEnvFromJsonStr = function(input){
        try {
            var clusterJson = JSON.parse(input);
            return this.loadEnv(clusterJson);
        }catch(e){
            console.error('Unable to parse given json string (enviornment). Parser error.');
        }
        return false;
    };

    /**
     * Exports the services and components that are currently part of this enviornment
     * @returns The result JSON string or an empty string
     **/
    Environment.prototype.expEnv = function(input){
        // exported services
        var res = {};

        // process all services
        for(var key in this.services){
            var service = this.services[key];
            res[service.id] = service.expService();
        }

        // dump export
        try {
            return JSON.stringify(res);
        }catch(e){
            console.error('Unable to export and stringify current enviornment. Parser error.');
        }
        return '';
    };

    /**
     * Creates or updates the enviornment with the given input
     * @param {Json Object} input Json, services definition / specification
     * @returns true when successful, false otherwise
     **/
    Environment.prototype.loadEnv = function(input){
        if(!input || typeof(input) !== 'object'){
            console.warn('Wrong enviornment input');
            return false;
        }
        this.servicesJson = input;

        // process input
        var envServices = [];
        var envComps = [];
        var isFoundDefault = false;

        // process imported services
        for(var service in input){
            var comps = null;
            var serviceNew = null;
            var serviceInfo  = input[service];
            if(service === 'default'){
                comps = [];
                isFoundDefault = true;
            }else{
                comps = serviceInfo['components'];
            }

            // add service
            serviceNew = new Service(
                service,
                serviceInfo['group_a'],
                serviceInfo['group_b'],
                serviceInfo['group_c'],
                serviceInfo['name'],
                serviceInfo['shortname'],
                serviceInfo['base_color'],
                serviceInfo['font_color'],
                comps
            );

            // push to store
            envServices.push(serviceNew);
            envComps = envComps.concat(serviceNew.comps);
        }

        // add default service if no default service was found in the passed object
        if(!isFoundDefault){
            envServices.push(new Service('default', 0, 0, 'Default', 'DEF', '#000000', '#000000', []));
        }
        // store import
        this.services = envServices;
        this.comps = envComps;
        return true;
    };

    /**
     * Tries to find the component with the given name
     * @param {String} id Id of the component
     * @returns Found component or null
     **/
    Environment.prototype.getComponentById = function(id){
        // try to find component
        for(var key in this.comps){
            if(this.comps[key].id === id){
                return this.comps[key];
            }
        }
        return null;
    };

    /**
     * Tries to find the service with the given id
     * @param {String} id Id of the service
     * @returns Found service or null
     **/
    Environment.prototype.getServiceById = function(id){
        // try to find service
        for(var key in this.services){
            if(this.services[key].id === id){
                return this.services[key];
            }
        }
        return null;
    };

    /**
     * @Returns the enviornment behind servicesJson as string
     **/
    Environment.prototype.getStoredEnvAsStr = function(){
        if(this.servicesJson){
            try {
                return JSON.stringify(this.servicesJson);
            }catch(e){
                console.error('Unable to generate String from services json');
                return '';
            }
        }
        return '';
    };

    return Environment;
}]);


/**
 * Config Model
 **/
app.factory('Config', ['ConfigItem', function(ConfigItem){
    function Config(id, tag, props){
        /* {string} Config id (e.g. hdfs-site) */
        this.id = id;
        /* {string} Config version tag */
        this.tag = tag;
        /* {Object[]} Configuration items/properties */
        this.items = [];

        // import properties/items
        this.addItems(props);
    }

    /**
     * Adds mutliple config items.
     * @param {Object} props Items to be added
     **/
    Config.prototype.addItems = function(props){
        if(!props){
            console.debug('Config, no config items passed to set');
            return;
        }

        // process config items
        for(var key in props){
            this.addItem(key.toLowerCase(), props[key]);
        }
    };

    /**
     * Adds a single config item
     * @param {string} id of this config item
     * @param {string} val value
     * @returns True if successful
     **/
    Config.prototype.addItem = function(id, val){
        if(!id || typeof(id) !== 'string'){
            console.warn('Invalid config item received: ' + id);
            return false;
        }

        // add config item
        this.items.push(new ConfigItem(id, val));
        return true;
    };

    return Config;
}]);

/**
 * ConfigItem Model
 **/
app.factory('ConfigItem', function(){
    function ConfigItem(id, val){
        /* {string} Config id (e.g. hdfs-site) */
        this.id = id;
        /* {string} value */
        this.val = val;
        /* {int} status Diff status
        1.Equal (val equal)
        2.New (left=yes; right=no)
        3.Change (val dif)
        (4.Removed (left=no; right=yes))
        Default: 0
        */
        this.status = 0;
    }

    /**
     * Sets the new status of this config item by comparing it 
     * to the passed value. If passed value = undefined => status = new (2)
     **/
    ConfigItem.prototype.setStatus = function(difVal){
        if(difVal === undefined){
            this.status = 2;
        }else if(difVal === this.val){
            this.status = 1;
        } else if(difVal !== this.val){
            this.status = 3;
            console.warn('difval: ' + difVal + ' val:'+this.val);
        }
    };

    return ConfigItem;
});


app.service('DefEnvironment', function(Environment) {
    var _defaultEnvJson = {
            'ambari_infra' : {
                'group_a' : 32,
                'group_b' : 'Management',
                'group_c' : '',
                'base_color' : '#FE2E4B',
                'font_color' : 'white',
                'name' : 'Ambari Infra',
                'shortname': 'AMB_INF',
                'components' : [
                    {'id': 'infra_solr_client', 'name': 'Infra Solr Client' , 'shortname' : 'INF_SC', 'blueprint': false, 'ctype': 'c'},
                    {'id': 'infra_solr', 'name': 'Infra Solr' , 'shortname' : 'INF_S', 'blueprint': false, 'ctype': 'm'}
                ]
            },
            'ambari_metrics' : {
                'group_a' : 32,
                'group_b' : 'Monitoring',
                'group_c' : '',
                'base_color' : 'blue',
                'font_color' : 'white',
                'name' : 'Ambari Metrics',
                'shortname': 'AMS',
                'components' : [
                    {'id': 'metrics_collector', 'name': 'Metrics Collector' , 'shortname' : 'AMS_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'metrics_monitor', 'name': 'Metrics Monitor' , 'shortname' : 'AMS_M', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'atlas' : {
                'group_a' : 38,
                'group_b' : 'Governance',
                'group_c' : '',
                'base_color' : 'green',
                'font_color' : 'white',
                'name' : 'Atlas',
                'shortname': 'ATLS',
                'components' : [
                    {'id': 'atlas_client', 'name': 'Atlas Client' , 'shortname' : 'ATLS_C', 'blueprint': false, 'ctype': 'c'},
                    {'id': 'atlas_server', 'name': 'Atlas Server' , 'shortname' : 'ATLS_M', 'blueprint': false, 'ctype': 'm'}
                ]
            },
            'falcon' : {
                'group_a' : 2,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'Falcon',
                'shortname': 'FAL',
                'components' : [
                    {'id': 'falcon_client', 'name': 'Falcon Client' , 'shortname': 'FAL_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'falcon_server', 'name': 'Falcon Server' , 'shortname': 'FAL_S', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'flume' : {
                'group_a' : 3,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'Flume',
                'shortname': 'FL',
                'components' : [
                    {'id': 'flume_handler', 'name': 'Flume Handler' , 'shortname': 'FL', 'blueprint': true}
                ]
            },
            'ganglia' : {
                'group_a' : 32,
                'group_b' : 'Monitoring',
                'group_c' : '',
                'base_color' : 'blue',
                'font_color' : 'white',
                'name' : 'Ganglia',
                'shortname': 'GG',
                'components' : [
                    {'id': 'ganglia_monitor', 'name': 'Ganglia Monitor' , 'shortname': 'GG_M', 'blueprint': false},
                    {'id': 'ganglia_server', 'name': 'Ganglia Server' , 'shortname': 'GG_S', 'blueprint': false}
                ]
            },
            'hbase' : {
                'group_a' : 5,
                'group_b' : 'Storage',
                'group_c' : '',
                'base_color' : 'red',
                'font_color' : '',
                'name' : 'HBase',
                'shortname': 'HB',
                'components' : [
                    {'id': 'hbase_client', 'name': 'Hbase Client' , 'shortname': 'HB_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'hbase_master', 'name': 'Hbase Master' , 'shortname': 'HB_M', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'hbase_regionserver', 'name': 'Hbase Regionserver' , 'shortname': 'HB_R', 'blueprint': true, 'ctype': 'w'}
                ]
            },
            'hdfs' : {
                'group_a' : 6,
                'group_b' : 'Storage',
                'group_c' : '',
                'base_color' : 'yellow',
                'font_color' : '',
                'name' : 'HDFS',
                'shortname': 'HDFS',
                'components' : [
                    {'id': 'datanode', 'name': 'Datanode' , 'shortname': 'DN', 'blueprint': true, 'ctype': 'w'},
                    {'id': 'hdfs_client', 'name': 'Hdfs Client' , 'shortname': 'HDFS_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'journalnode', 'name': 'Journalnode' , 'shortname': 'JN', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'namenode', 'name': 'Namenode' , 'shortname': 'NN', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'secondary_namenode', 'name': 'Secondary Namenode' , 'shortname': 'SNN', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'zkfc', 'name': 'ZK Failover Controller' , 'shortname': 'ZKFC', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'kafka' : {
                'group_a' : 7,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'Kafka',
                'shortname': 'KAFKA',
                'components' : [
                    {'id': 'kafka_broker', 'name': 'Kafka Broker' , 'shortname': 'KAFKA', 'blueprint': true}
                ]
            },
            'kerberos' : {
                'group_a' : 31,
                'group_b' : 'Security',
                'group_c' : '',
                'base_color' : '#000',
                'font_color' : '#fff',
                'name' : 'Kerberos',
                'shortname': 'KERB',
                'components' : [
                    {'id': 'kerberos_client', 'name': 'Kerberos Client' , 'shortname': 'KERB_C', 'blueprint': false, 'ctype': 'c'}
                ]
            },
            'knox' : {
                'group_a' : 31,
                'group_b' : 'Security',
                'group_c' : '',
                'base_color' : 'black',
                'font_color' : 'white',
                'name' : 'Knox',
                'shortname': 'KNOX',
                'components' : [
                    {'id': 'knox_gateway', 'name': 'Knox Gateway' , 'shortname': 'KNOX', 'blueprint': true}
                ]
            },
            'mapreduce2' : {
                'group_a' : 30,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'tomato',
                'font_color' : '',
                'name' : 'MapReduce',
                'shortname': 'MR',
                'components' : [
                    {'id': 'historyserver', 'name': 'Historyserver' , 'shortname': 'JHS', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'mapreduce2_client', 'name' : 'Mapreduce2 Client', 'shortname': 'MR', 'blueprint': true, 'ctype': 'c'}
                ]
            },
            'nifi' : {
                'group_a' : 22,
                'group_b' : 'Dataflow',
                'group_c' : '',
                'base_color' : '#728e9b',
                'font_color' : 'white',
                'name' : 'Nifi',
                'shortname': 'NIFI',
                'components' : [
                    {'id': 'nifi_master', 'name': 'Nifi Server' , 'shortname': 'NIFI', 'blueprint': false, 'ctype': 'm'},
                    {'id': 'nifi_ca', 'name': 'Nifi CA' , 'shortname': 'NIFI_CA', 'blueprint': false, 'ctype': 'w'}
                ]
            },
            'oozie' : {
                'group_a' : 11,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'lightblue',
                'font_color' : '',
                'name' : 'Oozie',
                'shortname': 'OZ',
                'components' : [
                    {'id': 'oozie_client', 'name': 'Oozie Client' , 'shortname': 'OZ_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'oozie_server', 'name': 'Oozie Server' , 'shortname': 'OZ_S', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'pig' : {
                'group_a' : 33,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'pink',
                'font_color' : '',
                'name' : 'Pig',
                'shortname': 'PIG',
                'components' : [
                    {'id': 'pig', 'name': 'Pig' , 'shortname': 'PIG', 'blueprint': true, 'ctype': 'c'}
                ]
            },
            'ranger' : {
                'group_a' : 31,
                'group_b' : 'Security',
                'group_c' : '',
                'base_color' : '#000',
                'font_color' : '#fff',
                'name' : 'Ranger',
                'shortname': 'RG',
                'components' : [
                    {'id': 'ranger_admin', 'name': 'Ranger Admin' , 'shortname': 'RG_ADM', 'blueprint': false, 'ctype': 'm'},
                    {'id': 'ranger_usersync', 'name': 'Ranger Usersync' , 'shortname': 'RG_USR', 'blueprint': false, 'ctype': 'm'}
                ]
            },
            'ranger_kms' : {
                'group_a' : 31,
                'group_b' : 'Security',
                'group_c' : '',
                'base_color' : '#000',
                'font_color' : '#fff',
                'name' : 'Ranger KMS',
                'shortname': 'RGK',
                'components' : [
                    {'id': 'ranger_kms_server', 'name': 'Ranger KMS Server' , 'shortname': 'RG_KMS', 'blueprint': false, 'ctype': 'm'}
                ]
            },
            'slider' : {
                'group_a' : 14,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'Slider',
                'shortname': 'SLID',
                'components' : [
                    {'id': 'slider', 'name': 'Slider' , 'shortname': 'SLID', 'blueprint': true}
                ]
            },
            'spark' : {
                'group_a' : 15,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'spark',
                'shortname': 'SPR',
                'components' : [
                    {'id': 'spark_client', 'name': 'Spark Client' , 'shortname': 'SPR_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'spark_jobhistoryserver', 'name': 'Spark Jobhistoryserver' , 'shortname': 'SPR_HS', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'spark_thriftserver', 'name': 'Spark Thrift Server' , 'shortname': 'SPR_TS', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'livy_server', 'name': 'Spark Livy Server' , 'shortname': 'SPR_LS', 'blueprint': true, 'ctype': 'm'}

                ]
            },
            'sqoop' : {
                'group_a' : 16,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : '',
                'font_color' : '',
                'name' : 'Sqoop',
                'shortname': 'SQP',
                'components' : [
                    {'id': 'sqoop', 'name': 'Sqoop' , 'shortname': 'SQP', 'blueprint': true, 'ctype': 'c'}
                ]
            },
            'storm' : {
                'group_a' : 17,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'orange',
                'font_color' : '',
                'name' : 'Storm',
                'shortname': 'STR',
                'components' : [
                    {'id': 'drpc_server', 'name': 'Drpc Server' , 'shortname': 'DRPC', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'nimbus', 'name': 'Nimbus' , 'shortname': 'NBM', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'storm_ui_server', 'name': 'Storm UI Server' , 'shortname': 'STR_UI', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'supervisor', 'name': 'Supervisor' , 'shortname': 'SPS', 'blueprint': true, 'ctype': 'w'}
                ]
            },
            'tez' : {
                'group_a' : 33,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'pink',
                'font_color' : '',
                'name' : 'Tez',
                'shortname': 'TEZ',
                'components' : [
                    {'id': 'tez_client', 'name': 'Tez Client' , 'shortname': 'TEZ', 'blueprint': true, 'ctype': 'c'}
                ]
            },
            'yarn' : {
                'group_a' : 30,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'tomato',
                'font_color' : '',
                'name' : 'Yarn',
                'shortname': 'YARN',
                'components' : [
                    {'id': 'app_timeline_server', 'name': 'App Timeline Server' , 'shortname': 'ATS', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'nodemanager', 'name': 'Nodemanager' , 'shortname': 'NM', 'blueprint': true, 'ctype': 'w'},
                    {'id': 'resourcemanager', 'name': 'Resourcemanager' , 'shortname': 'RM', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'yarn_client', 'name': 'Yarn Client' , 'shortname': 'YARN_C', 'blueprint': true, 'ctype': 'c'}
                ]
            },
            'zookeeper' : {
                'group_a' : 20,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'green',
                'font_color' : 'white',
                'name' : 'Zookeeper',
                'shortname': 'ZK',
                'components' : [
                    {'id': 'zookeeper_client', 'name': 'Zookeeper Client' , 'shortname': 'ZK_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'zookeeper_server', 'name': 'Zookeeper Server' , 'shortname': 'ZK_S', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'hive' : {
                'group_a' : 33,
                'group_b' : 'Storage',
                'group c' : '',
                'base_color' : 'pink',
                'font_color' : '',
                'name' : 'Hive',
                'shortname': 'HIVE',
                'components' : [
                    {'id': 'hcat', 'name': 'Hcat' , 'shortname': 'HCAT', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'hive_client', 'name': 'Hive Client' , 'shortname': 'HIVE_C', 'blueprint': true, 'ctype': 'c'},
                    {'id': 'hive_metastore', 'name': 'Hive Metastore' , 'shortname': 'HIVE_MS', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'hive_server', 'name': 'Hive Server' , 'shortname': 'HIVE_S', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'mysql_server', 'name': 'Mysql Server' , 'shortname': 'MYSQL', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'webhcat_server', 'name': 'Webhcat Server' , 'shortname': 'WHCAT', 'blueprint': true, 'ctype': 'm'}
                ]
            },
            'zeppelin' : {
                'group_a' : 34,
                'group_b' : 'Visualization',
                'group_c' : '',
                'base_color' : '#3071a9',
                'font_color' : 'white',
                'name' : 'Zepplin',
                'shortname': 'ZPLN',
                'components' : [
                    {'id': 'zeppelin_master', 'name': 'Zeppelin Master' , 'shortname': 'ZPLN', 'blueprint': false}
                ]
            },
            'solr' : {
                'group_a' : 35,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'lightgreen',
                'font_color' : '',
                'name' : 'Solr',
                'shortname': 'SOLR',
                'components' : [
                    {'id': 'solr_master', 'name': 'Solr Master' , 'shortname': 'SOLR', 'blueprint': false, 'ctype': 'm'}
                ]
            },
            'hue' : {
                'group_a' : 36,
                'group_b' : 'Processing',
                'group_c' : '',
                'base_color' : 'lightgreen',
                'font_color' : '',
                'name' : 'Hue',
                'shortname': 'HUE',
                'components' : [
                    {'id': 'hue', 'name': 'Hue' , 'shortname': 'HUE'},
                    {'id': 'hue_lizy_jobserver', 'name': 'Hue Lizy Server' , 'shortname': 'HUE_LJS', 'blueprint': false}
                ]
            },
            'ambari' : {
                'group_a' : 32,
                'group_b' : 'Management',
                'group_c' : '',
                'base_color' : 'blue',
                'font_color' : 'white',
                'name' : 'Ambari',
                'shortname': 'AMB',
                'components' : [
                    {'id': 'ambari_server', 'name': 'Ambari Server' , 'shortname': 'AMB_S', 'blueprint': true, 'ctype': 'm'},
                    {'id': 'ambari_agent', 'name': 'Ambari Agent' , 'shortname': 'AMB_AG', 'blueprint': false, 'ctype': 'w'}
                ]
            },
            'custom' : {
                'group_a' : 37,
                'group_b' : 'Custom',
                'group_c' : '',
                'base_color' : 'yellow',
                'font_color' : 'green',
                'name' : 'Custom',
                'shortname': 'CSTM',
                'components' : [
                    {'id': 'neo4j', 'name': 'Neo4J' , 'shortname': 'NEO4J', 'blueprint': false},
                    {'id': 'nlp', 'name': 'NLP' , 'shortname': 'NLP', 'blueprint': false},
                    {'id': 'rstudio', 'name': 'R-Studio' , 'shortname': 'R_STD', 'blueprint': false},
                    {'id': 'rprogramming', 'name': 'R-Programming' , 'shortname': 'R', 'blueprint': false}
                ]
            },
            'default' : {
                'group_a' : 21,
                'group_b' : 'None',
                'group_c' : '',
                'name' : 'Default',
                'shortname': 'DEF',
                'base_color' : 'gray',
                'font_color' : ''
            }
        }

    var defEnv = new Environment(_defaultEnvJson);
    return defEnv;
});

app.service('MainCluster', function(Cluster) {
    var cluster_sample = '{"stack_version": "HDP-2.2", "hosts": ["http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4068.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4069.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4070.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4071.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4072.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4073.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4074.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4075.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4076.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4106.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4107.ambari.apache.org"], "hosts_info": [{"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4068.ambari.apache.org", "host_name": "c4068.ambari.apache.org", "components": ["FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "JOURNALNODE", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NAMENODE", "OOZIE_CLIENT", "PIG", "RESOURCEMANAGER", "SPARK_CLIENT", "SPARK_JOBHISTORYSERVER", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZKFC", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4069.ambari.apache.org", "host_name": "c4069.ambari.apache.org", "components": ["APP_TIMELINE_SERVER", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HISTORYSERVER", "HIVE_CLIENT", "HIVE_METASTORE", "HIVE_SERVER", "JOURNALNODE", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NAMENODE", "OOZIE_CLIENT", "PIG", "RESOURCEMANAGER", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZKFC", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4070.ambari.apache.org", "host_name": "c4070.ambari.apache.org", "components": ["FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "HIVE_METASTORE", "HIVE_SERVER", "JOURNALNODE", "KERBEROS_CLIENT", "KNOX_GATEWAY", "MAPREDUCE2_CLIENT", "METRICS_COLLECTOR", "METRICS_MONITOR", "MYSQL_SERVER", "OOZIE_CLIENT", "OOZIE_SERVER", "PIG", "RANGER_ADMIN", "RANGER_USERSYNC", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "WEBHCAT_SERVER", "YARN_CLIENT", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4071.ambari.apache.org", "host_name": "c4071.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4072.ambari.apache.org", "host_name": "c4072.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4073.ambari.apache.org", "host_name": "c4073.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4074.ambari.apache.org", "host_name": "c4074.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4075.ambari.apache.org", "host_name": "c4075.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4076.ambari.apache.org", "host_name": "c4076.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4106.ambari.apache.org", "host_name": "c4106.ambari.apache.org", "components": ["HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4107.ambari.apache.org", "host_name": "c4107.ambari.apache.org", "components": ["HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZEPPELIN_MASTER", "ZOOKEEPER_CLIENT"]}], "security_type": "KERBEROS", "name": "bigdata"}';
    var mainCluster = new Cluster();
    mainCluster.importCluster(cluster_sample);
    return mainCluster;
});

app.service('BuildCluster', function() {
    /* Cluster meta information */
    this.clusterMeta = {'name': 'Horton-Cluster', 'stack': 'HDP-2.3', 'stackId': 'HDP', 'stackVersion': '2.3', 'isKerberized': 'false'};
    /* Default cluster */
    var defCluster = [{'name': 'gateway.example.com', 'comps': [], 'cardinality': 1}, {'name': 'mgmt.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master01.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master02.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master03.example.com', 'comps': [], 'cardinality': 1}, {'name': 'worker0#{0}.example.com', 'comps': [], 'cardinality': 3}];
    /* Built cluster */
    this.cluster = defCluster;
    /* List of av. bundles, e.g. HDFS HA */
    this.bundles = [{'shortname': 'HDFS_HA', 'name': 'HDFS HA' ,'comps': ['namenode','namenode','journalnode',,'journalnode','journalnode','zkfc','zkfc','zookeeper_server','zookeeper_server','zookeeper_server']}, {'shortname': 'YARN_HA', 'name': 'YARN HA' ,'comps': ['resourcemanager','resourcemanager','zookeeper_server','zookeeper_server','zookeeper_server']}]
});

/**
 * Holds blueprint configs/meta/templates
 */
app.service('Blueprint', function() {
    /* Reset Bundle, True recalculates bundle configurations, False leaves current config,
       This is set to true duringcluste rimport and finalization of build cluster */
    this.resetBundle = true;
    /* Config items */
    this.configItems = {};
    /* HDFS Bundle */
    this.hdfsBundle = {'namenode': 2, 'zkfc': 2, 'journalnode': 3, 'zookeeper_server': 3};
    /* Yarn Bundle */
    this.yarnBundle = {'resourcemanager': 2, 'zookeeper_server': 3, 'historyserver': 1, 'app_timeline_server': 1};
    /* {String} hostgroupPfx prefix of host groups (e.g. host_group_ resolves to host_group_1...) */
    this.hostgroupPfx = 'host_group_';
    /* Config location typeahead */
    this.configLocations = ['admin-properties','capacity-scheduler','cluster-env','core-site','dbks-site','gateway-log4j','gateway-site','hadoop-env','hadoop-policy','hcat-env','hdfs-log4j','hdfs-site','hive-env','hive-exec-log4j','hive-log4j','hive-site','hiveserver2-site','kerberos-env','kms-env','kms-log4j','kms-properties','kms-site','knox-env','krb5-conf','ldap-log4j','mapred-env','mapred-site','oozie-site','pig-env','pig-log4j','pig-properties','ranger-admin-site','ranger-env','ranger-hdfs-audit','ranger-hdfs-plugin-properties','ranger-hdfs-policymgr-ssl','ranger-hdfs-security','ranger-hive-audit','ranger-hive-plugin-properties','ranger-hive-policymgr-ssl','ranger-hive-security','ranger-kms-audit','ranger-kms-policymgr-ssl','ranger-kms-security','ranger-kms-site','ranger-knox-audit','ranger-knox-plugin-properties','ranger-knox-policymgr-ssl','ranger-knox-security','ranger-ugsync-site','ranger-yarn-audit','ranger-yarn-plugin-properties','ranger-yarn-policymgr-ssl','ranger-yarn-security','spark-defaults','spark-env','spark-javaopts-properties','spark-log4j-properties','spark-metrics-properties','ssl-client','ssl-server','tez-env','tez-site','topology','users-ldif','usersync-properties','webhcat-env','webhcat-log4j','webhcat-site','yarn-env','yarn-log4j','yarn-site','zoo.cfg','zookeeper-env','zookeeper-log4j'];

    // TODO: load from external source!!
    this.configIds = ['ambari.hive.db.schema.name','autopurge.purgeinterval','autopurge.snapretaincount','clientport','common.name.for.certificate','content','datadir','datanucleus.autocreateschema','datanucleus.cache.level2.type','dfs.block.access.token.enable','dfs.blockreport.initialdelay','dfs.blocksize','dfs.client.read.shortcircuit','dfs.client.read.shortcircuit.streams.cache.size','dfs.client.retry.policy.enabled','dfs.cluster.administrators','dfs.datanode.address','dfs.datanode.balance.bandwidthpersec','dfs.datanode.data.dir','dfs.datanode.data.dir.mount.file','dfs.datanode.data.dir.perm','dfs.datanode.du.reserved','dfs.datanode.failed.volumes.tolerated','dfs.datanode.http.address','dfs.datanode.https.address','dfs.datanode.ipc.address','dfs.datanode.kerberos.principal','dfs.datanode.keytab.file','dfs.datanode.max.transfer.threads','dfs.domain.socket.path','dfs.encrypt.data.transfer.cipher.suites','dfs.encryption.key.provider.uri','dfs.heartbeat.interval','dfs.hosts.exclude','dfs.http.policy','dfs.https.port','dfs.journalnode.edits.dir','dfs.journalnode.http-address','dfs.journalnode.https-address','dfs.namenode.accesstime.precision','dfs.namenode.audit.log.async','dfs.namenode.avoid.read.stale.datanode','dfs.namenode.avoid.write.stale.datanode','dfs.namenode.checkpoint.dir','dfs.namenode.checkpoint.edits.dir','dfs.namenode.checkpoint.period','dfs.namenode.checkpoint.txns','dfs.namenode.fslock.fair','dfs.namenode.handler.count','dfs.namenode.http-address','dfs.namenode.https-address','dfs.namenode.inode.attributes.provider.class','dfs.namenode.kerberos.internal.spnego.principal','dfs.namenode.kerberos.principal','dfs.namenode.keytab.file','dfs.namenode.name.dir','dfs.namenode.name.dir.restore','dfs.namenode.rpc-address','dfs.namenode.safemode.threshold-pct','dfs.namenode.secondary.http-address','dfs.namenode.stale.datanode.interval','dfs.namenode.startup.delay.block.deletion.sec','dfs.namenode.write.stale.datanode.ratio','dfs.permissions.enabled','dfs.permissions.superusergroup','dfs.replication','dfs.replication.max','dfs.secondary.namenode.kerberos.internal.spnego.principal','dfs.secondary.namenode.kerberos.principal','dfs.secondary.namenode.keytab.file','dfs.support.append','dfs.web.authentication.kerberos.keytab','dfs.web.authentication.kerberos.principal','dfs.webhdfs.enabled','domains','fs.defaultfs','fs.permissions.umask-mode','fs.trash.interval','gateway.gateway.conf.dir','gateway.hadoop.kerberos.secured','gateway.path','gateway.port','ha.failover-controller.active-standby-elector.zk.op.retries','hadoop.http.authentication.cookie.domain','hadoop.http.authentication.kerberos.keytab','hadoop.http.authentication.kerberos.principal','hadoop.http.authentication.signature.secret.file','hadoop.http.authentication.simple.anonymous.allowed','hadoop.http.authentication.type','hadoop.http.filter.initializers','hadoop.kms.audit.aggregation.window.ms','hadoop.kms.authentication.kerberos.keytab','hadoop.kms.authentication.kerberos.name.rules','hadoop.kms.authentication.kerberos.principal','hadoop.kms.authentication.signer.secret.provider','hadoop.kms.authentication.signer.secret.provider.zookeeper.auth.type','hadoop.kms.authentication.signer.secret.provider.zookeeper.connection.string','hadoop.kms.authentication.signer.secret.provider.zookeeper.kerberos.keytab','hadoop.kms.authentication.signer.secret.provider.zookeeper.kerberos.principal','hadoop.kms.authentication.signer.secret.provider.zookeeper.path','hadoop.kms.authentication.type','hadoop.kms.cache.enable','hadoop.kms.cache.timeout.ms','hadoop.kms.current.key.cache.timeout.ms','hadoop.kms.key.provider.uri','hadoop.kms.security.authorization.manager','hadoop.proxyuser.hcat.groups','hadoop.proxyuser.hcat.hosts','hadoop.proxyuser.hdfs.groups','hadoop.proxyuser.hdfs.hosts','hadoop.proxyuser.hive.groups','hadoop.proxyuser.hive.hosts','hadoop.proxyuser.http.groups','hadoop.proxyuser.http.hosts','hadoop.proxyuser.knox.groups','hadoop.proxyuser.knox.hosts','hadoop.proxyuser.ranger.groups','hadoop.proxyuser.ranger.hosts','hadoop.proxyuser.root.groups','hadoop.proxyuser.root.hosts','hadoop.proxyuser.yarn.groups','hadoop.proxyuser.yarn.hosts','hadoop.registry.rm.enabled','hadoop.registry.zk.quorum','hadoop.rpc.protection','hadoop.security.authentication','hadoop.security.authorization','hadoop.security.key.provider.path','hadoop.security.keystore.javakeystoreprovider.password','hive.auto.convert.join','hive.auto.convert.join.noconditionaltask','hive.auto.convert.join.noconditionaltask.size','hive.auto.convert.sortmerge.join','hive.auto.convert.sortmerge.join.to.mapjoin','hive.cbo.enable','hive.cli.print.header','hive.cluster.delegation.token.store.class','hive.cluster.delegation.token.store.zookeeper.connectstring','hive.cluster.delegation.token.store.zookeeper.znode','hive.compactor.abortedtxn.threshold','hive.compactor.check.interval','hive.compactor.delta.num.threshold','hive.compactor.delta.pct.threshold','hive.compactor.initiator.on','hive.compactor.worker.threads','hive.compactor.worker.timeout','hive.compute.query.using.stats','hive.conf.restricted.list','hive.convert.join.bucket.mapjoin.tez','hive.default.fileformat','hive.default.fileformat.managed','hive.enforce.bucketing','hive.enforce.sorting','hive.enforce.sortmergebucketmapjoin','hive.exec.compress.intermediate','hive.exec.compress.output','hive.exec.dynamic.partition','hive.exec.dynamic.partition.mode','hive.exec.failure.hooks','hive.exec.max.created.files','hive.exec.max.dynamic.partitions','hive.exec.max.dynamic.partitions.pernode','hive.exec.orc.compression.strategy','hive.exec.orc.default.compress','hive.exec.orc.default.stripe.size','hive.exec.orc.encoding.strategy','hive.exec.parallel','hive.exec.parallel.thread.number','hive.exec.post.hooks','hive.exec.pre.hooks','hive.exec.reducers.bytes.per.reducer','hive.exec.reducers.max','hive.exec.scratchdir','hive.exec.submit.local.task.via.child','hive.exec.submitviachild','hive.execution.engine','hive.fetch.task.aggr','hive.fetch.task.conversion','hive.fetch.task.conversion.threshold','hive.limit.optimize.enable','hive.limit.pushdown.memory.usage','hive.map.aggr','hive.map.aggr.hash.force.flush.memory.threshold','hive.map.aggr.hash.min.reduction','hive.map.aggr.hash.percentmemory','hive.mapjoin.bucket.cache.size','hive.mapjoin.optimized.hashtable','hive.mapred.reduce.tasks.speculative.execution','hive.merge.mapfiles','hive.merge.mapredfiles','hive.merge.orcfile.stripe.level','hive.merge.rcfile.block.level','hive.merge.size.per.task','hive.merge.smallfiles.avgsize','hive.merge.tezfiles','hive.metastore.authorization.storage.checks','hive.metastore.cache.pinobjtypes','hive.metastore.client.connect.retry.delay','hive.metastore.client.socket.timeout','hive.metastore.connect.retries','hive.metastore.execute.setugi','hive.metastore.failure.retries','hive.metastore.kerberos.keytab.file','hive.metastore.kerberos.principal','hive.metastore.pre.event.listeners','hive.metastore.sasl.enabled','hive.metastore.server.max.threads','hive.metastore.uris','hive.metastore.warehouse.dir','hive.optimize.bucketmapjoin','hive.optimize.bucketmapjoin.sortedmerge','hive.optimize.constant.propagation','hive.optimize.index.filter','hive.optimize.metadataonly','hive.optimize.null.scan','hive.optimize.reducededuplication','hive.optimize.reducededuplication.min.reducer','hive.optimize.sort.dynamic.partition','hive.orc.compute.splits.num.threads','hive.orc.splits.include.file.footer','hive.prewarm.enabled','hive.prewarm.numcontainers','hive.security.authenticator.manager','hive.security.authorization.enabled','hive.security.authorization.manager','hive.security.metastore.authenticator.manager','hive.security.metastore.authorization.auth.reads','hive.security.metastore.authorization.manager','hive.server2.allow.user.substitution','hive.server2.authentication','hive.server2.authentication.kerberos.keytab','hive.server2.authentication.kerberos.principal','hive.server2.authentication.spnego.keytab','hive.server2.authentication.spnego.principal','hive.server2.enable.doas','hive.server2.logging.operation.enabled','hive.server2.logging.operation.log.location','hive.server2.support.dynamic.service.discovery','hive.server2.table.type.mapping','hive.server2.tez.default.queues','hive.server2.tez.initialize.default.sessions','hive.server2.tez.sessions.per.default.queue','hive.server2.thrift.http.path','hive.server2.thrift.http.port','hive.server2.thrift.max.worker.threads','hive.server2.thrift.port','hive.server2.thrift.sasl.qop','hive.server2.transport.mode','hive.server2.use.ssl','hive.server2.zookeeper.namespace','hive.smbjoin.cache.rows','hive.stats.autogather','hive.stats.dbclass','hive.stats.fetch.column.stats','hive.stats.fetch.partition.stats','hive.support.concurrency','hive.tez.auto.reducer.parallelism','hive.tez.container.size','hive.tez.cpu.vcores','hive.tez.dynamic.partition.pruning','hive.tez.dynamic.partition.pruning.max.data.size','hive.tez.dynamic.partition.pruning.max.event.size','hive.tez.input.format','hive.tez.java.opts','hive.tez.log.level','hive.tez.max.partition.factor','hive.tez.min.partition.factor','hive.tez.smb.number.waves','hive.txn.manager','hive.txn.max.open.batch','hive.txn.timeout','hive.user.install.directory','hive.vectorized.execution.enabled','hive.vectorized.execution.reduce.enabled','hive.vectorized.groupby.checkinterval','hive.vectorized.groupby.flush.percent','hive.vectorized.groupby.maxentries','hive.zookeeper.client.port','hive.zookeeper.namespace','hive.zookeeper.quorum','initlimit','io.compression.codecs','io.file.buffer.size','io.serializations','ipc.client.connect.max.retries','ipc.client.connection.maxidletime','ipc.client.idlethreshold','ipc.server.tcpnodelay','java.security.auth.login.config','java.security.krb5.conf','javax.jdo.option.connectiondrivername','javax.jdo.option.connectionpassword','javax.jdo.option.connectionurl','javax.jdo.option.connectionusername','jdbc.driverclassname','mapreduce.admin.map.child.java.opts','mapreduce.admin.reduce.child.java.opts','mapreduce.admin.user.env','mapreduce.am.max-attempts','mapreduce.application.classpath','mapreduce.application.framework.path','mapreduce.cluster.administrators','mapreduce.framework.name','mapreduce.job.counters.max','mapreduce.job.emit-timeline-data','mapreduce.job.reduce.slowstart.completedmaps','mapreduce.jobhistory.address','mapreduce.jobhistory.bind-host','mapreduce.jobhistory.done-dir','mapreduce.jobhistory.intermediate-done-dir','mapreduce.jobhistory.keytab','mapreduce.jobhistory.principal','mapreduce.jobhistory.recovery.enable','mapreduce.jobhistory.recovery.store.class','mapreduce.jobhistory.recovery.store.leveldb.path','mapreduce.jobhistory.webapp.address','mapreduce.jobhistory.webapp.spnego-keytab-file','mapreduce.jobhistory.webapp.spnego-principal','mapreduce.jobtracker.webinterface.trusted','mapreduce.map.java.opts','mapreduce.map.log.level','mapreduce.map.memory.mb','mapreduce.map.output.compress','mapreduce.map.sort.spill.percent','mapreduce.map.speculative','mapreduce.output.fileoutputformat.compress','mapreduce.output.fileoutputformat.compress.type','mapreduce.reduce.input.buffer.percent','mapreduce.reduce.java.opts','mapreduce.reduce.log.level','mapreduce.reduce.memory.mb','mapreduce.reduce.shuffle.fetch.retry.enabled','mapreduce.reduce.shuffle.fetch.retry.interval-ms','mapreduce.reduce.shuffle.fetch.retry.timeout-ms','mapreduce.reduce.shuffle.input.buffer.percent','mapreduce.reduce.shuffle.merge.percent','mapreduce.reduce.shuffle.parallelcopies','mapreduce.reduce.speculative','mapreduce.shuffle.port','mapreduce.task.io.sort.factor','mapreduce.task.io.sort.mb','mapreduce.task.timeout','net.topology.script.file.name','nfs.exports.allowed.hosts','nfs.file.dump.dir','oozie.service.proxyuserservice.proxyuser.knox.groups','oozie.service.proxyuserservice.proxyuser.knox.hosts','ranger-hdfs-plugin-enabled','ranger-knox-plugin-enabled','ranger-yarn-plugin-enabled','ranger.audit.solr.password','ranger.audit.solr.urls','ranger.audit.solr.username','ranger.audit.solr.zookeepers','ranger.audit.source.type','ranger.authentication.method','ranger.contextname','ranger.credential.provider.path','ranger.db.encrypt.key.password','ranger.externalurl','ranger.https.attrib.keystore.file','ranger.jpa.audit.jdbc.credential.alias','ranger.jpa.audit.jdbc.dialect','ranger.jpa.audit.jdbc.driver','ranger.jpa.audit.jdbc.password','ranger.jpa.audit.jdbc.url','ranger.jpa.audit.jdbc.user','ranger.jpa.jdbc.credential.alias','ranger.jpa.jdbc.dialect','ranger.jpa.jdbc.driver','ranger.jpa.jdbc.password','ranger.jpa.jdbc.url','ranger.jpa.jdbc.user','ranger.ks.jdbc.sqlconnectorjar','ranger.ks.jpa.jdbc.credential.alias','ranger.ks.jpa.jdbc.credential.provider.path','ranger.ks.jpa.jdbc.dialect','ranger.ks.jpa.jdbc.driver','ranger.ks.jpa.jdbc.password','ranger.ks.jpa.jdbc.url','ranger.ks.jpa.jdbc.user','ranger.ks.masterkey.credential.alias','ranger.ldap.ad.domain','ranger.ldap.ad.url','ranger.ldap.group.roleattribute','ranger.ldap.group.searchbase','ranger.ldap.group.searchfilter','ranger.ldap.url','ranger.ldap.user.dnpattern','ranger.plugin.hdfs.policy.cache.dir','ranger.plugin.hdfs.policy.pollintervalms','ranger.plugin.hdfs.policy.rest.ssl.config.file','ranger.plugin.hdfs.policy.rest.url','ranger.plugin.hdfs.policy.source.impl','ranger.plugin.hdfs.service.name','ranger.plugin.hive.policy.cache.dir','ranger.plugin.hive.policy.pollintervalms','ranger.plugin.hive.policy.rest.ssl.config.file','ranger.plugin.hive.policy.rest.url','ranger.plugin.hive.policy.source.impl','ranger.plugin.hive.service.name','ranger.plugin.kms.policy.cache.dir','ranger.plugin.kms.policy.pollintervalms','ranger.plugin.kms.policy.rest.ssl.config.file','ranger.plugin.kms.policy.rest.url','ranger.plugin.kms.policy.source.impl','ranger.plugin.kms.service.name','ranger.plugin.knox.policy.cache.dir','ranger.plugin.knox.policy.pollintervalms','ranger.plugin.knox.policy.rest.ssl.config.file','ranger.plugin.knox.policy.rest.url','ranger.plugin.knox.policy.source.impl','ranger.plugin.knox.service.name','ranger.plugin.yarn.policy.cache.dir','ranger.plugin.yarn.policy.pollintervalms','ranger.plugin.yarn.policy.rest.ssl.config.file','ranger.plugin.yarn.policy.rest.url','ranger.plugin.yarn.policy.source.impl','ranger.plugin.yarn.service.name','ranger.service.host','ranger.service.http.enabled','ranger.service.http.port','ranger.service.https.attrib.clientauth','ranger.service.https.attrib.keystore.keyalias','ranger.service.https.attrib.keystore.pass','ranger.service.https.attrib.ssl.enabled','ranger.service.https.port','ranger.service.shutdown.port','ranger.unixauth.remote.login.enabled','ranger.unixauth.service.hostname','ranger.unixauth.service.port','ranger.usersync.credstore.filename','ranger.usersync.enabled','ranger.usersync.filesource.file','ranger.usersync.filesource.text.delimiter','ranger.usersync.group.memberattributename','ranger.usersync.group.nameattribute','ranger.usersync.group.objectclass','ranger.usersync.group.searchbase','ranger.usersync.group.searchenabled','ranger.usersync.group.searchfilter','ranger.usersync.group.searchscope','ranger.usersync.group.usermapsyncenabled','ranger.usersync.keystore.file','ranger.usersync.keystore.password','ranger.usersync.ldap.bindalias','ranger.usersync.ldap.binddn','ranger.usersync.ldap.bindkeystore','ranger.usersync.ldap.groupname.caseconversion','ranger.usersync.ldap.ldapbindpassword','ranger.usersync.ldap.searchbase','ranger.usersync.ldap.url','ranger.usersync.ldap.user.groupnameattribute','ranger.usersync.ldap.user.nameattribute','ranger.usersync.ldap.user.objectclass','ranger.usersync.ldap.user.searchbase','ranger.usersync.ldap.user.searchfilter','ranger.usersync.ldap.user.searchscope','ranger.usersync.ldap.username.caseconversion','ranger.usersync.logdir','ranger.usersync.pagedresultsenabled','ranger.usersync.pagedresultssize','ranger.usersync.passwordvalidator.path','ranger.usersync.policymanager.baseurl','ranger.usersync.policymanager.maxrecordsperapicall','ranger.usersync.policymanager.mockrun','ranger.usersync.port','ranger.usersync.sink.impl.class','ranger.usersync.sleeptimeinmillisbetweensynccycle','ranger.usersync.source.impl.class','ranger.usersync.ssl','ranger.usersync.truststore.file','ranger.usersync.truststore.password','ranger.usersync.unix.minuserid','realm','security.admin.operations.protocol.acl','security.client.datanode.protocol.acl','security.client.protocol.acl','security.datanode.protocol.acl','security.inter.datanode.protocol.acl','security.inter.tracker.protocol.acl','security.job.client.protocol.acl','security.job.task.protocol.acl','security.namenode.protocol.acl','security.refresh.policy.protocol.acl','security.refresh.usertogroups.mappings.protocol.acl','smokeuser','spark.driver.extrajavaoptions','spark.history.kerberos.keytab','spark.history.kerberos.principal','spark.history.provider','spark.history.ui.port','spark.yarn.am.extrajavaoptions','spark.yarn.applicationmaster.waittries','spark.yarn.containerlaunchermaxthreads','spark.yarn.driver.memoryoverhead','spark.yarn.executor.memoryoverhead','spark.yarn.historyserver.address','spark.yarn.max.executor.failures','spark.yarn.preserve.staging.files','spark.yarn.queue','spark.yarn.scheduler.heartbeat.interval-ms','spark.yarn.services','spark.yarn.submit.file.replication','ssl.client.keystore.location','ssl.client.keystore.password','ssl.client.keystore.type','ssl.client.truststore.location','ssl.client.truststore.password','ssl.client.truststore.reload.interval','ssl.client.truststore.type','ssl.server.keystore.keypassword','ssl.server.keystore.location','ssl.server.keystore.password','ssl.server.keystore.type','ssl.server.truststore.location','ssl.server.truststore.password','ssl.server.truststore.reload.interval','ssl.server.truststore.type','sun.security.krb5.debug','synclimit','templeton.exec.timeout','templeton.hadoop','templeton.hadoop.conf.dir','templeton.hcat','templeton.hcat.home','templeton.hive.archive','templeton.hive.extra.files','templeton.hive.home','templeton.hive.path','templeton.hive.properties','templeton.jar','templeton.kerberos.keytab','templeton.kerberos.principal','templeton.kerberos.secret','templeton.libjars','templeton.override.enabled','templeton.pig.archive','templeton.pig.path','templeton.port','templeton.python','templeton.sqoop.archive','templeton.sqoop.home','templeton.sqoop.path','templeton.storage.class','templeton.streaming.jar','templeton.zookeeper.hosts','tez.am.am-rm.heartbeat.interval-ms.max','tez.am.container.idle.release-timeout-max.millis','tez.am.container.idle.release-timeout-min.millis','tez.am.container.reuse.enabled','tez.am.container.reuse.locality.delay-allocation-millis','tez.am.container.reuse.non-local-fallback.enabled','tez.am.container.reuse.rack-fallback.enabled','tez.am.launch.cluster-default.cmd-opts','tez.am.launch.cmd-opts','tez.am.launch.env','tez.am.log.level','tez.am.max.app.attempts','tez.am.maxtaskfailures.per.node','tez.am.resource.memory.mb','tez.am.tez-ui.history-url.template','tez.am.view-acls','tez.cluster.additional.classpath.prefix','tez.counters.max','tez.counters.max.groups','tez.generate.debug.artifacts','tez.grouping.max-size','tez.grouping.min-size','tez.grouping.split-waves','tez.history.logging.service.class','tez.lib.uris','tez.runtime.compress','tez.runtime.compress.codec','tez.runtime.convert.user-payload.to.history-text','tez.runtime.io.sort.mb','tez.runtime.optimize.local.fetch','tez.runtime.pipelined.sorter.sort.threads','tez.runtime.sorter.class','tez.runtime.unordered.output.buffer.size-mb','tez.session.am.dag.submit.timeout.secs','tez.session.client.timeout.secs','tez.shuffle-vertex-manager.max-src-fraction','tez.shuffle-vertex-manager.min-src-fraction','tez.staging-dir','tez.task.am.heartbeat.counter.interval-ms.max','tez.task.generate.counters.per.io','tez.task.get-task.sleep.interval-ms.max','tez.task.launch.cluster-default.cmd-opts','tez.task.launch.cmd-opts','tez.task.launch.env','tez.task.max-events-per-heartbeat','tez.task.resource.memory.mb','tez.tez-ui.history-url.base','tez.use.cluster.hadoop-libs','ticktime','webhcat.proxyuser.knox.groups','webhcat.proxyuser.knox.hosts','xa.webapp.dir','xasecure.add-hadoop-authorization','xasecure.audit.credential.provider.file','xasecure.audit.destination.db','xasecure.audit.destination.db.batch.filespool.dir','xasecure.audit.destination.db.jdbc.driver','xasecure.audit.destination.db.jdbc.url','xasecure.audit.destination.db.password','xasecure.audit.destination.db.user','xasecure.audit.destination.hdfs','xasecure.audit.destination.hdfs.batch.filespool.dir','xasecure.audit.destination.hdfs.dir','xasecure.audit.destination.solr','xasecure.audit.destination.solr.batch.filespool.dir','xasecure.audit.destination.solr.urls','xasecure.audit.destination.solr.zookeepers','xasecure.audit.is.enabled','xasecure.audit.provider.summary.enabled','xasecure.hive.update.xapolicies.on.grant.revoke','xasecure.policymgr.clientssl.keystore','xasecure.policymgr.clientssl.keystore.credential.file','xasecure.policymgr.clientssl.keystore.password','xasecure.policymgr.clientssl.truststore','xasecure.policymgr.clientssl.truststore.credential.file','xasecure.policymgr.clientssl.truststore.password','yarn.acl.enable','yarn.admin.acl','yarn.app.mapreduce.am.admin-command-opts','yarn.app.mapreduce.am.command-opts','yarn.app.mapreduce.am.log.level','yarn.app.mapreduce.am.resource.mb','yarn.app.mapreduce.am.staging-dir','yarn.application.classpath','yarn.client.nodemanager-connect.max-wait-ms','yarn.client.nodemanager-connect.retry-interval-ms','yarn.http.policy','yarn.log-aggregation-enable','yarn.log-aggregation.retain-seconds','yarn.log.server.url','yarn.node-labels.enabled','yarn.node-labels.fs-store.retry-policy-spec','yarn.node-labels.fs-store.root-dir','yarn.nodemanager.address','yarn.nodemanager.admin-env','yarn.nodemanager.aux-services','yarn.nodemanager.bind-host','yarn.nodemanager.container-executor.class','yarn.nodemanager.container-monitor.interval-ms','yarn.nodemanager.delete.debug-delay-sec','yarn.nodemanager.disk-health-checker.max-disk-utilization-per-disk-percentage','yarn.nodemanager.disk-health-checker.min-free-space-per-disk-mb','yarn.nodemanager.disk-health-checker.min-healthy-disks','yarn.nodemanager.health-checker.interval-ms','yarn.nodemanager.health-checker.script.timeout-ms','yarn.nodemanager.keytab','yarn.nodemanager.linux-container-executor.cgroups.hierarchy','yarn.nodemanager.linux-container-executor.cgroups.mount','yarn.nodemanager.linux-container-executor.cgroups.mount-path','yarn.nodemanager.linux-container-executor.cgroups.strict-resource-usage','yarn.nodemanager.linux-container-executor.group','yarn.nodemanager.linux-container-executor.resources-handler.class','yarn.nodemanager.local-dirs','yarn.nodemanager.log-aggregation.compression-type','yarn.nodemanager.log-aggregation.debug-enabled','yarn.nodemanager.log-aggregation.num-log-files-per-app','yarn.nodemanager.log-aggregation.roll-monitoring-interval-seconds','yarn.nodemanager.log-dirs','yarn.nodemanager.log.retain-second','yarn.nodemanager.principal','yarn.nodemanager.recovery.dir','yarn.nodemanager.recovery.enabled','yarn.nodemanager.remote-app-log-dir','yarn.nodemanager.remote-app-log-dir-suffix','yarn.nodemanager.resource.cpu-vcores','yarn.nodemanager.resource.memory-mb','yarn.nodemanager.resource.percentage-physical-cpu-limit','yarn.nodemanager.vmem-check-enabled','yarn.nodemanager.vmem-pmem-ratio','yarn.nodemanager.webapp.spnego-keytab-file','yarn.nodemanager.webapp.spnego-principal','yarn.resourcemanager.address','yarn.resourcemanager.admin.address','yarn.resourcemanager.am.max-attempts','yarn.resourcemanager.bind-host','yarn.resourcemanager.connect.max-wait.ms','yarn.resourcemanager.connect.retry-interval.ms','yarn.resourcemanager.fs.state-store.retry-policy-spec','yarn.resourcemanager.fs.state-store.uri','yarn.resourcemanager.ha.enabled','yarn.resourcemanager.hostname','yarn.resourcemanager.keytab','yarn.resourcemanager.nodes.exclude-path','yarn.resourcemanager.principal','yarn.resourcemanager.proxy-user-privileges.enabled','yarn.resourcemanager.recovery.enabled','yarn.resourcemanager.resource-tracker.address','yarn.resourcemanager.scheduler.address','yarn.resourcemanager.scheduler.class','yarn.resourcemanager.scheduler.monitor.enable','yarn.resourcemanager.state-store.max-completed-applications','yarn.resourcemanager.store.class','yarn.resourcemanager.system-metrics-publisher.dispatcher.pool-size','yarn.resourcemanager.system-metrics-publisher.enabled','yarn.resourcemanager.webapp.address','yarn.resourcemanager.webapp.delegation-token-auth-filter.enabled','yarn.resourcemanager.webapp.https.address','yarn.resourcemanager.webapp.spnego-keytab-file','yarn.resourcemanager.webapp.spnego-principal','yarn.resourcemanager.work-preserving-recovery.enabled','yarn.resourcemanager.work-preserving-recovery.scheduling-wait-ms','yarn.resourcemanager.zk-acl','yarn.resourcemanager.zk-address','yarn.resourcemanager.zk-num-retries','yarn.resourcemanager.zk-retry-interval-ms','yarn.resourcemanager.zk-state-store.parent-path','yarn.resourcemanager.zk-timeout-ms','yarn.scheduler.capacity.default.minimum-user-limit-percent','yarn.scheduler.capacity.maximum-am-resource-percent','yarn.scheduler.capacity.maximum-applications','yarn.scheduler.capacity.node-locality-delay','yarn.scheduler.capacity.resource-calculator','yarn.scheduler.capacity.root.accessible-node-labels','yarn.scheduler.capacity.root.capacity','yarn.scheduler.capacity.root.default.capacity','yarn.scheduler.capacity.root.default.maximum-capacity','yarn.scheduler.capacity.root.default.state','yarn.scheduler.capacity.root.default.user-limit-factor','yarn.scheduler.capacity.root.queues','yarn.scheduler.maximum-allocation-mb','yarn.scheduler.maximum-allocation-vcores','yarn.scheduler.minimum-allocation-mb','yarn.scheduler.minimum-allocation-vcores','yarn.timeline-service.address','yarn.timeline-service.bind-host','yarn.timeline-service.client.max-retries','yarn.timeline-service.client.retry-interval-ms','yarn.timeline-service.enabled','yarn.timeline-service.generic-application-history.store-class','yarn.timeline-service.http-authentication.cookie.domain','yarn.timeline-service.http-authentication.cookie.path','yarn.timeline-service.http-authentication.kerberos.keytab','yarn.timeline-service.http-authentication.kerberos.name.rules','yarn.timeline-service.http-authentication.kerberos.principal','yarn.timeline-service.http-authentication.signature.secret','yarn.timeline-service.http-authentication.signature.secret.file','yarn.timeline-service.http-authentication.signer.secret.provider','yarn.timeline-service.http-authentication.signer.secret.provider.object','yarn.timeline-service.http-authentication.simple.anonymous.allowed','yarn.timeline-service.http-authentication.token.validity','yarn.timeline-service.http-authentication.type','yarn.timeline-service.keytab','yarn.timeline-service.leveldb-state-store.path','yarn.timeline-service.leveldb-timeline-store.path','yarn.timeline-service.leveldb-timeline-store.read-cache-size','yarn.timeline-service.leveldb-timeline-store.start-time-read-cache-size','yarn.timeline-service.leveldb-timeline-store.start-time-write-cache-size','yarn.timeline-service.leveldb-timeline-store.ttl-interval-ms','yarn.timeline-service.principal','yarn.timeline-service.recovery.enabled','yarn.timeline-service.state-store-class','yarn.timeline-service.store-class','yarn.timeline-service.ttl-enable','yarn.timeline-service.ttl-ms','yarn.timeline-service.webapp.address','yarn.timeline-service.webapp.https.address'];
});


