/**
 * Enviornment Model
 **/
angular.module('mNodeView').factory('Environment', ['Service', function(Service){
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