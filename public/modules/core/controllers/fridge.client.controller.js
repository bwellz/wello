'use strict';
/*global $:false */

/**
 * Fridge Controller: Control Opening and Closing Doors and Food Animation
 */

// Controller
angular.module('core').controller('FridgeController', ['$scope', '$timeout', '$interval', 'Authentication', 'BoardService', 'FoodPrepService', 'MessageService', 'AchievementService', 'CapabilityService',
	function($scope, $timeout, $interval, Authentication, BoardService, FoodPrepService, MessageService, AchievementService, CapabilityService) {
		// This provides Authentication context.
		$scope.authentication = Authentication;

		// Freezer variables
		$scope.freezer_show = false;
		$scope.freezer_open = false;
		$scope.door_opening = 0;
		$scope.hide_door = false;

		// Fridge variables
		$scope.fridge_show = false;
		$scope.fridge_open = false;	
		$scope.door2_opening = 0;
		$scope.hide_door2 = false;

		// Food Animation variables
		$scope.munchkin = {x:4490,rock:0};
		$scope.flying_food = [];
		$scope.caught_food = [];
		$scope.eating_food = null;
		var food_animation_running = false;
		var food_animation;
		var fps = 30.0;
		var anim_prev;
		var anim_now;
		var anim_elapsed;
		var ate_food;
		var munchkin_speed = 100.0;
		var food_speed = 150.0;
		var food_rot_speed = 360.0;
		var temp;
		var zindex = 99999;
		var num_salad = 0;
		var munchkin_rock = 22.0;
		var munchkin_bac = 0.0;
		$scope.munchkin_passed_out = false;
		var food_achieve = [];		

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

		// Initialize parallax scrolling for the fridge page
		// Please note that this is one of the only valid uses of parallax scrolling on the entire Internet
		$scope.bgScroll = function(bg,color,speed) {
			document.body.style.background = (color + ' url(\'' + bg + '\') no-repeat');	
			document.body.style.backgroundSize = '100%';
			window.onscroll = function() {
                document.body.style.backgroundPosition = (window.pageXOffset) + 'px ' + (-window.pageYOffset / speed) + 'px';
            };
		};

		// ######## Food Animation ##############

		// Watch for new flying food requests
		$scope.$watch(function () { return FoodPrepService.new_food; }, function (newVal, oldVal) {
		    if (newVal !== oldVal && newVal !== null) { /**/
		    	var start_anim = false;
		    	$scope.flying_food.push({x:900,y:330,scale:1.0,opacity:1.0,rot:-20,id:FoodPrepService.food_id,file:newVal,dropping:false});
		    	zindex--;
		    	FoodPrepService.new_food = null;
		    	if ( !food_animation_running ) {
		    		startFood();
		    	}
		    }
		});

		// Initialize a segment of food animation
		function startFood() {	
			anim_now = Date.now();
			food_animation_running = true;
			$scope.munchkin.x = 4490.0;
			$scope.munchkin.rock = 0;
			munchkin_speed = -1000.0;
			$scope.eating_food = null;
			ate_food = 0;
			// Need an array for quickly calculating if the "hold 4 specific foods at once" achievement
			food_achieve = new Array(25);
			for ( var i = 0; i < 25; i++ ) {
				food_achieve[i] = 0;
			}			
			animateFood();				
		}

		// RequestAnimationFrame loop
		// There's no polyfill used, because those browsers don't deserve it
		function animateFood() {
			renderFood();
			food_animation = window.requestAnimationFrame(animateFood);
		}

		// A whole method dedicated to my cat recovering from passing out after drinking too many Redbull & Vodkas... hire me?
		$interval(function() {
			munchkin_bac -= 1.0;
			if ( $scope.munchkin_passed_out && munchkin_bac < 2.0 ) {
				$scope.munchkin_passed_out = false;
				MessageService.flash('For better or worse, Munchkin is back...',3000);				
			}
			if ( munchkin_bac < 0.0 ) munchkin_bac = 0.0;
			AchievementService.achievement(1,ate_food);
			ate_food = 0;
		},10000);

		// This is the most beautiful method in the entire codebase; maybe any codebase. Refactoring would be a crime.
		function renderFood() {
			$timeout(function() {
				// Calculate Delta Time
				anim_prev = anim_now;
				anim_now = Date.now();
				anim_elapsed = anim_now - anim_prev;
				num_salad = 0;

				// Gross
				for ( var i = 0; i < $scope.flying_food.length; i++ ) {
					if ( $scope.flying_food[i].id === 10 /* Salad */ ) {
						num_salad++;
						$scope.flying_food[i].rot += food_rot_speed * (anim_elapsed/1000.0);					
						if ( $scope.flying_food[i].x > 1200.0 ) {
							$scope.flying_food[i].x += food_speed * (anim_elapsed/1000.0);
							if ( $scope.flying_food[i].x > 1310 ) {
								$scope.flying_food[i].y += (food_speed*8.0) * (anim_elapsed/1000.0);
							} else if ( $scope.flying_food[i].x > 1260 ) {
								$scope.flying_food[i].y += (food_speed*5.0) * (anim_elapsed/1000.0);
							} else {
								AchievementService.achievement(31,1);
								$scope.flying_food[i].y += (food_speed*3.0) * (anim_elapsed/1000.0);
							}
							if ( $scope.flying_food[i].x > 1400 ) {
								$scope.flying_food.splice(i,1);
								i--;
							}
						} else {
							$scope.flying_food[i].x += food_speed * (anim_elapsed/1000.0);
							$scope.flying_food[i].y = 330.0-200.0*Math.sin((($scope.flying_food[i].x-900.0)/300.0)*Math.PI);						
						}
					}
				}

				// Grosser
				if ( $scope.munchkin.x < 4000 ) {
					for ( i = 0; i < $scope.flying_food.length; i++ ) {
						if ( $scope.flying_food[i].id !== 10 /* Salad */ ) {
							$scope.flying_food[i].rot += food_rot_speed * (anim_elapsed/1000.0);
							if ( $scope.flying_food[i].x > 1200 ) {
								if ( $scope.caught_food.length >= 5 || $scope.flying_food[i].dropping || $scope.munchkin_passed_out ) {
									$scope.flying_food[i].dropping = true;
									$scope.flying_food[i].x += food_speed * (anim_elapsed/1000.0);
									if ( $scope.flying_food[i].x > 1310 ) {
										$scope.flying_food[i].y += (food_speed*8.0) * (anim_elapsed/1000.0);
									} else if ( $scope.flying_food[i].x > 1260 ) {
										$scope.flying_food[i].y += (food_speed*5.0) * (anim_elapsed/1000.0);
									} else {
										AchievementService.achievement(29,1);
										$scope.flying_food[i].y += (food_speed*3.0) * (anim_elapsed/1000.0);
									}
									if ( $scope.flying_food[i].x > 1400 ) {
										$scope.flying_food.splice(i,1);
										i--;
									}
								} else {
									temp = $scope.flying_food.splice(i,1)[0];
									temp.x = 0;
									temp.y = 0;
									$scope.caught_food.push(temp);
									i--;
									food_achieve[temp.id]++;
									if ( food_achieve[4] > 0 && food_achieve[7] > 0 && food_achieve[16] > 0 && food_achieve[24] > 0 ) {
										AchievementService.achievement(11,1);
									} else if ( food_achieve[8] > 0 && food_achieve[14] > 0 && food_achieve[15] > 0 && food_achieve[18] > 0 ) {
										AchievementService.achievement(3,1);
									}
								}
							} else {
								$scope.flying_food[i].x += food_speed * (anim_elapsed/1000.0);
								$scope.flying_food[i].y = 330.0-200.0*Math.sin((($scope.flying_food[i].x-900.0)/300.0)*Math.PI);
							}
						}
					}
				}

				// Short, but Gross
				if ( $scope.eating_food === null && !$scope.munchkin_passed_out ) {
					if ( $scope.caught_food.length > 0 && ( $scope.caught_food.length >= 5 || $scope.flying_food.length === num_salad ) ) {
						$scope.eating_food = $scope.caught_food.pop();
						ate_food++;
					}
				}

				// Grossest
				if ( $scope.eating_food !== null ) { /**/
					$scope.eating_food.x += 80.0*(anim_elapsed/1000.0);
					$scope.eating_food.y -= 60.0*(anim_elapsed/1000.0);
					$scope.eating_food.opacity -= 0.66*(anim_elapsed/1000.0);
					$scope.eating_food.scale -= 0.66*(anim_elapsed/1000.0);
					if ( $scope.eating_food.scale < 0.05 ) {
						if ( $scope.eating_food.id === 23 || $scope.eating_food.id === 24 || $scope.eating_food.id === 19 ) {
							munchkin_bac += 1.0;
							if ( munchkin_bac > 4.1 ) {
								MessageService.flash('Phew, Munchkin drank too much and passed out!',3000);
								AchievementService.achievement(28,1);
								$scope.munchkin_passed_out = true;
							}
						}
						food_achieve[$scope.eating_food.id]--;
						$scope.eating_food = null;
					}
					if ( !$scope.munchkin_passed_out ) {
						$scope.munchkin.rock += munchkin_rock * (anim_elapsed/1000.0);
						if ( $scope.munchkin.rock > 3.0 ) {
							$scope.munchkin.rock = 3.0;
							munchkin_rock = -22.0;
						} else if ( $scope.munchkin.rock < -3.0 ) {
							$scope.munchkin.rock = -3.0;
							munchkin_rock = 22.0;
						}
					}
				} else {
					if ( !$scope.munchkin_passed_out) {
						if ( $scope.caught_food.length > 0 || $scope.flying_food.length > num_salad ) {
							if ( munchkin_speed < -101 ) {
								$scope.munchkin.x += munchkin_speed * (anim_elapsed/1000.0);
								if ( $scope.munchkin.x > 2500 ) {
									munchkin_speed = -6000.0;
								} else if ( $scope.munchkin.x > 1800 ) {
									munchkin_speed = -3000.0;
								} else if ( $scope.munchkin.x > 1550 ) {
									munchkin_speed = -500.0;						
								} else if ( $scope.munchkin.x > 1250 ) {
									munchkin_speed = -200.0;
								} else {
									munchkin_speed = 100.0;
								}
							} else {
								$scope.munchkin.x += munchkin_speed * (anim_elapsed/1000.0);
								if ( $scope.munchkin.x > 1400 ) {
									munchkin_speed = -102.0;					
								} else if ( $scope.munchkin.x > 1300 ) {
									munchkin_speed = -100.0;
								} else if ( $scope.munchkin.x < 1250 ) {
									$scope.munchkin.x = 1250.0;
									munchkin_speed = 100.0;
								}
							}
						} else {
							if ( $scope.munchkin.x > 1600 ) {
								$scope.munchkin.x += 2000.0 * (anim_elapsed/1000.0);					
							} else {
								$scope.munchkin.x += 80.0 * (anim_elapsed/1000.0);
							}
						}
					}
				}

				// ...Gross
				if ( $scope.munchkin.x > 4500.0 && num_salad === 0 ) {
					food_animation_running = false;
					window.cancelAnimationFrame(food_animation);
				}
			});	
		}

		// ########### Door Animation #############

		// Open Freezer
		$scope.door1_animation = function() {
			if ( $scope.freezer_open === false ) {	
				$scope.door_opening = 1;
				$scope.freezer_open = true;
				$scope.freezer_show = true;
				$timeout(function() {
					$scope.hide_door = true;							
				},2000);		
				MessageService.flash('Opening Freezer',2000);	
				AchievementService.achievement(30,1);
			}
		};

		// Close Freezer
		$scope.door1_close_animation = function() {
			if ( $scope.freezer_open === true ) {
				$scope.door_opening = 2;
				$scope.hide_door = false;
				$timeout(function() {
					$scope.freezer_show = false;				
					$timeout(function() {
						$scope.door_opening = 0;	
						$scope.freezer_open = false;
					},1000);							
				},2000);
				MessageService.flash('Closing Freezer',2000);				
			}
		};

		// Open Fridge
		$scope.door2_animation = function() {
			if ( $scope.fridge_open === false ) {	
				$scope.door2_opening = 1;
				$scope.fridge_open = true;
				$scope.fridge_show = true;
				$timeout(function() {
					$scope.hide_door2 = true;					
				},2000);	
				MessageService.flash('Opening Fridge',2000);	
				AchievementService.achievement(32,1);										
			}
		};

		// Close Fridge
		$scope.door2_close_animation = function() {
			if ( $scope.fridge_open === true ) {
				$scope.door2_opening = 2;
				$scope.hide_door2 = false;
				$timeout(function() {
					$scope.fridge_show = false;				
					$timeout(function() {
						$scope.door2_opening = 0;	
						$scope.fridge_open = false;
					},1000);		
				},2000);
				MessageService.flash('Closing Fridge',2000);				
			}
		};

		// need to destroy the board, the board controller will continue the signout
		$scope.signout = function() {	
			BoardService.board_request = 'destroy';
		};
	}
]);


