#About
This application lets you export and visualize the current state of your Ambari managed Hadoop cluster. The web application is based on Angular and Bootstrap, the exporter is based on Python.

This is still work in progress!

Looking forward to your feedback and feature requests :)

##Exporting Cluster information
To use the exporter, simply copy the exporter.py file to your cluster or any other location that has access to the Ambari server. Afterwards, execute it with the following command. (Note: You can export service and component information to a file or stdout). The script will ask for an Ambari password during the execution.
```
python exporter.py --target [host] --cluster [clustername] --user [ambari_username] --output [filename]
```

For example:
```
python exporter.py --target c6601.ambari.apache.org:8080 --cluster mycluster --user admin --output export.json
```

##Using the Angular App
The Angular app provides an easy way of displaying the exported cluster. Just open the html/index.html file on your webserver, import your cluster and you are good to go.
###Import Cluster and Environment
To import your cluster and enviornment, go to the Import/Export page under Settings. The enviornment has a pre-defined default value, the cluster field is expecting the output from the exporter script (exporter.py)

###Export Environment
If you have changed the enviornment and want to export it now, go to Settings->Import/Export and copy the Enviornment from the textarea under Export

###Adjusting the enviornment
You can change the naming, grouping and coloring of services and components by going to Settings->Components or Settings->Services. Alternatively you can modify the JSON definition from the Import/Export page.

###Elements/Naming
**Service:** Refers to a service from the Hadoop enviornment or any other application that has been added to the Enviornment. (e.g. HDFS, HBase, Storm). A Service can have multiple components.

**Component:** Components are part of a service, e.g. Namenode (HDFS), Journalnode (HDFS), RegionServer (HBase)

**Environment:** In case of this app, refers to a definition of possible services and components. Only services and components that have been specified in the enviornment definition will be reconized during the import. The environment definition also includes grouping and coloring configurations.

**Cluster:** A combination of hosts, services, components and some additional cluster information. At the moment components are identified by unique ids, e.g. FLUME_HANDLER, this is one of the reasons why component IDS within an Enviornment need to be unique.

#Examples
See [screens](https://github.com/mr-jstraub/ambari_node_view/tree/master/screens) folder for some sample screenshots :)