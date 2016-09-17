/**
 * Node Model
 * A node can represent a single or multiple physical nodes.
 * Multiple physical nodes share the same component structure
 * and have a cardinality > 1
 **/
angular.module('mNodeView').factory('Node', ['Component', function(Component){
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
     * Adds multiple physical hosts to this node.
     * This increases the cardinality by the number of hosts!
     * @param {String[]} hostnames Hostnames to be added
     */
    Node.prototype.addHosts = function(hostnames){
        if(!hostnames || hostnames.length <= 0){
            console.warn('Cannot add hosts to node, invalid hostnames!');
            return;
        }
        for(var k in hostnames){
            this.addHost(hostnames[k]);
        }
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
