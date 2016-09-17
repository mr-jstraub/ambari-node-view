/**
 * Build Cluster
 */
angular.module('mBuild').service('BuildCluster', function() {
    /* Cluster meta information */
    this.clusterMeta = {'name': 'Horton-Cluster', 'stack': 'HDP-2.3', 'stackId': 'HDP', 'stackVersion': '2.3', 'isKerberized': 'false'};
    /* Default cluster */
    var defCluster = [{'name': 'gateway.example.com', 'comps': [], 'cardinality': 1}, {'name': 'mgmt.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master01.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master02.example.com', 'comps': [], 'cardinality': 1}, {'name': 'master03.example.com', 'comps': [], 'cardinality': 1}, {'name': 'worker0#{0}.example.com', 'comps': [], 'cardinality': 3}];
    /* Built cluster */
    this.cluster = defCluster;
    /* List of av. bundles, e.g. HDFS HA */
    this.bundles = [{'shortname': 'HDFS_HA', 'name': 'HDFS HA' ,'comps': ['namenode','namenode','journalnode',,'journalnode','journalnode','zkfc','zkfc','zookeeper_server','zookeeper_server','zookeeper_server']}, {'shortname': 'YARN_HA', 'name': 'YARN HA' ,'comps': ['resourcemanager','resourcemanager','zookeeper_server','zookeeper_server','zookeeper_server']}]
});