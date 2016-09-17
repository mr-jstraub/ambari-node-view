/**
 * Default Environment
 */
angular.module('mNodeView').service('DefEnvironment', function(Environment) {
    var _defaultEnvJson = {
        'ambari_infra' : {
            'group_a' : 32,
            'group_b' : 'Management',
            'group_c' : '',
            'base_color' : '#FE2E4B',
            'font_color' : 'white',
            'name' : 'Ambari Infra',
            'shortname': 'AMB_INF',
            'components' : [
                {'id': 'infra_solr_client', 'name': 'Infra Solr Client' , 'shortname' : 'INF_SC', 'blueprint': false, 'ctype': 'c'},
                {'id': 'infra_solr', 'name': 'Infra Solr' , 'shortname' : 'INF_S', 'blueprint': false, 'ctype': 'm'}
            ]
        },
        'ambari_metrics' : {
            'group_a' : 32,
            'group_b' : 'Monitoring',
            'group_c' : '',
            'base_color' : 'blue',
            'font_color' : 'white',
            'name' : 'Ambari Metrics',
            'shortname': 'AMS',
            'components' : [
                {'id': 'metrics_collector', 'name': 'Metrics Collector' , 'shortname' : 'AMS_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'metrics_monitor', 'name': 'Metrics Monitor' , 'shortname' : 'AMS_M', 'blueprint': true, 'ctype': 'm'}
            ]
        },
        'atlas' : {
            'group_a' : 38,
            'group_b' : 'Governance',
            'group_c' : '',
            'base_color' : 'green',
            'font_color' : 'white',
            'name' : 'Atlas',
            'shortname': 'ATLS',
            'components' : [
                {'id': 'atlas_client', 'name': 'Atlas Client' , 'shortname' : 'ATLS_C', 'blueprint': false, 'ctype': 'c'},
                {'id': 'atlas_server', 'name': 'Atlas Server' , 'shortname' : 'ATLS_M', 'blueprint': false, 'ctype': 'm'}
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
                {'id': 'falcon_client', 'name': 'Falcon Client' , 'shortname': 'FAL_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'falcon_server', 'name': 'Falcon Server' , 'shortname': 'FAL_S', 'blueprint': true, 'ctype': 'm'}
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
                {'id': 'flume_handler', 'name': 'Flume Handler' , 'shortname': 'FL', 'blueprint': true}
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
                {'id': 'ganglia_monitor', 'name': 'Ganglia Monitor' , 'shortname': 'GG_M', 'blueprint': false},
                {'id': 'ganglia_server', 'name': 'Ganglia Server' , 'shortname': 'GG_S', 'blueprint': false}
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
                {'id': 'hbase_client', 'name': 'Hbase Client' , 'shortname': 'HB_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'hbase_master', 'name': 'Hbase Master' , 'shortname': 'HB_M', 'blueprint': true, 'ctype': 'm'},
                {'id': 'hbase_regionserver', 'name': 'Hbase Regionserver' , 'shortname': 'HB_R', 'blueprint': true, 'ctype': 'w'}
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
                {'id': 'datanode', 'name': 'Datanode' , 'shortname': 'DN', 'blueprint': true, 'ctype': 'w'},
                {'id': 'hdfs_client', 'name': 'Hdfs Client' , 'shortname': 'HDFS_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'journalnode', 'name': 'Journalnode' , 'shortname': 'JN', 'blueprint': true, 'ctype': 'm'},
                {'id': 'namenode', 'name': 'Namenode' , 'shortname': 'NN', 'blueprint': true, 'ctype': 'm'},
                {'id': 'secondary_namenode', 'name': 'Secondary Namenode' , 'shortname': 'SNN', 'blueprint': true, 'ctype': 'm'},
                {'id': 'zkfc', 'name': 'ZK Failover Controller' , 'shortname': 'ZKFC', 'blueprint': true, 'ctype': 'm'}
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
                {'id': 'kafka_broker', 'name': 'Kafka Broker' , 'shortname': 'KAFKA', 'blueprint': true}
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
                {'id': 'kerberos_client', 'name': 'Kerberos Client' , 'shortname': 'KERB_C', 'blueprint': false, 'ctype': 'c'}
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
                {'id': 'knox_gateway', 'name': 'Knox Gateway' , 'shortname': 'KNOX', 'blueprint': true}
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
                {'id': 'historyserver', 'name': 'Historyserver' , 'shortname': 'JHS', 'blueprint': true, 'ctype': 'm'},
                {'id': 'mapreduce2_client', 'name' : 'Mapreduce2 Client', 'shortname': 'MR', 'blueprint': true, 'ctype': 'c'}
            ]
        },
        'nifi' : {
            'group_a' : 22,
            'group_b' : 'Dataflow',
            'group_c' : '',
            'base_color' : '#728e9b',
            'font_color' : 'white',
            'name' : 'Nifi',
            'shortname': 'NIFI',
            'components' : [
                {'id': 'nifi_master', 'name': 'Nifi Server' , 'shortname': 'NIFI', 'blueprint': false, 'ctype': 'm'},
                {'id': 'nifi_ca', 'name': 'Nifi CA' , 'shortname': 'NIFI_CA', 'blueprint': false, 'ctype': 'w'}
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
                {'id': 'oozie_client', 'name': 'Oozie Client' , 'shortname': 'OZ_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'oozie_server', 'name': 'Oozie Server' , 'shortname': 'OZ_S', 'blueprint': true, 'ctype': 'm'}
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
                {'id': 'pig', 'name': 'Pig' , 'shortname': 'PIG', 'blueprint': true, 'ctype': 'c'}
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
                {'id': 'ranger_admin', 'name': 'Ranger Admin' , 'shortname': 'RG_ADM', 'blueprint': false, 'ctype': 'm'},
                {'id': 'ranger_usersync', 'name': 'Ranger Usersync' , 'shortname': 'RG_USR', 'blueprint': false, 'ctype': 'm'}
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
                {'id': 'ranger_kms_server', 'name': 'Ranger KMS Server' , 'shortname': 'RG_KMS', 'blueprint': false, 'ctype': 'm'}
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
                {'id': 'slider', 'name': 'Slider' , 'shortname': 'SLID', 'blueprint': true}
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
                {'id': 'spark_client', 'name': 'Spark Client' , 'shortname': 'SPR_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'spark_jobhistoryserver', 'name': 'Spark Jobhistoryserver' , 'shortname': 'SPR_HS', 'blueprint': true, 'ctype': 'm'},
                {'id': 'spark_thriftserver', 'name': 'Spark Thrift Server' , 'shortname': 'SPR_TS', 'blueprint': true, 'ctype': 'm'},
                {'id': 'livy_server', 'name': 'Spark Livy Server' , 'shortname': 'SPR_LS', 'blueprint': true, 'ctype': 'm'}

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
                {'id': 'sqoop', 'name': 'Sqoop' , 'shortname': 'SQP', 'blueprint': true, 'ctype': 'c'}
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
                {'id': 'drpc_server', 'name': 'Drpc Server' , 'shortname': 'DRPC', 'blueprint': true, 'ctype': 'm'},
                {'id': 'nimbus', 'name': 'Nimbus' , 'shortname': 'NBM', 'blueprint': true, 'ctype': 'm'},
                {'id': 'storm_ui_server', 'name': 'Storm UI Server' , 'shortname': 'STR_UI', 'blueprint': true, 'ctype': 'm'},
                {'id': 'supervisor', 'name': 'Supervisor' , 'shortname': 'SPS', 'blueprint': true, 'ctype': 'w'}
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
                {'id': 'tez_client', 'name': 'Tez Client' , 'shortname': 'TEZ', 'blueprint': true, 'ctype': 'c'}
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
                {'id': 'app_timeline_server', 'name': 'App Timeline Server' , 'shortname': 'ATS', 'blueprint': true, 'ctype': 'm'},
                {'id': 'nodemanager', 'name': 'Nodemanager' , 'shortname': 'NM', 'blueprint': true, 'ctype': 'w'},
                {'id': 'resourcemanager', 'name': 'Resourcemanager' , 'shortname': 'RM', 'blueprint': true, 'ctype': 'm'},
                {'id': 'yarn_client', 'name': 'Yarn Client' , 'shortname': 'YARN_C', 'blueprint': true, 'ctype': 'c'}
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
                {'id': 'zookeeper_client', 'name': 'Zookeeper Client' , 'shortname': 'ZK_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'zookeeper_server', 'name': 'Zookeeper Server' , 'shortname': 'ZK_S', 'blueprint': true, 'ctype': 'm'}
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
                {'id': 'hcat', 'name': 'Hcat' , 'shortname': 'HCAT', 'blueprint': true, 'ctype': 'c'},
                {'id': 'hive_client', 'name': 'Hive Client' , 'shortname': 'HIVE_C', 'blueprint': true, 'ctype': 'c'},
                {'id': 'hive_metastore', 'name': 'Hive Metastore' , 'shortname': 'HIVE_MS', 'blueprint': true, 'ctype': 'm'},
                {'id': 'hive_server', 'name': 'Hive Server' , 'shortname': 'HIVE_S', 'blueprint': true, 'ctype': 'm'},
                {'id': 'mysql_server', 'name': 'Mysql Server' , 'shortname': 'MYSQL', 'blueprint': true, 'ctype': 'm'},
                {'id': 'webhcat_server', 'name': 'Webhcat Server' , 'shortname': 'WHCAT', 'blueprint': true, 'ctype': 'm'}
            ]
        },
        'zeppelin' : {
            'group_a' : 34,
            'group_b' : 'Visualization',
            'group_c' : '',
            'base_color' : '#3071a9',
            'font_color' : 'white',
            'name' : 'Zepplin',
            'shortname': 'ZPLN',
            'components' : [
                {'id': 'zeppelin_master', 'name': 'Zeppelin Master' , 'shortname': 'ZPLN', 'blueprint': false}
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
                {'id': 'solr_master', 'name': 'Solr Master' , 'shortname': 'SOLR', 'blueprint': false, 'ctype': 'm'}
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
                {'id': 'hue_lizy_jobserver', 'name': 'Hue Lizy Server' , 'shortname': 'HUE_LJS', 'blueprint': false}
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
                {'id': 'ambari_server', 'name': 'Ambari Server' , 'shortname': 'AMB_S', 'blueprint': true, 'ctype': 'm'},
                {'id': 'ambari_agent', 'name': 'Ambari Agent' , 'shortname': 'AMB_AG', 'blueprint': false, 'ctype': 'w'}
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
                {'id': 'neo4j', 'name': 'Neo4J' , 'shortname': 'NEO4J', 'blueprint': false},
                {'id': 'nlp', 'name': 'NLP' , 'shortname': 'NLP', 'blueprint': false},
                {'id': 'rstudio', 'name': 'R-Studio' , 'shortname': 'R_STD', 'blueprint': false},
                {'id': 'rprogramming', 'name': 'R-Programming' , 'shortname': 'R', 'blueprint': false}
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