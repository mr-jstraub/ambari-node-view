/**
 * Service Model
 **/
angular.module('mNodeView').factory('Service', ['Component', function(Component){
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