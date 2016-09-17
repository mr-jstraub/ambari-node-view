/**
 * Import and Export - Controller
 **/
angular.module('mImportExport', ['mNodeView', 'mBlueprint'])
    .controller('ImportExportController', ['$scope', 'DefEnvironment', 'MainCluster', 'Blueprint', function($scope, DefEnvironment, MainCluster, Blueprint){
        /* {Json string} Enviornment that will be imported */
        $scope.importEnv = DefEnvironment.getStoredEnvAsStr();
        /* {Json string} Cluster that will be imported  */
        $scope.importCluster = '';
        /* {JSON string} Exported cluster environment */
        $scope.exportEnv = DefEnvironment.expEnv();

        $scope.import = function(){
            console.debug('Try importing new cluster and environment');
            if(!$scope.importEnv || !$scope.importCluster){
                console.warn('Unable to import empty cluster or environment');
                return;
            }
            // reset blueprint bundle calculation
            Blueprint.resetBundle = true;
            // Load new env
            DefEnvironment.loadEnvFromJsonStr($scope.importEnv);
            MainCluster.importCluster($scope.importCluster);

            // reset import field
            $scope.importCluster = '';
        };

    }]);