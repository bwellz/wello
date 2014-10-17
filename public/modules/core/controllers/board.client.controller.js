'use strict';
/*global $:false */

/**
 * Board Controller: Manages the lower sub-view (boards and weather)
 */

// directive: listen for mousedown or escape on the whole document (except stop-propagation'd containers) and cancel opened dialogs
angular.module('core').directive('boardKeys', function () {
	return {
	    restrict: 'A',
	    // we inherit scope from the BoardController
	    link: function (scope, element) {
	    	$('html').on('mousedown', function (e) {
	    		if ( scope.something_to_cancel ) {
		    		scope.hide_all();
		    		scope.$apply();
		    	}
	    	});
	        $('html').on('keydown', function (event) {
		    	switch (event.keyCode) {
		    		case 27: //escape
		    			scope.hide_all();
		    			scope.$apply();
		    			break;
		    		default:
		    			break;
		    	}
	    	});	    	
	    }
	};
});

// Controller
angular.module('core').controller('BoardController', ['$scope', '$state', '$http', '$timeout', 'Authentication', 'BoardService', 'FoodService', 'MessageService', 'AchievementService',
	function($scope, $state, $http, $timeout, Authentication, BoardService, FoodService, MessageService, AchievementService) {
		// Services
		$scope.authentication = Authentication;		
		$scope.board = BoardService;

		$scope.boards = []; // array containing all board data (excluding lists and cards).  Loaded once.
		var board_index_lookup = {}; // lookup table for quickly determining the index of a board if supplied a board ID

		// track boards being operated on and dialog actions
		$scope.cur_board = null;
		$scope.edit_board = null;
		$scope.delete_board = null;
		$scope.edit_board_name = '';
		$scope.new_board_name = ''; 		
		$scope.show_newboard = false;

		// set to true if dialogs are open
		$scope.something_to_cancel = false;

		// hide all open dialogs on the board panel
		$scope.hide_all = function() {
			$scope.cancel_delete_board();
			$scope.cancel_edit_board_name();
			$scope.cancel_new_board();
		};

		// load boards for the user when the page loads
		$scope.initBoards = function() {
			$scope.boards = [];
			$scope.board.data = null;
			$scope.board.update++;
			$http.get('/boards?whyiewhy='+new Date().getTime()).success(function(data) {
				$scope.boards = data.boards;
				board_index_lookup = {};
				for ( var i = 0; i < $scope.boards.length; i++ ) {
					board_index_lookup[$scope.boards[i].board] = i;
				}
				$scope.snake_board = data.snake_board;
				$scope.resume_board = data.resume_board;
				$scope.portfolio_board = data.portfolio_board;
				$scope.food_board = data.food_board;
				$scope.recipe_board = data.recipe_board;
				$scope.chores_board = data.chores_board;
				$scope.art_board = data.art_board;
				$scope.welcome_board = data.welcome_board;	
				FoodService.food = data.food;
				FoodService.recipes = data.recipes;
				FoodService.achievements = data.achievements;
				FoodService.update++;		
				if ( data.cur_board === $scope.snake_board ) {
					$scope.loadBoard(data.return_board);
				} else {
					$scope.loadBoard(data.cur_board);
				}
				$timeout(function() {
					$('.board_scrollbar').perfectScrollbar({suppressScrollX:true});
				},0);		
				MessageService.remove_disaster('',2);											
			}).error(function(err) {
				MessageService.add_disaster(err.message,2);	
			});		
			$timeout(function(){
				if ( window.chrome ) {
					AchievementService.achievement(49,1);
				} 
			},2000);
		};

		// Watch for an incoming board request from anywhere in the application and load that board
		// Piggyback on this method to call signout from anywhere as well since signout needs to destroy data within this scope
		$scope.$watch(function () { return BoardService.board_request; }, function (newVal, oldVal) {
		    if (typeof newVal !== 'undefined' && newVal !== null) {
		    	if ( newVal === 'destroy' ) {
		    		$scope.signout();
		    	} else {
			    	if ( newVal === 'snake' ) newVal = $scope.snake_board;
			    	else if ( newVal === 'cardbreaker' ) newVal = 'cardbreaker';
					$scope.loadBoard(newVal);
					$scope.board.board_request = null;       
				}
		    }
		});

		// Load the requested board
		// Also handle the loading of special boards
		$scope.loadBoard = function(board_id) {
			if ( BoardService.show_nibbles && !BoardService.force ) {
				MessageService.flash_disaster('Look after your Wello Snake!',3000);
			} else if ( BoardService.show_cardbreaker && !BoardService.force ) {
				MessageService.flash_disaster('Munchkin isn\'t going to paddle herself!',3000);
			} else {
				BoardService.force = false;
				// open the edit board name dialog if this board is already open
				if ( $scope.cur_board === board_id ) {
					$scope.something_to_cancel = true;
					$scope.edit_board = board_id;
					$scope.edit_board_name = $scope.boards[board_index_lookup[board_id]].name;
					return;
				}
				$scope.cancel_edit_board_name();
				$scope.cancel_delete_board();
				$scope.cancel_new_board();	
				$scope.cur_board = board_id;	
				$http.get('/board/'+board_id+'?whyiewhy='+new Date().getTime()).success(function(data) {
					$scope.board.data = data;
					$scope.board.update++;
					if ( data._id === $scope.resume_board ) {
						BoardService.custom_board = 1;
						BoardService.name = 'Brad Wells\'s Resume';						
						MessageService.remove_disaster('Current Board: Brad Wells\'s Resume',1);
						AchievementService.achievement(18,1);
					} else if ( data._id === $scope.portfolio_board ) {
						BoardService.custom_board = 2;						
						BoardService.name = 'Brad Wells\'s Portfolio';	
						MessageService.remove_disaster('Current Board: Brad Wells\'s Portfolio',1);
						AchievementService.achievement(19,1);
					} else if ( data._id === $scope.food_board ) {
						BoardService.custom_board = 3;						
						BoardService.name = 'Food!';							
						MessageService.remove_disaster('Current Board: Food!',1);
						AchievementService.achievement(20,1);						
					} else if ( data._id === $scope.recipe_board ) {
						BoardService.custom_board = 4;						
						BoardService.name = 'Recipes';							
						MessageService.remove_disaster('Current Board: Recipes',1);
						AchievementService.achievement(21,1);						
					} else if ( data._id === $scope.art_board ) {
						BoardService.custom_board = 5;						
						BoardService.name = 'Crappy Kid\'s Artwork';							
						MessageService.remove_disaster('Current Board: Crappy Kid\'s Artwork',1);
						AchievementService.achievement(23,1);						
					} else if ( data._id === $scope.welcome_board ) {
						BoardService.custom_board = 6;						
						BoardService.name = 'Achievement Progress';							
						MessageService.remove_disaster('Current Board: Achievement Progress',1);
					} else if ( data._id !== $scope.snake_board && data._id !== 'cardbreaker' ) {
						if ( $scope.boards[board_index_lookup[board_id]].trello_board ) {
							AchievementService.achievement(8,1);	
						}
						if ( $scope.boards[board_index_lookup[board_id]].truncated ) {
							if ( $scope.boards[board_index_lookup[board_id]].trello_board ) {
								$timeout(function() {
									AchievementService.achievement(27,1);
								},2500);
							}
						}						
						BoardService.custom_board = 0;
						BoardService.name = $scope.boards[board_index_lookup[board_id]].name;
						MessageService.remove_disaster('Current Board: ' + BoardService.name,1);					
					} else if ( data._id === $scope.snake_board ) {
						BoardService.custom_board = 7;
					} else {
						BoardService.custom_board = 8;
					}
					$scope.custom_board = BoardService.custom_board;
				}).error(function(err) {
					MessageService.add_disaster(err.message,1);	
				});
			}
		};

		// ######## Create Board #########

		// Open Create Board Dialog
		$scope.show_new_board = function() {
			$scope.edit_board = null;
			$scope.delete_board = null;
			$scope.show_newboard = true;
			$scope.something_to_cancel = true;
		};

		// Create Board
		$scope.create_new_board = function() {
			$http.post('/new_board',{name:$scope.new_board_name}).success(function(data) {
				$scope.boards.push({'name':data.name,'board':data.board});
				board_index_lookup[data.board] = $scope.boards.length-1;
				$scope.loadBoard(data.board);	
				$timeout(function() {
					$('.board_scrollbar').perfectScrollbar('update');
					MessageService.flash_success('Successfully Created Board',3000);
					AchievementService.achievement(10,1);					
				},0);	
								
			}).error(function(err) {
				MessageService.flash_disaster(err.message,4000);			
			});	
		};

		// Close Create Board Dialog
		$scope.cancel_new_board = function() {
			$scope.show_newboard = false;
			$scope.new_board_name = '';
			$scope.something_to_cancel = false;
		};

		// ######## Update Board Name #########
		// Opening the dialog is performed in the load board function

		// Update Board Name
		$scope.update_board_name = function() {
			$http.post('/board_name',{name:$scope.edit_board_name,board_id:$scope.cur_board}).success(function(data) {
				AchievementService.achievement(44,1);
				$scope.boards[board_index_lookup[$scope.cur_board]].name = data.board_name;
				$scope.cancel_edit_board_name();		
				MessageService.post('Current Board: ' + data.board_name);	
				$timeout(function() {
					MessageService.flash_success('Successfully Updated Board Name',3000);
				},0);									
			}).error(function(err) {
				MessageService.handle_error(err);				
			});
		};

		// Cancel Edit Board Name Dialog
		$scope.cancel_edit_board_name = function() {
			$scope.edit_board = null;
			$scope.edit_board_name = '';
			$scope.something_to_cancel = false;
		};

		// ####### Toggle Board Star ############

		$scope.toggle_star = function(board) {
			var board_index = board_index_lookup[board];
			var star;
			if ( $scope.boards[board_index].starred ) {
				star = false;
			} else {
				star = true;				
			}	
			$http.post('/board_star',{star:star,board_id:board}).success(function(data) {
				var $elem = $('#board_'+board); 
				$elem.addClass('quick-fade-out');		
				$timeout(function(){
					$scope.boards[board_index].starred = data.star;
					if ( data.star ) {
						AchievementService.achievement(50,1);
					}
					$elem.removeClass('quick-fade-out');
					$elem.addClass('quick-fade-in');
					$timeout(function(){
						$elem.removeClass('quick-fade-in');
					},450);
				},450);
				MessageService.flash_success('Successfully Toggled Board Star',3000);									
			}).error(function(err) {
				MessageService.handle_error(err);				
			});			

		};

		// ########### Delete Board ##############

		// Open Delete Board Dialog
		$scope.show_delete_board = function() {
			$scope.something_to_cancel = true;
			$scope.show_newboard = false;
			$scope.delete_board = $scope.cur_board;
		};		

		// Delete Board
		$scope.delete_this_board = function() {
			$http.get('/delete_board/'+$scope.delete_board+'?whyiewhy='+new Date().getTime()).success(function(data) {
				// remove only the element that was deleted for animation purposes
				AchievementService.achievement(45,1);
				if ( data.boards.length === 0 ) {
					$scope.boards = [];
				} else {
					var removed = false;
					for ( var i = 0; i < data.boards.length; i++ ) {
						if ( $scope.boards[i].board !== data.boards[i].board ) {
							$scope.boards.splice(i,1);
							removed = true;
							// no need to remove the board index lookup table entry, but do need to update the table
							// it is safe to reuse i
							for ( i = 0; i < $scope.boards.length; i++ ) {
								board_index_lookup[$scope.boards[i].board] = i;
							}							
							break;
						}
					}
					// if the element wasn't found, it's the last one; no need to update lookup
					if ( !removed ) {
						$scope.boards.pop();
					} 
				}
				$scope.loadBoard(data.cur_board);
				$timeout(function() {
					$('.board_scrollbar').perfectScrollbar('update');
				},0);	
				MessageService.flash_success('Successfully Deleted Board',2000);			
			}).error(function(err) {
				MessageService.flash_disaster(err.message,2000);				
			});
		};

		// Close Delete Board Dialog
		$scope.cancel_delete_board = function() {
			$scope.delete_board = null;		
			$scope.something_to_cancel = false;				
		};		

		// Signup and do some lazy-garbage-collection-assisted cleanup
		$scope.signout = function() {
			$scope.board.data = null;
			$scope.board.update++;
			$scope.boards = [];
			$scope.board_index_lookup = {};
			BoardService.data = [];
			FoodService.food = [];
			FoodService.recipes = [];
			FoodService.achievements = [];			
			BoardService.board_request = null;
			MessageService.post('Successfully Signed Out of Wello.');			
			$state.go('signout_base');
		};		
	}
]);