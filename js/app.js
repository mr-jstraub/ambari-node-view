/**
 * Visualize your clusters components and services.
 * This app exports parts of the blueprint from the Ambari API
 * in order to visualize the setup.
 *
 * Version: 0.3.0 (Beta)
 * Author: Jonas Straub 
 */

var app = angular.module('nodeviewApp', ['ngRoute']);

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
 * Main Controller
 **/
app.controller('MainController', ['$scope', '$route', '$routeParams', '$location', function($scope, $route, $routeParams, $location){
    // routing
    $scope.$route = $route;
    $scope.$location = $location;
    $scope.$routeParams = $routeParams;
}]);

/**
 * NodeView - Controller
 **/
app.controller('NodeViewController', ['$scope', 'DefEnvironment', 'MainCluster', function($scope, DefEnvironment, MainCluster){
    /* {Cluster} Reference to cluster object */
    $scope.cluster = MainCluster;
    /* {Service[]} List of services */
    $scope.services = DefEnvironment.services;
    /* {Component[]} List of components */
    $scope.comps = DefEnvironment.comps;

    // TODO 
    /*
    this.config = {
        //Defines the number of components within a node on a single row, 0 to disable
        comps_per_row: 3
    };*/

    // TODO remove from controller and implement final
    /*
        Current workaround to avoid showing same nodes (equal components/services) a thousand times
    */
    $scope.printedChksums = {};
    $scope.isPrint = function(nodeid){
        if($scope.printedChksums[nodeid]){
            return true;
        }
        return false;
    };

    $scope.addPrintedNode = function(nodeid, chksum){
        for(var k in $scope.printedChksums){
            if($scope.printedChksums[k] == chksum){
                return false;
            }
        }
        $scope.printedChksums[nodeid] =  chksum;
        return true;
    };

    this.preparePrint = function(){
        for(var k in $scope.cluster.nodes){
            $scope.addPrintedNode($scope.cluster.nodes[k].id, $scope.cluster.nodes[k].chksum);
        }
    }; 

    this.preparePrint();
}]);


/**
 * Import and Export - Controller
 **/
app.controller('ImportExportController', ['$scope', 'DefEnvironment', 'MainCluster', function($scope, DefEnvironment, MainCluster){
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
app.factory('Cluster', ['Config', 'Node', 'DefEnvironment', function(Config, Node, DefEnvironment){
    function Cluster(){
        /* {string} Name of cluster */
        this.name = '';
        /* {string} Cluster version */
        this.version = '';
        /* {string} security either none or kerberos */
        this.security = 'None';
        /* {Node[]} Object containing the Node objects of the cluster  */
        this.nodes = [];
        /* {Object} Holds the cardinality of unique nodes (needs to be updated after changes to a node) */
        this.cardinality = {};
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
        this.cardinality = {};
        this.config = null;
        this.configItems = [];
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
            console.warn('Import cluster is empty');
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
        // add nodes to cluster
        for(key in clusterJson.hosts_info){
            var nodeData = clusterJson.hosts_info[key];
            var node = null;

            // validate data
            if(!nodeData || typeof(nodeData['host_name']) !== 'string'){
                console.warn('wrong type addNode');
                continue
            }

            // add new Node
            node = this.addNode(nodeData['host_name'], nodeData['url'])

            if(!node){
                console.warn('Error creating new node');
                continue;
            }

            // add components
            for(var compKey in nodeData['components']){
                var compId = nodeData['components'][compKey];
                // search component object
                var comp = DefEnvironment.getComponentById(compId.toLowerCase());
                if(!node.addComponent(comp)){
                    console.warn('Component could not be added to node: ' + compId);
                }               
            }

            //console.debug('Added new node (#' + key + ')');
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

        // reload cardinalities
        this.updateCardinality();

        console.info('Cluster imported');
    };

    /**
     * Adds a new node  to the cluster
     * @param {string} hostname of the new node
     * @param {string} url of the new node
     * @returns Added node if successful, false otherwise
     **/
    Cluster.prototype.addNode = function(hostname, url){
        // validate data
        if(!hostname || typeof(hostname) !== 'string'){
            console.error('wrong type addNode');
            return false;
        }

        // add new node
        var node = new Node(Node.newId(), hostname, url)
        this.nodes.push(node);
        return node;
    };

    /**
     * Update the cardinality of unique nodes.
     * Needs to be called after every Node change (e.g. addComponent, etc.)
     **/
    Cluster.prototype.updateCardinality = function(){
        var cardinality = {};

        // recalculate cardinality
        for(var k in this.nodes){
            if(cardinality[this.nodes[k].chksum]){
                cardinality[this.nodes[k].chksum] += 1;
            }else{
                cardinality[this.nodes[k].chksum] = 1;
            }
        }
        // update value
        this.cardinality = cardinality;
    };

    /**
     * @returns the cardinality of the given checksum (Node tyoe)
     **/
    Cluster.prototype.getCardinality = function(chksum){
        return (this.cardinality[chksum]) ? this.cardinality[chksum] : 0;
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

    return Cluster;
}]);


/**
 * Node Model
 **/
app.factory('Node', ['Component', function(Component){
    function Node(nodeId, name, url){
        /* {string} Unique id of this node */
        this.id = nodeId;
        /* {string} FQDN of the node */
        this.url = url;
        /* {string} Name of the node */
        this.name = name;
        /* {Component[]} Collection of node components */
        this.comps = [];

        /* {string} Checksum to check equality with other nodes */
        this.chksum = this.calcChecksum();
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
        
        // update checksum
        this.chksum = this.calcChecksum();

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
            this.addComponent(comps[comp].id, comps[comp].name, comps[comp].shortname);
        }
    };

    /**
     * Adds a component to this service
     * @param {string} long name of this component
     * @param {string} short name of this component
     * @returns True if successful
     **/
    Service.prototype.addComponent = function(id, name, shortname){
        if(!id || typeof(id) !== 'string'){
            console.warn('Invalid Component received');
            return false;
        }

        // add component
        this.comps.push(new Component(id, this, name, shortname));
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
    function Component(id, service, name, shortname){
        /* {string} unique id of this component */
        this.id = id;
        /* {string} Long name of this component */
        this.name = name;
        /* {string} short name of this component (max. 7 letters) */
        this.shortname = shortname;
        /* {Service} Back reference to parent service */
        this.service = service;
    }

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
        return {'id': this.id, 'name': this.name , 'shortname': this.shortname};
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
            envServices.push(new Service('default', 0, 'Default', 'DEF', '#000000', '#000000', []));
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
            'ambari_metrics' : {
                'group_a' : 32,
                'group_b' : 'Monitoring',
                'group_c' : '',
                'base_color' : 'blue',
                'font_color' : 'white',
                'name' : 'Ambari Metrics',
                'shortname': 'AMS',
                'components' : [
                    {'id': 'metrics_collector', 'name': 'Metrics Collector' , 'shortname' : 'AMS_C'},
                    {'id': 'metrics_monitor', 'name': 'Metrics Monitor' , 'shortname' : 'AMS_M'}
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
                    {'id': 'falcon_client', 'name': 'Falcon Client' , 'shortname': 'FAL_C'},
                    {'id': 'falcon_server', 'name': 'Falcon Server' , 'shortname': 'FAL_S'}
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
                    {'id': 'flume_handler', 'name': 'Flume Handler' , 'shortname': 'FL'}
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
                    {'id': 'ganglia_monitor', 'name': 'Ganglia Monitor' , 'shortname': 'GG_M'},
                    {'id': 'ganglia_server', 'name': 'Ganglia Server' , 'shortname': 'GG_S'}
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
                    {'id': 'hbase_client', 'name': 'Hbase Client' , 'shortname': 'HB_C'},
                    {'id': 'hbase_master', 'name': 'Hbase Master' , 'shortname': 'HB_M'},
                    {'id': 'hbase_regionserver', 'name': 'Hbase Regionserver' , 'shortname': 'HB_R'}
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
                    {'id': 'datanode', 'name': 'Datanode' , 'shortname': 'DN'},
                    {'id': 'hdfs_client', 'name': 'Hdfs Client' , 'shortname': 'HDFS_C'},
                    {'id': 'journalnode', 'name': 'Journalnode' , 'shortname': 'JN'},
                    {'id': 'namenode', 'name': 'Namenode' , 'shortname': 'NN'},
                    {'id': 'secondary_namenode', 'name': 'Secondary Namenode' , 'shortname': 'SNN'},
                    {'id': 'zkfc', 'name': 'Zkfc' , 'shortname': 'ZKFC'}
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
                    {'id': 'kafka_broker', 'name': 'Kafka Broker' , 'shortname': 'KAFKA'}
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
                    {'id': 'kerberos_client', 'name': 'Kerberos Client' , 'shortname': 'KERB_C'}
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
                    {'id': 'knox_gateway', 'name': 'Knox Gateway' , 'shortname': 'KNOX'}
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
                    {'id': 'historyserver', 'name': 'Historyserver' , 'shortname': 'JHS'},
                    {'id': 'mapreduce2_client', 'name' : 'Mapreduce2 Client', 'shortname': 'MR'}
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
                    {'id': 'oozie_client', 'name': 'Oozie Client' , 'shortname': 'OZ_C'},
                    {'id': 'oozie_server', 'name': 'Oozie Server' , 'shortname': 'OZ_S'}
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
                    {'id': 'pig', 'name': 'Pig' , 'shortname': 'PIG'}
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
                    {'id': 'ranger_admin', 'name': 'Ranger Admin' , 'shortname': 'RG_ADM'},
                    {'id': 'ranger_usersync', 'name': 'Ranger Usersync' , 'shortname': 'RG_USR'}
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
                    {'id': 'ranger_kms_server', 'name': 'Ranger KMS Server' , 'shortname': 'RG_KMS'}
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
                    {'id': 'slider', 'name': 'Slider' , 'shortname': 'SLID'}
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
                    {'id': 'spark_client', 'name': 'Spark Client' , 'shortname': 'SPR_C'},
                    {'id': 'spark_jobhistoryserver', 'name': 'Spark Jobhistoryserver' , 'shortname': 'SPR_HS'}
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
                    {'id': 'sqoop', 'name': 'Sqoop' , 'shortname': 'SQP'}
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
                    {'id': 'drpc_server', 'name': 'Drpc Server' , 'shortname': 'DRPC'},
                    {'id': 'nimbus', 'name': 'Nimbus' , 'shortname': 'NBM'},
                    {'id': 'storm_ui_server', 'name': 'Storm UI Server' , 'shortname': 'STR_UI'},
                    {'id': 'supervisor', 'name': 'Supervisor' , 'shortname': 'SPS'}
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
                    {'id': 'tez_client', 'name': 'Tez Client' , 'shortname': 'TEZ'}
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
                    {'id': 'app_timeline_server', 'name': 'App Timeline Server' , 'shortname': 'ATS'},
                    {'id': 'nodemanager', 'name': 'Nodemanager' , 'shortname': 'NM'},
                    {'id': 'resourcemanager', 'name': 'Resourcemanager' , 'shortname': 'RM'},
                    {'id': 'yarn_client', 'name': 'Yarn Client' , 'shortname': 'YARN_C'}
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
                    {'id': 'zookeeper_client', 'name': 'Zookeeper Client' , 'shortname': 'ZK_C'},
                    {'id': 'zookeeper_server', 'name': 'Zookeeper Server' , 'shortname': 'ZK_S'}
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
                    {'id': 'hcat', 'name': 'Hcat' , 'shortname': 'HCAT'},
                    {'id': 'hive_client', 'name': 'Hive Client' , 'shortname': 'HIVE_C'},
                    {'id': 'hive_metastore', 'name': 'Hive Metastore' , 'shortname': 'HIVE_MS'},
                    {'id': 'hive_server', 'name': 'Hive Server' , 'shortname': 'HIVE_S'},
                    {'id': 'mysql_server', 'name': 'Mysql Server' , 'shortname': 'MYSQL'},
                    {'id': 'webhcat_server', 'name': 'Webhcat Server' , 'shortname': 'WHCAT'}
                ]
            },
            'zeppelin' : {
                'group_a' : 34,
                'group_b' : 'Visualization',
                'group_c' : '',
                'base_color' : 'lightgreen',
                'font_color' : '',
                'name' : 'Zepplin',
                'shortname': 'ZPLN',
                'components' : [
                    {'id': 'zeppelin_master', 'name': 'Zeppelin Master' , 'shortname': 'ZPLN'}
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
                    {'id': 'solr_master', 'name': 'Solr Master' , 'shortname': 'SOLR'}
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
                    {'id': 'hue_lizy_jobserver', 'name': 'Hue Lizy Server' , 'shortname': 'HUE_LJS'}
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
                    {'id': 'ambari_server', 'name': 'Ambari Server' , 'shortname': 'AMB_S'},
                    {'id': 'ambari_agent', 'name': 'Ambari Agent' , 'shortname': 'AMB_AG'}
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
                    {'id': 'neo4j', 'name': 'Neo4J' , 'shortname': 'NEO4J'},
                    {'id': 'nlp', 'name': 'NLP' , 'shortname': 'NLP'},
                    {'id': 'rstudio', 'name': 'R-Studio' , 'shortname': 'R_STD'},
                    {'id': 'rprogramming', 'name': 'R-Programming' , 'shortname': 'R'}
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







