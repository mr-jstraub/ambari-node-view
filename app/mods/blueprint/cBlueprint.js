/**
 * Blueprint Controller (----BETA----)
 **/
angular.module('mBlueprint', ['mNodeView', 'mBuild'])
    .controller('BlueprintController', ['$scope', 'DefEnvironment', 'MainCluster', 'BuildCluster', 'Blueprint', function($scope, DefEnvironment, MainCluster, BuildCluster, Blueprint){
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