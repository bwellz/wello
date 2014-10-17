'use strict';

/**
 * User Module Controller
 */

// Controller
angular.module('users').controller('AuthenticationController', ['$scope', '$http', '$location', '$state', 'Authentication', 'MessageService',
	function($scope, $http, $location, $state, Authentication, MessageService) {
		$scope.authentication = Authentication;

		// If user is signed in then redirect back home
		if ($scope.authentication.user) $location.path('/home');

		// Signup for Wello
		// Trello Authentication is handled through a direct get request to /auth/trello/ and then a redirect is issued on success
		$scope.signup = function(fridge) {
			$http.post('/auth/signup', $scope.credentials).success(function(response) {
				//If successful we assign the response to the global user model
				$scope.authentication.user = response;
				$state.go('fridge_'+(fridge || $scope.authentication.signincb));
			}).error(function(response) {
				$scope.error = response.message;
				MessageService.message = 'Error Signing Up!';
				MessageService.update++;
				MessageService.disaster = true;
				MessageService.to = 4000;
			});
		};

		// Signin to existing account
		$scope.signin = function(fridge) {		
			$http.post('/auth/signin', $scope.credentials).success(function(response) {
				//If successful we assign the response to the global user model
				$scope.authentication.user = response;
				$state.go('fridge_'+(fridge || $scope.authentication.signincb));				
			}).error(function(response) {
				$scope.error = response.message;
				MessageService.message = 'Error Signing In!';
				MessageService.update++;
				MessageService.disaster = true;
				MessageService.to = 4000;				
			});
		};
	}
]);

