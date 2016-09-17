/**
 * Main Cluster used for the Node view
 */
angular.module('mNodeView').service('MainCluster', function(Cluster) {
    var cluster_sample = '{"stack_version": "HDP-2.2", "hosts": ["http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4068.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4069.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4070.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4071.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4072.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4073.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4074.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4075.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4076.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4106.ambari.apache.org", "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4107.ambari.apache.org"], "hosts_info": [{"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4068.ambari.apache.org", "host_name": "c4068.ambari.apache.org", "components": ["FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "JOURNALNODE", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NAMENODE", "OOZIE_CLIENT", "PIG", "RESOURCEMANAGER", "SPARK_CLIENT", "SPARK_JOBHISTORYSERVER", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZKFC", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4069.ambari.apache.org", "host_name": "c4069.ambari.apache.org", "components": ["APP_TIMELINE_SERVER", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HISTORYSERVER", "HIVE_CLIENT", "HIVE_METASTORE", "HIVE_SERVER", "JOURNALNODE", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NAMENODE", "OOZIE_CLIENT", "PIG", "RESOURCEMANAGER", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZKFC", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4070.ambari.apache.org", "host_name": "c4070.ambari.apache.org", "components": ["FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "HIVE_METASTORE", "HIVE_SERVER", "JOURNALNODE", "KERBEROS_CLIENT", "KNOX_GATEWAY", "MAPREDUCE2_CLIENT", "METRICS_COLLECTOR", "METRICS_MONITOR", "MYSQL_SERVER", "OOZIE_CLIENT", "OOZIE_SERVER", "PIG", "RANGER_ADMIN", "RANGER_USERSYNC", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "WEBHCAT_SERVER", "YARN_CLIENT", "ZOOKEEPER_CLIENT", "ZOOKEEPER_SERVER"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4071.ambari.apache.org", "host_name": "c4071.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4072.ambari.apache.org", "host_name": "c4072.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4073.ambari.apache.org", "host_name": "c4073.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4074.ambari.apache.org", "host_name": "c4074.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4075.ambari.apache.org", "host_name": "c4075.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4076.ambari.apache.org", "host_name": "c4076.ambari.apache.org", "components": ["DATANODE", "FLUME_HANDLER", "HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "NODEMANAGER", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4106.ambari.apache.org", "host_name": "c4106.ambari.apache.org", "components": ["HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZOOKEEPER_CLIENT"]}, {"url": "http://c4068.ambari.apache.org:8080/api/v1/clusters/bigdata/hosts/c4107.ambari.apache.org", "host_name": "c4107.ambari.apache.org", "components": ["HCAT", "HDFS_CLIENT", "HIVE_CLIENT", "KERBEROS_CLIENT", "MAPREDUCE2_CLIENT", "METRICS_MONITOR", "OOZIE_CLIENT", "PIG", "SPARK_CLIENT", "SQOOP", "TEZ_CLIENT", "YARN_CLIENT", "ZEPPELIN_MASTER", "ZOOKEEPER_CLIENT"]}], "security_type": "KERBEROS", "name": "bigdata"}';
    var mainCluster = new Cluster();
    mainCluster.importCluster(cluster_sample);
    return mainCluster;
});