/**
 * ConfigItem Model
 **/
angular.module('mNodeView').factory('ConfigItem', function(){
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
