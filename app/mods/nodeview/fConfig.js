/**
 * Config Model
 **/
angular.module('mNodeView').factory('Config', ['ConfigItem', function(ConfigItem){
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
