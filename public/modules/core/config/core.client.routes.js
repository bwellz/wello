'use strict';

/**
 * Angular UI-Router
 */

// Intercept the state change event and redirect if the user's login status is a mismatch with the route
angular.module('core').run( function($rootScope, $state, $location, Authentication) {
  $rootScope.$on( '$stateChangeStart', function(event, toState, toParams) { 
  	if ( typeof(toState.needloginstate) !== 'undefined' ) {
  		if ( !Authentication.user ) {
  			event.preventDefault();
  			$state.go(toState.needloginstate);
  		}
  	} else if ( typeof(toState.hasloginstate) !== 'undefined' ) {
  		if ( Authentication.user ) {
  			event.preventDefault();
  			$state.go(toState.hasloginstate);
  		}
  	}
  });
});

// Setting up route
angular.module('core').config(['$stateProvider', '$urlRouterProvider',
	function( $stateProvider, $urlRouterProvider ) {

		// Redirect to home view when route not found
		$urlRouterProvider.otherwise('/');

		// Client-side routes
		$stateProvider.
		// Store Page
		state('index', {
			url: '/',
			templateUrl: 'modules/core/views/index.client.view.html'
		}).
		// Base Fridge (Only Fridge) when logged in
		state('fridge_base', {
			url: '/fridge/base',
			needloginstate: 'fridge_base_auth',
			views: {
				'': {
					templateUrl: 'modules/core/views/fridges/base/index.client.view.html'
				},
                'top@fridge_base': {
                    templateUrl: 'modules/core/views/fridges/base/top.client.view.html'
                },
                'bot@fridge_base': {
                    templateUrl: 'modules/core/views/fridges/base/bot.client.view.html'
                }
            }
		}).	
		// Base Fridge when not logged in
		state('fridge_base_auth', {
			url: '/fridge/base/auth',
			hasloginstate: 'fridge_base',
			views: {
				'': {
					templateUrl: 'modules/core/views/fridges/base/index.client.view.html'
				},
                'top@fridge_base_auth': {
                    templateUrl: 'modules/core/views/fridges/base/auth.client.view.html'
                },
                'bot@fridge_base_auth': {
                    templateUrl: 'modules/core/views/fridges/base/bot_off.client.view.html'
                }
            }
		}).
		// You actually looked through my code so as a reward you can check out the fridges that could have been if I didn't have an actual job
		state('fridge_dx', {
			url: '/fridge/dx',
			templateUrl: 'modules/core/views/fridges/dx.client.view.html'
		}).
		state('fridge_mini', {
			url: '/fridge/mini',
			templateUrl: 'modules/core/views/fridges/mini.client.view.html'
		}).
		state('fridge_silver', {
			url: '/fridge/silver',
			templateUrl: 'modules/core/views/fridges/silver.client.view.html'
		});

	}
]);

