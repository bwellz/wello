'use strict';

/**
 * User Services
 */

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', ['$resource',
	function($resource) {
		return $resource('users', {}, {
			update: {
				method: 'PUT'
			}
		});
	}
]);

// Authentication service for user variables
angular.module('users').factory('Authentication', function() {
	var _this = this;
	_this._data = {
		user: window.user,
		signincb: null
	};
	return _this._data;
});

