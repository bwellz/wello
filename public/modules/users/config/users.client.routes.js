'use strict';

/**
 * User Module Routes
 */

// Client-Side Router
angular.module('users').config(['$stateProvider',
	function($stateProvider) {

		// Users ui-router routing
		$stateProvider.
		state('signup', {
			url: '/signup',
			templateUrl: 'modules/users/views/signup.client.view.html'
		}).
		state('signin', {
			url: '/signin',
			templateUrl: 'modules/users/views/signin.client.view.html'
		}).
		state('signout', {
			url: '/signout',
			controller: function($scope, $http, $location, Authentication) {
				$http.post('/auth/signout').success(function(response) {
					$scope.authentication = Authentication;
					$scope.authentication.user = null;
					$location.url('/singin');
				}).error(function(response) {
					$scope.error = response.message;
				});
			}
		}).
		state('signout_base', {
			url: '/signout_base',
			controller: function($scope, $http, $location, Authentication) {
				$http.post('/auth/signout').success(function(response) {
					$scope.authentication = Authentication;
					$scope.authentication.user = null;
					$location.url('/fridge/base/auth');
				}).error(function(response) {
					$scope.error = response.message;
				});
			}
		});		
	}
]);