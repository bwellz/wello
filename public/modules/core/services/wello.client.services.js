/**
 * Common Services
 */

// Performs capability and resize checking in order to display warnings when not using Chrome or an improper resolution
angular.module('core').service("CapabilityService", ['$timeout', function($timeout) {

    var capability_check = {};

    var width, height;

	capability_check.check_capabilities = function(scope,w,h) {
		$timeout(function(){
			scope.width = w;
			scope.height = h;
			if ( typeof window.orientation !== 'undefined' || (navigator.userAgent.indexOf('IEMobile') !== -1) ) {
				scope.show_mobile = true;
			} else {
				scope.show_mobile = false;
				if ( w < 1250 ) {
					scope.show_resolution_warning = 2;
				} else if ( w < 1500 || w > 2100 ) {
					scope.show_resolution_warning = 1;
				} else {
					scope.show_resolution_warning = 0;
				}
				if ( typeof window.chrome === 'object' ) {
					scope.show_browser_warning = 0;
				} else if ( typeof InstallTrigger !== 'undefined' ) {
					scope.show_browser_warning = 1;
				} else if (document.body.style.msScrollLimit !== undefined){
					scope.show_browser_warning = 1;
				} else {
					scope.show_browser_warning = 2;
				}
			}
		});
	};

	capability_check.init_capability_check = function(scope) {
		height = $(window).height(); // New height
		width = $(window).width(); // New width
		$(window).resize(function() {
		  // This will execute whenever the window is resized
		  height = $(window).height(); // New height
		  width = $(window).width(); // New width
		  capability_check.check_capabilities(scope,width,height);
		});
		capability_check.check_capabilities(scope,width,height);
	}

    return capability_check;
}]);

// Simple service for passing the board data between sub views
angular.module('core').factory('BoardService', function () {
	return {data:[],update:0,board_request:null,name:'',show_nibbles:false,show_cardbreaker:false,force:false,custom_board:0};
});

// Simple service for passing food (and achievement) data between sub views
angular.module('core').factory('FoodService', function () {
	return {food:[],recipes:[],achievements:[],update:0};
});

// Simple service for preparing food between the upper fridge panel and the fridge itself
angular.module('core').factory('FoodPrepService', function () {
	return {new_food:null,food_id:null};
});

// Simple service for capturing achievements emitted from other parts of the app
angular.module('core').factory('AchievementService', function () {
	var achieve = {id:-1,amount:0};
	achieve.achievement = function(achievement_id,achievement_amount) {
		achieve.id = achievement_id;
		achieve.amount = achievement_amount;
	}	
	return achieve;
});