'use strict';

/**
 * Init Client
 */

// Define main module and add in dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);

// Set HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config(['$locationProvider',
	function($locationProvider) {
    // Who doesn't like to say "hashbang?"
		$locationProvider.hashPrefix('!');
	}
]);

//Then define the init function for starting up the application
angular.element(document).ready(function() {
  var initInjector = angular.injector(['ng']);
  var $http = initInjector.get('$http');

  // Load in our user if they are logged in
  // The user object can be populated at any time during use
  $http.get('/users/me?whyiewhy='+new Date().getTime()).then(
      function (response) {
      	if ( response.data === 'null' ) {
      		window.user = null;
      	} else {
         	window.user = response.data;
        }
        // bootstrap (the action, not the framework)
        angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
      }
  );
});

