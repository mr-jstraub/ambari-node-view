/**
 * Component Model
 **/
angular.module('mNodeView').factory('Component', function(){
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