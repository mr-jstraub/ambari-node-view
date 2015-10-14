"""
    Author: Jonas Straub
    Desc: Node View - Exporter
"""

import requests
import json
import getpass
import logging
import sys
import getopt


class ClusterExporter:
    def __init__(self, host, cluster_name, user, pw, use_https):
        self.host = host
        self.cluster_name = cluster_name
        self.cluster_url = ''
        self.user = user
        self.pw = pw
        self.session = None
        self.use_https = use_https

        # create cluster url
        if use_https:
            self.cluster_url = '/'.join(['https:/', host + '', 'api', 'v1', 'clusters', cluster_name])
        else:
            self.cluster_url = '/'.join(['http:/', host + '', 'api', 'v1', 'clusters', cluster_name])

        # create ambari session
        logging.debug('Trying to setup new Ambari session with ' + self.cluster_url)
        self.session = requests.Session()
        self.session.auth = (user, pw)
        self.session.headers.update({'X-Requested-By': 'pythonexporter'})


    def _load_json_file(self, fname):
        data = None
        with open(fname) as finput:
            data = json.load(finput)

        return data


    def _retrieve_cluster_info(self, file_input=None):
        '''
            Retrieves base information about the cluster, e.g. name
        '''
        cluster = {}
        # retrieve info
        if file_input:
            res = self._load_json_file(file_input)
        else:
            r = self.session.get(self.cluster_url, verify=False)
            res = r.json()
        
        security_type = res['Clusters']['security_type']
        version = res['Clusters']['version']

        cluster['security_type'] = security_type
        cluster['stack_version'] = version
        cluster['name'] = res['Clusters']['cluster_name']
        
        logging.debug('security_type: ' + security_type)
        logging.debug('stack version: ' + version)
        return cluster


    def _retrieve_cluster_hosts(self, file_input=None):
        '''
            Retrieves all registered hosts from the cluster
        '''
        hosts = []
        if file_input:
            result = self._load_json_file(file_input)
        else:
            r = self.session.get(self.cluster_url + '/hosts', verify=False)
            result = r.json()

        for host in result['items']:
            hosts += [host['href']]
            logging.debug('Host: ' + host['href'])

        return hosts


    def _retrieve_host_info(self, hosts, file_input=None):
        '''
            Retrieves all information about a single host, e.g. services, components
        '''
        logging.debug('trying to get host information')
        api_comp_url = '/host_components'
        final = []

        if file_input:
            hosts = file_input

        for host in hosts:
            logging.debug('processing host: ' + host)
            if file_input:
                result = self._load_json_file(host)
            else:
                r = self.session.get(host + api_comp_url, verify=False)
                result = r.json()

            comps = []
            host_name = ''
            for component in result['items']:
                comps += [component['HostRoles']['component_name']]
                host_name = component['HostRoles']['host_name']

            # prepare final
            host_result = {}
            host_result['host_name'] = host_name
            host_result['url'] = host
            host_result['components'] = comps
            final.append(host_result)

        return final


    def _retrieve_cluster_config(self):
        '''
            Retrieve current cluster configuration.
        '''
        logging.debug('trying to get cluster configuration')
        url_desired_configs = '?fields=Clusters/desired_configs'
        configs = []

        # get desired configs
        r = self.session.get(self.cluster_url + url_desired_configs, verify=False)
        result = r.json()

        # process configs
        if not result or not result['Clusters']['desired_configs']:
            return None

        desired_configs = result['Clusters']['desired_configs']
        for dconfig in desired_configs:
            # prepare result
            config = {}
            config['type'] = dconfig
            config['tag'] = desired_configs[dconfig]['tag']

            # try getting actual configuration
            config['props'] = self._retrieve_type_config(config['type'], config['tag'])

            # attach to final result
            configs += [config]

        return configs


    def _retrieve_type_config(self, ctype, ctag):
        '''
            Retrieve the desired configuration for one specific
            type, e.g. ranger-site
        '''
        logging.debug('Getting config for => ' + ctype + ': ' + ctag)
        
        if not ctype or not ctag:
            return {}

        # get config for specified type
        r = self.session.get(self.cluster_url + '/configurations?type=' + ctype + '&tag=' + ctag)
        result = r.json()

        # process result
        if 'items' not in result or not len(result['items']) or 'properties' not in result['items'][0]:
            return {}

        props = result['items'][0]['properties']
        # remove content field
        if 'content' in props:
            props['content'] = '--removed--'
            
        return props


    def export_cluster(self, fnout=None, fcluster=None, fhosts=None, fhost_comps=None):
        '''
        Helper method to export the necessary cluster information.
        This method can be ignored depending on how the class is used.

        If fnout is not given, the result will be returned.
        '''

        # final cluster result
        cluster = None

        # if no local file was given, export cluster directly, otherwise process json files
        if fcluster and fhosts and fhost_comps:
            # get cluster info from file
            cluster = self._retrieve_cluster_info(fcluster)

            # get cluster hosts
            cluster['hosts'] = self._retrieve_cluster_hosts(fhosts)

            # get components/services info
            cluster['hosts_info'] = self._retrieve_host_info(None, fhost_comps)

            # get config
            cluster['config'] = {}
        else:
            # get cluster info
            cluster = self._retrieve_cluster_info()

            # get cluster hosts 
            cluster['hosts'] = self._retrieve_cluster_hosts()

            # get components/services info
            cluster['hosts_info'] = self._retrieve_host_info(cluster['hosts'])

            # get config
            #cluster['config'] = self._retrieve_cluster_config()

        # return result
        if not cluster:
            return ''           
        if fnout:
            with open(fnout, 'w') as fout:
                fout.write(json.dumps(cluster))
        else:
            return json.dumps(cluster)


    
def main(argv):
    '''
    Process script arguments if script was called directly
    '''
    target=cluster=user=fnout= ''
    use_https = False
    help_text = '... --target <host+port> --cluster <clustername> --user <ambari_username> --output <filename> --https [True|False]'
    # try parsing arguments
    try:
        opts, args = getopt.getopt(argv, 'ht:c:u:o:s:',['help', 'target=', 'cluster=', 'user=', 'output=', 'https='])

        # get all arguments
        for opt, arg in opts:
            if opt in('-h', '--help'):
                print(help_text)
                sys.exit(0)
            elif opt in ('-t', '--target'):
                target = arg
            elif opt in ('-c', '--cluster'):
                cluster = arg
            elif opt in ('-u', '--user'):
                user = arg
            elif opt in ('-o', '--output'):
                fnout = arg
            elif opt in ('-s', '--https'):
                use_https = True if arg == 'True' else False

        # make sure required args were supplied
        if not target or not user or not cluster:
            raise getopt.GetoptError(
                'Not all required arguments supplied. Required: cluster, target and username')

    except getopt.GetoptError as e:
        logging.error(help_text)
        logging.error(e)
        sys.exit(2)

    return target,cluster,user,fnout,use_https


if __name__ == "__main__":
    # config logging
    logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.INFO)
    requests.packages.urllib3.disable_warnings()

    # get script arguments
    target,cluster,user,fnout,use_https = main(sys.argv[1:])

    # get password
    passwd = getpass.getpass()

    # print info
    logging.info('Exporter initialized!')
    logging.info('Ambari Host: ' + target)
    logging.info('Cluster: ' + cluster)
    logging.info('User: ' + user)
    logging.info('File: ' + fnout)
    logging.info('Password: ******')
    logging.info('HTTPS: ' + str(use_https))

    # start new exporter
    exporter = ClusterExporter(target, cluster, user, passwd, use_https)

    # export cluster (using files)
    #result = exporter.export_cluster(fnout, 'cluster.json', 'hosts.json', ['host_01.json', 'host_02.json', 
    #    'host_03.json', 'host_04.json', 'host_05.json', 'host_06.json', 'host_07.json', 'host_08.json', 'host_09.json'])

    result = exporter.export_cluster(fnout)
    if result:
        print('----------')
        print(result)
        print('----------')

    # done
    logging.debug('Done =)')


