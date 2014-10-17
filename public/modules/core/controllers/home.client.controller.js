'use strict';
/*global $:false */

/**
 * Cotroller for the Wello Store Front
 */

// Controller
angular.module('core').controller('HomeController', ['$scope', '$state', '$timeout', 'Authentication', 'CapabilityService',
	function($scope, $state, $timeout, Authentication, CapabilityService) {
		// This provides Authentication context.
		$scope.authentication = Authentication;

		// Cancel potential BGs from a fridge page
		document.body.style.backgroundImage = 'none';
		document.body.style.backgroundColor =  '#23719F';

		// Fridge Descriptions
		$scope.fridges = [{
			name: 'Wello Fridge Classic	',
			link: '#!/fridge/base',
			marketing: [
				{icon: 'ok',text: 'Classic Design'},
				{icon: 'cloud-download',text: 'Magically imports your Trello boards'},
				{icon: 'flash',text: 'Utilizes WelloBeam: the NOT-AT-ALL DANGEROUS card-projection technology'},
				{icon: 'tree-deciduous',text: 'Instantly 3D-print food with tofu!'},	
				{icon: 'cutlery',text: 'Easily prepare any meal with automated cooking using ingredients in your fridge!'},
				{icon: 'picture',text: 'Always know the weather unless it\'s not pleasant with CatWeather'},					
				{icon: 'tag',text: '$12,899.95'}															
			]
		},
		{
			name: 'Wello Fridge DX',
			link: '#!/fridge/dx',
			marketing: [
				{icon: 'asterisk',text: 'For the most demanding Wello customer'},
				{icon: 'ok',text: 'All of the same incredible features of the Wello Fridge Classic plus new exclusives'},
				{icon: 'globe',text: 'Shame your friends into action with the ALS Challenge attachment'},
				{icon: 'glass',text: 'Includes the Wello Whiskey-Ice Maker, designed by Ferrari and available to you thanks to extensive industrial espionage'},	
				{icon: 'fire',text: 'Unexplained fires are a relatively rare occurence and a matter for the courts'},	
				{icon: 'tag',text: 'A lot of easy payments of $11,999.99'}															
			]
		},
		{
			name: 'Wello Fridge Mini',
			link: '#!/fridge/mini',
			marketing: [
				{icon: 'asterisk',text: 'The perfect dorm room fridge as long as your parents are filthy rich and spoil you'},
				{icon: 'ok',text: 'All the same features and thus the same cost as the Wello Fridge Classic, but amazingly a quarter the size'},
				{icon: 'glass',text: 'A false back showing an empty fridge allows you to easily guilt your parents into sending you beer money, which you already had since they spoil you'},	
				{icon: 'tag',text: '$12,899.95'}															
			]			
		},
		{
			name: 'Wello Fridge Silver',
			link: '#!/fridge/silver',
			marketing: [
				{icon: 'asterisk',text: 'For our gullible consumer who yearns for the "better" days'},
				{icon: 'ok',text: 'Some features, maybe, if you angle it right'},
				{icon: 'flash',text: '14.4k modem with speed boost, which honestly doesn\'t do anything'},
				{icon: 'heart',text: 'Holds more yams than any other fridge'},	
				{icon: 'tag',text: 'The majority of your retirement savings'}															
			]
		}];

		// Resolution and browswer warning variables
		$scope.show_resolution_warning = 0;
		$scope.suppress_resolution = 0;
		$scope.show_browser_warning = 0;
		$scope.suppress_browser = 0;
		$scope.height = 0;
		$scope.width = 0;
		$scope.show_mobile = false;

		// ###### Manage Resolution and Browser Warnings for the Fridge ###########

		// Extend the scope with the CapabilityService
	    angular.extend($scope, CapabilityService);
	    $scope.init_capability_check($scope);
		// suppress browser warning
		$scope.sup_browser = function(val) {
			$scope.suppress_browser = val;
		};
		// suppres resolution warning
		$scope.sup_resolution = function(val) {
			$scope.suppress_resolution = val;
		};		

		// Go to the provided state (ui-router)
		$scope.goto = function(state) {
			$state.go(state);
		};
	}
]);