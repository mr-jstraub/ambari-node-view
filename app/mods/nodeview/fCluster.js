/**
 * Cluster Model
 **/
angular.module('mNodeView').factory('Cluster', ['Config', 'Node', 'DefEnvironment', 'Component', function(Config, Node, DefEnvironment, Component){
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
     * exported by the Python-Exporter or in the Ambari Blueprint format.
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

        //in case this is a blueprint import use blueprint importer
        if('Blueprints' in clusterJson){
            this.importBlueprintCluster(clusterJson);
            return;
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
     * Import given cluster with an Ambari Blueprint.
     * @param {Json} clusterJson json blueprint
     * @returns True if successful, false otherwise
     **/
    Cluster.prototype.importBlueprintCluster = function(clusterJson){
        console.debug('Trying to import cluster with Ambari Blueprint');

        if(!clusterJson) {
            console.warn('Imported cluster seems to be empty or in wrong format');
            return false;
        }

        // reset cluster data
        this.reset();

        // set  new cluster info
        this.name = 'Big Data';
        this.security = 'None';
        this.version = (clusterJson['Blueprints']['stack_name'] && clusterJson['Blueprints']['stack_version']) ? clusterJson['Blueprints']['stack_name'] + '-' + clusterJson['Blueprints']['stack_version'] : '';

        /* Array with checksum objects {idx: Index in node array, chksum: calc. Checksum}*/
        var chksums = [];

        // add nodes to cluster
        for(var key in clusterJson.host_groups){
            var nodeData = clusterJson.host_groups[key];
            var nodeIdx = null;
            var nodeComps = [];
            var nodeChksum = "";
            var nodeCount = parseInt(nodeData['cardinality']);
            var nodeHostname = (nodeData['name']) ? nodeData['name'] : 'node' + key;
            var nodeHosts = [];

            //validate node count
            if(isNaN(nodeCount) || nodeCount <= 0){
                nodeCount = 1;
            }

            // prepare hosts
            for(var i=1; i<=nodeCount; i++){
                nodeHosts.push(nodeHostname + '-' + i);
            }

            // prepare components
            for(var compKey in nodeData['components']){
                var compId = nodeData['components'][compKey];
                if(!compId['name']) continue;

                // search component object
                var comp = DefEnvironment.getComponentById(compId['name'].toLowerCase());
                if(comp instanceof Component){
                    nodeComps.push(comp);
                }
            }

            // calc checksum
            nodeChksum = this.calcNodeChksum(nodeComps, '');

            // check whether calc. checksum is already available
            var isNodeDuplicate = false;
            for(var ck in chksums){
                if(chksums[ck]['chksum'] == nodeChksum){
                    nodeIdx = chksums[ck]['idx'];
                    isNodeDuplicate = true;
                    break;
                }
            }

            // node type is not av.=> add new node
            if(!isNodeDuplicate){
                nodeIdx = this.addNode(nodeHosts, nodeComps, '');
                if(nodeIdx < 0){
                    console.warn('Error creating new node');
                    continue;
                }

                // save chksum
                chksums.push({'idx': nodeIdx, 'chksum': nodeChksum});
            }else {
                this.nodes[nodeIdx].addHosts(nodeHosts);
            }
        }
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