'use strict';
/*global $:false */

/**
 * Primary Board Controller for Lists and Cards (and Modal Controller for opening Cards)
 */

// Modal Controller
angular.module('core').controller('ModalController', ['$scope', '$modalInstance', 'data',
	function($scope, $modalInstance, data) {

		// Set up Modal scope based on data provided
		$scope.custom_board = data.custom_board;		
		$scope.label_names = data.label_names;
		$scope.card = data.card;
		$scope.labels_locked = data.labels_locked;
		$scope.card_locked = data.card_locked;
		$scope.label_func = data.toggle_card_label;
		$scope.name_func = data.commit_card_name;
		$scope.des_func = data.commit_card_des;
		$scope.delete_func = data.commit_card_delete;
		
		// Editable variables
		$scope.edit_name = '';
		$scope.show_edit_name = false;
		$scope.edit_des = '';
		$scope.show_edit_des = false;
		$scope.show_delete = false;

		var food_func = data.food_func;
		var recipe_func = data.recipe_func;
		var achievement_func = data.achievement_func;

		// Achievement for "meeting Munchkin"
		if ( $scope.card.munchkined ) {
			achievement_func(0,1);
		}

		// Achievements for opening particular boards
		if ( $scope.custom_board === 6 ) {
			$scope.achievement = data.achievements[$scope.card.achievement_ref];
		} else if ( $scope.custom_board === 4 ) {
			$scope.food = data.food;
			$scope.recipe = data.recipes[$scope.card.recipe_ref];
			achievement_func(22,1);
		} else if ( $scope.custom_board === 3 ) {
			$scope.food = data.food;
		}

		// ####### Edit Card Name ##########

		// Show edit card name dialog
		$scope.show_edit_name = function() {
			if ( !$scope.card_locked ) {			
				$scope.show_name = true;
				$scope.edit_name = $scope.card.name;
				$scope.show_delete = false;
			}
		};

		// Commit the name by calling an anonymous passed to the Modal from WelloController
		$scope.commit_name = function() {
			if ( !$scope.card_locked ) {
				$scope.name_func($scope.edit_name,function(result){
					$scope.card.name = result;
					$scope.edit_name = '';
					$scope.show_name = false;
				});
			}
		};

		// Hide edit card name dialog
		$scope.hide_edit_name = function() {
			$scope.show_name = false;
			$scope.edit_name = '';
		};

		// ####### Edit Card Description ##########

		// Show edit card description dialog
		$scope.show_edit_des = function() {
			if ( !$scope.card_locked ) {
				$scope.show_des = true;
				$scope.edit_des = $scope.card.des;
				$scope.show_delete = false;
			}
		};

		// Commit the description by calling an anonymous passed to the Modal from WelloController
		$scope.commit_des = function() {
			if ( !$scope.card_locked ) {
				$scope.des_func($scope.edit_des,function(result){
					$scope.card.des = result;
					$scope.edit_des = '';
					$scope.show_des = false;
				});
			}
		};
		
		// Hide edit card description dialog		
		$scope.hide_edit_des = function() {
			$scope.show_des = false;
			$scope.edit_des = '';
		};

		// ###### Other Functions ##########

		// Toggle a label on the card by calling an anonymous passed to the Modal from WelloController
		$scope.toggle_label = function(index) {
			if ( !$scope.labels_locked ) {
				$scope.show_delete = false;				
				$scope.label_func(index,function(result){
					$scope.card.labels[index] = result;
				});
			}
		};

		// ####### Delete Card ##########

		// Show delete card dialog
		$scope.show_delete_dialog = function() {
			if ( !$scope.card_locked ) {			
				$scope.show_delete = true;
				$scope.show_name = false;
				$scope.show_des = false;
			}
		};

		// Commit delete card by calling an anonymous passed to the Modal from WelloController
		$scope.commit_delete = function() {
			if ( !$scope.card_locked ) {
				$scope.delete_func(function(){
					$modalInstance.dismiss('cancel');
				});
			}
		};

		// hide delete card dialog
		$scope.hide_delete_dialog = function() {
			$scope.show_delete = false;
		};

		// create additional food (anonymous from WelloController)
		// custom board 3 or 4 (food,recipes) only
		$scope.create_food = function(food) {
			food_func(food);
		};

		// prepare recipe (anonymous from WelloController)
		// custom board 4 (recipes) only
		$scope.prepare_recipe = function(recipe) {
			recipe_func(recipe);
		};

		// Return the number of active labels on this card
		$scope.num_labels = function() {
			var c = 0;
			for ( var i = 0; i < 6; i++ ) {
				if ( $scope.card.labels[i] ) c++;
			}
			return c;
		};

		// Dismiss Modal
		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};		
	}
]);

// Controller
// Manages all interaction with lists and cards as well as many "fun features" such as games and recipes
angular.module('core').controller('FridgeWelloController', ['$scope', '$http', '$timeout', '$interval', '$modal', 'Authentication', 'BoardService', 'FoodService', 'FoodPrepService', 'MessageService', 'AchievementService',
	function($scope, $http, $timeout, $interval, $modal, Authentication, BoardService, FoodService, FoodPrepService, MessageService, AchievementService) {
		Authentication.signincb = 'base';
		
		// Scope Variables for binding
		$scope.edit_label = false;
		$scope.something_to_cancel = false;
		$scope.food_categories = [];
		$scope.food_category = null;
		$scope.food_select = null;
		$scope.food = [];
		$scope.ice_id = -1;
		$scope.snake_top_score = 0;
		$scope.cardbreaker_top_score = 0;
		$scope.board_data = [];
		$scope.authentication = Authentication;
		$scope.showing_add_list = false;
		$scope.new_list_name = '';
		$scope.board_loaded = false;
		$scope.is_party_time = false;
		$scope.is_filter_Time = false;
		$scope.filterText = '';
		$scope.filterTextActive = '';
		$scope.filterAny = true;	
		$scope.clicking = false;	
		$scope.show_nibbles = false;	
		$scope.filtering_labels = false;
		$scope.nibbles_cloak = false;
		$scope.show_cardbreaker = false;
		$scope.cardbreaker_cloak = false;
		$scope.achievements = [];
		$scope.dirq = [];
		$scope.filter_labels_active = $scope.filter_labels = [false,false,false,false,false,false];
		$scope.wello_snake = [];
		$scope.new_card_name = '';

		// Local variables
		var the_party;	
		var filter_anim_to;		
		var list_from_index = null;
		var list_to_index = null;
		var list_uid = null;
		var delete_list = null;
		var edit_list;
		var add_card_list = null;
		var party_ended = false;
		var message = MessageService;
		var filter_regex;
		var can_scroll_left = true;
		var can_scroll_right = false;
		var scroll_parent = 0;
		var scroll_child = 0;
		var dontstopprop = false;
		var open_card = null;
		var open_list = null;
		var list_index = -1, card_index = -1;
		var kill_move = false;
		var removing_filters = false;
		var clicktime;
		var clickx, clicky;
		var list_index_from;		

		// snake and cardbreaker variables
		var card_anim_prev, card_anim_now, card_anim_elapsed, cardbreaker_animation, card_return_board, munchkin_size, card_collision;
		var x_begin, x_end, y_begin, y_end, x_test, y_test, ball_speed_x, ball_speed_y, ball_x_last, ball_y_last, ball_speed, ball_flatness;
		var cardbreaker_score, food_type, food_image, last_laser, cb_laser, cb_count, cumulative_speed;

		// Sortable Options
		$scope.sortableOptions = {
			start: function(e, ui) {
      			$(e.target).data('ui-sortable').floating = true;

    		},
			update: function(e, ui) {

				list_from_index = ui.item.index();
				list_uid = $scope.board_data.lists[list_from_index].uid;
			},
			stop: function(e, ui) {
				list_to_index = ui.item.index();

				if ( list_to_index !== null && list_from_index !== null && list_to_index !== list_from_index ) {
					$http.post('/list_move',{board_id:$scope.board_data._id,move:{from_list:list_from_index,to_list:list_to_index,list_id:list_uid}}).success(function(data) {
						MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);						
						$timeout(function(){
							MessageService.flash_success('Successfully Moved List', 2000);	
							$scope.achievement(46,1);							
						},0);						
					}).error(function(err){
						// revert list position
						var list = $scope.board_data.lists.splice(list_to_index,1)[0];
						$scope.board_data.lists.splice(list_from_index,0,list);

						MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);
						MessageService.handle_error(err);
					}).finally(function(){
						list_to_index = list_from_index = null;
					});		
				}

			},			
			axis: 'x',
			handle: '.list_head, .list_foot'
		};
		$scope.jqueryScrollbarOptions = {
			'type': 'simple',
			'disableBodyScroll': false
		};

		// ########## Controls ###############

		// Hide all open dialogs
		$scope.hide_all = function() {
			if ( $scope.something_to_cancel ) {
				$scope.hide_add_card();
				$scope.hide_delete_list();    					
				$scope.hide_add_list();
				$scope.hide_edit_list();   				
    			$scope.cancel_edit_label();
    		}
		};


		// ########## Boards ################

		// Watch the board service in order to load and setup a new board
		$scope.$watch(function () { return BoardService.update; }, function (newVal, oldVal) {
		    if (typeof newVal !== undefined) {
		    	if ( $scope.is_party_time ) {
		    		$scope.party_over();
		    	} 	
		    	$scope.board_loaded = false;

		    	var card;
				$scope.showing_add_list = false;
				$scope.new_list_name = '';
		    	$scope.filtering_labels = false;
		    	removing_filters = false;
				$scope.filter_labels = $scope.filter_labels_active = [false,false,false,false,false,false];	
				$scope.filterText = $scope.filterTextActive = '';
				filter_regex = new RegExp($scope.filterTextActive, 'i');
				$scope.filterAny = true;
				$scope.is_filter_time = false;
				party_ended = false;		
				$('.list').each(function(){						
					$(this).removeClass('list');
				});	    	

				$scope.board_data = BoardService.data;

		        add_card_list = null;		        
		        $scope.new_card_name = '';
		        if ( $scope.board_data !== null && ( typeof $scope.board_data.lists !== 'undefined' || BoardService.custom_board === 8 ) ) {
		
		    		$scope.custom_board = BoardService.custom_board;
			         	
		    		if ( $scope.custom_board !== 8 ) {
		    		
		    			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
		    				for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
								card = $scope.board_data.lists[i].cards[j];
								card.filtered = true;
								if ( $scope.custom_board === 4 ) {
									card.servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
		    					}
			    			}
			    		}
		    		}

					$timeout(function() {
						$scope.board_loaded = true;
						if ( $scope.custom_board === 7 ) {
							$scope.nibbles_cloak = true;
						} else {
							$scope.nibbles_cloak = false;							
						}
						if ( $scope.custom_board === 8 ) {
							$scope.cardbreaker_cloak = true;
							$timeout(function(){
								$('.fridge1-top-content-bot').perfectScrollbar('destroy');
							})
						} else {
							$scope.cardbreaker_cloak = false;							
							$timeout(function(){					
								$scope.new_list_pos = $scope.board_data.lists.length*200;						
								$scope.board_data.update = false;
								$timeout(function(){
									$('.list').each(function(){						
										var thish = ((360 - $(this).children('.list_head').height() - $(this).children('.list_foot').height()) +'px');	
									    $(this).children('.scrollbar-dynamic').css({'max-height': thish});
										$(this).children('.scrollbar-dynamic').perfectScrollbar({suppressScrollX:true});
									});								
									$('.fridge1-top-content-bot').perfectScrollbar('destroy').perfectScrollbar({suppressScrollY:true}).scrollLeft(0).perfectScrollbar('update');
								},0);
							},0);
						}
					},0);	
				}	        
		    }
		});

		// ############# Lists ################

		// resize the scrollbars on a list
		function resize_list(list,scrollto) {
			// get the list element
			var $elem = $('.list').eq(list);
			// calculate the remaining height for the cards
			var thish = ((360 - $elem.children('.list_head').height() - $elem.children('.list_foot').height()) +'px');	
			// get the scrolling container element

			$elem = $elem.children('.scrollbar-dynamic');		
			$elem.css('max-height',thish);
			if ( scrollto > -1 ) {
				$elem.scrollTop(scrollto);
			}
			$elem.perfectScrollbar('update');	
		}

		// open add list dialog
		$scope.show_add_list = function() {
			if ( !$scope.board_data.lists_locked ) {
				$scope.hide_all();			
				$scope.something_to_cancel = true;
				$scope.showing_add_list = true;
				$scope.new_list_name = '';
				$('.fridge1-top-content-bot').scrollLeft(10000).perfectScrollbar('update');				
			}
		};

		// add a new list
		$scope.commit_list_add = function() {
			$http.post('/list_add',{board_id:$scope.board_data._id,name:$scope.new_list_name}).success(function(data) {
				$timeout(function() {
					MessageService.flash_success('Successfully Added List.',4000);			
					$scope.achievement(48,1);		
				},0);
				$scope.board_data.lists.push(data.list);
				$scope.hide_add_list();	
				$timeout(function() {
					$scope.new_list_pos = ($scope.board_data.lists.length)*200;
					var $list = $('.list:eq('+($scope.board_data.lists.length-1)+')');				
					var thish = ((360 - $list.children('.list_head').height() - $list.children('.list_foot').height()) +'px');	
					$list.children('.scrollbar-dynamic').css({'max-height': thish});
					$list.children('.scrollbar-dynamic').perfectScrollbar({suppressScrollX:true});
					$timeout(function(){					

						$('.fridge1-top-content-bot').scrollLeft(10000).perfectScrollbar('update');

					},0);					
				},0);							
			}).error(function(err){MessageService.handle_error(err);});
		};		

		// hide add list dialog
		$scope.hide_add_list = function() {
			$scope.showing_add_list = false;
			$scope.something_to_cancel = false;
		};


		// show edit list dialog
		$scope.show_edit_list = function(list,list_obj) {
			if ( !$scope.board_data.lists_locked ) {
				$scope.hide_all();			
				open_list = list_obj;
				$scope.something_to_cancel = true;
				$scope.board_data.lists[list].showing_edit_list = true;
				edit_list = list;
				$scope.edit_list_name = $scope.board_data.lists[list].name;
				$timeout(function(){
					resize_list(list,-1);
				},0);
			}			
		};

		// change the name of a list
		$scope.commit_list_name = function() {
			$http.post('/list_name',{board_id:$scope.board_data._id,list:edit_list,list_id:open_list.uid,name:$scope.edit_list_name}).success(function(data) {
				$scope.achievement(43,1);
				$timeout(function() {
					MessageService.flash_success('Successfully Updated List Name.',3000);					
				},0);
				$scope.board_data.lists[data.list].name = data.name;
				$scope.hide_edit_list();							
			}).error(function(err){MessageService.handle_error(err);});
		};		

		// hide edit list dialog
		$scope.hide_edit_list = function() {
			if ( typeof edit_list !== 'undefined' && edit_list !== null ) {
				var list = edit_list;
				$scope.board_data.lists[edit_list].showing_edit_list = false;							
				$timeout(function(){
					resize_list(list,-1);
				},0);
				edit_list = null;
				open_list = null;
				$scope.something_to_cancel = false;
			}
		};

		// show delete list dialog
		$scope.show_delete_list = function(list,list_obj) {		
			if ( !$scope.board_data.lists_locked ) {

				$scope.hide_all();	
				open_list = list_obj;				
				$scope.something_to_cancel = true;
				$scope.board_data.lists[list].showing_delete_list = true;
				delete_list = list;
				$timeout(function(){
					resize_list(list,-1);
				},0);
			}
		};

		// delete a list
		$scope.commit_list_delete = function() {
			$http.post('/list_delete',{board_id:$scope.board_data._id,list:delete_list,list_id:open_list.uid}).success(function(data) {
				$timeout(function() {
					MessageService.flash_success('Successfully Deleted List.',4000);
					$scope.achievement(45,1);	
				},0);
				$scope.hide_delete_list();				
				$scope.board_data.lists.splice(data.list,1);

				$timeout(function() {
					$scope.new_list_pos = $scope.board_data.lists.length*200;
					if ( $scope.board_data.lists.length  === 0 ) {
						$scope.board_loaded = false;
					}
					$timeout(function(){	
						if ( $scope.board_data.lists.length  === 0 ) {
							$scope.board_loaded = true;
							$timeout(function() {
								$('#list_adder').stop(true);
							},0);

						}									
						var scroll_left = $('.fridge1-top-content-bot').scrollLeft();
						$('.fridge1-top-content-bot').scrollLeft(scroll_left-200).perfectScrollbar('update');

					},0);						
				},1500);
			}).error(function(err){MessageService.handle_error(err);});
		};		

		// hide delete list dialog
		$scope.hide_delete_list = function() {
			if (delete_list !== null ) {
				var list = delete_list;
				$scope.board_data.lists[delete_list].showing_delete_list = false;
				$timeout(function(){
					resize_list(list,-1);
				},0);
				delete_list = null;
				open_list = null;
				$scope.something_to_cancel = false;
			}
		};

		// ########## Cards ###############

		// show create card dialog
		$scope.show_add_card = function(list,list_obj) {
			if ( !$scope.board_data.cards_locked ) {
				$scope.hide_all();			
				open_list = list_obj;
				$scope.something_to_cancel = true;
				$scope.board_data.lists[list].showing_add_card = true;
				add_card_list = list;
				$scope.new_card_name = '';
				$timeout(function(){
					resize_list(list,10000);
				},0);
			}
		};

		// add a new card
		$scope.commit_card_add = function() {
			if ( $scope.new_card_name.length > 0 ) {
				$http.post('/add_card',{board_id:$scope.board_data._id,list:add_card_list,name:$scope.new_card_name,list_id:open_list.uid}).success(function(data) {
					data.card.filtered = true;
					$scope.board_data.lists[add_card_list].cards.push(data.card);
					$scope.new_card_name = '';		
					$timeout(function() {
						
						//MessageService.flash_success('Successfully Added Card.',3000);	
						resize_list(add_card_list,10000);	
						$('#add_card_control').focus();		
						if ( data.card.munchkined ) {
							$timeout(function(){
								$scope.achievement(47,1);
							},3000);
							$scope.achievement(12,1);	
						}
						$scope.achievement(47,1);	
						$scope.achievement(26,1);
						if ( data.num_cards === 75 ) {
							$timeout(function(){
								$scope.achievement(54,1);								
							},4000);
						}
					},0);					
				}).error(function(err){MessageService.handle_error(err);});
			}
		};		

		// hide create card dialog
		$scope.hide_add_card = function() {
			if ( add_card_list !== null ) {
				var list = add_card_list;
				$scope.board_data.lists[add_card_list].showing_add_card = false;
				$timeout(function(){
					resize_list(list,-1);
				},0);
				add_card_list = null;
				open_list = null;
				$scope.something_to_cancel = false;
			}
		};

		// record mousedown time and position to see if element should move or open modal
		$scope.mousedown = function($event,card,listi,cardi) {
			//$('#'+card.uid+'_ph').css({'height':($('#'+card.uid).height())+'px'});
			clicktime = (new Date()).getTime();
			clickx = $event.clientX;
			clicky = $event.clientY;
			open_card = card;
			list_index = listi;
			card_index = cardi;
		};

		// open a modal for a card if the click time is under 300ms and it hasn't moved more than a few pixels
		$scope.open = function ($event) {
		  	if ( ( (new Date()).getTime() - clicktime ) < 300 && (Math.abs(clickx-$event.clientX)+Math.abs(clicky-$event.clientY)) < 5 ) {	  
		  		kill_move = true;		
		  		var modalInstance = $modal.open({
					templateUrl: 'myModalContent.html',
					controller: 'ModalController',
					size: '',
					resolve: {
						data: function () {
							return {
								card:open_card,
								label_names:$scope.board_data.label_names,
								card_locked:$scope.board_data.cards_locked,
								labels_locked:$scope.board_data.card_labels_locked,
								toggle_card_label:$scope.toggle_card_label,
								commit_card_name:$scope.commit_card_name,
								commit_card_des:$scope.commit_card_des,
								commit_card_delete:$scope.commit_card_delete,
								food_func:$scope.food_submit,
								recipe_func:$scope.prepare_food,
								achievement_func:$scope.achievement,
								food:$scope.food,
								recipes:$scope.recipes,
								achievements:$scope.achievements,
								custom_board:$scope.custom_board
							};
						}
			    	}
			    });
			    $scope.hide_all();
				MessageService.post('DANGER: Emitting Wello Card with Military-Grade Science');	
			    modalInstance.result.then(function (msg) {
		        	alert(msg);
		    	}, function () {
					MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);	
		    	});
		  	}
		};		

		// toggle a label on a card
		// called from Modal
		$scope.toggle_card_label = function(label_index,cb) {
			$http.post('/update_card_label',{board_id:$scope.board_data._id,list:list_index,card:card_index,label:label_index,card_id:open_card.uid}).success(function(data) {
				$scope.achievement(40,1);
				if ( data.toggle ) {
					MessageService.flash_success('Label Added',1000);		
				} else {
					MessageService.flash_success('Label Removed',1000);
				}
				cb(data.toggle);							
			}).error(function(err) {
				if ( typeof err.message === 'undefined' ) {
					MessageService.flash_disaster('Unable to connect to server.',3000);					
				} else {
					MessageService.flash_disaster(err.message,3000);			
				}
			});
		};

		// Commit a new name for a card
		// Called from Modal
		$scope.commit_card_name = function(new_name,cb) {
			$http.post('/update_card_name',{board_id:$scope.board_data._id,list:list_index,card:card_index,name:new_name,card_id:open_card.uid}).success(function(data) {
				$scope.achievement(41,1);
				MessageService.flash_success('Card Name Updated.',2000);		
				cb(data.name);							
			}).error(function(err) {
				if ( typeof err.message === 'undefined' ) {
					MessageService.flash_disaster('Unable to connect to server.',3000);					
				} else {
					MessageService.flash_disaster(err.message,3000);			
				}
			});
		};

		// Commit a new description for a card
		// Called from Modal
		$scope.commit_card_des = function(new_des,cb) {
			$http.post('/update_card_des',{board_id:$scope.board_data._id,list:list_index,card:card_index,des:new_des,card_id:open_card.uid}).success(function(data) {
				$scope.achievement(42,1);
				MessageService.flash_success('Card Description Updated.',2000);		
				cb(data.des);
			}).error(function(err) {
				if ( typeof err.message === 'undefined' ) {
					MessageService.flash_disaster('Unable to connect to server.',3000);					
				} else {
					MessageService.flash_disaster(err.message,3000);			
				}
			});
		};

		// Capture beginning of a card move
		$scope.element_move_start = function ($part) {
			list_index_from = -1;
			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
				if ( list_index_from === -1 ) {
					if ( $scope.board_data.lists[i].cards.length === $part.length ) {
						list_index_from = i;
						for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
							if ( $scope.board_data.lists[i].cards[j].$$hashKey !== $part[j].$$hashKey ) {
								list_index_from = -1;
							}
						}
					}
				}
			}
		};

		// Called after a card has been dropped
		// Makes remote calls and ensures the move is valid and successful
		$scope.element_moved = function ($indexFrom, $partTo, $indexTo) {
			var list_index_to = -1;
			// ridiculous method to find the moved element since angular-sortable-view has an immature api
			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
				if ( list_index_to === -1 ) {
					if ( $scope.board_data.lists[i].cards.length === $partTo.length ) {
						list_index_to = i;					
						for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
							if ( $scope.board_data.lists[i].cards[j].$$hashKey !== $partTo[j].$$hashKey ) {
								list_index_to = -1;
							}
						}			
					}				
				}
			}
			if ( list_index_from > -1 && list_index_to > -1  ) {
				var temp = $scope.board_data.lists[list_index_to].cards[$indexTo];

				if ( kill_move || party_ended ) {
					if ( party_ended ) {
						MessageService.flash_disaster('Dude.. That party was crazy, this card isn\'t getting up for awhile.',2000);
					}
					var from_offset = 0, to_offset = 0;
					if ( list_index_from === list_index_to ) {
						// compensate for the element affecting indices
						if ( $indexFrom < $indexTo ) {
							to_offset = 1;
						} else {
							from_offset = 1;
						}
					}
					$scope.board_data.lists[list_index_from].cards.splice($indexFrom+from_offset,0,temp);
					$scope.board_data.lists[list_index_to].cards.splice($indexTo+to_offset,1);
					kill_move = false;
				} else {
					$http.post('/card_move',{board_id:$scope.board_data._id,move:{from_list:list_index_from,from_card:$indexFrom,to_list:list_index_to,to_card:$indexTo,card_id:temp.uid,list_to_id:$scope.board_data.lists[list_index_to].uid}}).success(function(data) {
						if ( list_index_to === list_index_from ) {
							$scope.board_data.lists[list_index_to].cards.splice($indexTo,1);
							$timeout(function(){$scope.board_data.lists[list_index_to].cards.splice($indexTo,0,temp);},0);
						} else {
							$scope.achievement(6,1);
						}						
						MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);	

						var resize_lists = [];
						resize_lists.push($('.list').eq(list_index_to).children('.scrollbar-dynamic'));
						resize_lists.push($('.list').eq(list_index_from).children('.scrollbar-dynamic'));					

						$timeout(function(){
							for ( var i = 0; i < resize_lists.length; i++ ) {
								var scroll_pos = resize_lists[i].scrollTop();
								resize_lists[i].scrollTop(0).perfectScrollbar('update').scrollTop(scroll_pos);
							}
							$timeout(function() {
								for ( var i = 0; i < resize_lists.length; i++ ) {
									var scroll_pos = resize_lists[i].scrollTop();
									resize_lists[i].scrollTop(0).perfectScrollbar('update').scrollTop(scroll_pos);
								}					
							},0);
							MessageService.flash_success('Successfully and Amazingly Moved Wello Card without Bodily Injury', 2000);								
						},0);	

					}).error(function(err){
						// revert card position
						var from_offset = 0, to_offset = 0;
						if ( list_index_from === list_index_to ) {
							// compensate for the element affecting indices
							if ( $indexFrom < $indexTo ) {
								to_offset = 1;
							} else {
								from_offset = 1;
							}
						}
						$scope.board_data.lists[list_index_from].cards.splice($indexFrom+from_offset,0,temp);
						$scope.board_data.lists[list_index_to].cards.splice($indexTo+to_offset,1);
						MessageService.remove_disaster('Current Board: ' + BoardService.name, 1);

						if ( temp.munchkined && !$scope.achievements[39].unlocked ) {
							$scope.achievement(39,1);
						} else {
							MessageService.handle_error(err);
						}
					});
				}
			} else {				
				MessageService.add_disaster('Science has failed us!  Repent!', 3);				
			}			
		};

		// display message while moving a card
		$scope.card_message = function() {
			MessageService.post('DANGER: Emitting Wello Card with Military-Grade Science');	
		};

		// delete a card
		// called from Modal
		$scope.commit_card_delete = function(cb) {
			$http.post('/delete_card',{board_id:$scope.board_data._id,list:list_index,card:card_index,card_id:open_card.uid}).success(function(data) {
				$timeout(function() {
					MessageService.flash_success('Successfully Deleted Card.',4000);		
					$scope.achievement(45,1);			
				},0);
				$('.list:eq('+(list_index)+') .card:nth-child('+(card_index+1)+')').addClass('delete_card');
				//$timeout(function(){
				$scope.board_data.lists[list_index].cards.splice(card_index,1);
				//},1300);
				cb();
			}).error(function(err) {
				if ( typeof err.message === 'undefined' ) {
					MessageService.flash_disaster('Unable to connect to server.',3000);					
				} else {
					MessageService.flash_disaster(err.message,3000);			
				}
			});
		};

		// ############# Labels ##################

		// show edit label dialog
		$scope.show_edit_label = function() {
			$scope.hide_all();
			$scope.something_to_cancel = true;
			$scope.edit_label_names = [];			
			for ( var i = 0; i < $scope.board_data.label_names.length; i++ ) {
				$scope.edit_label_names.push($scope.board_data.label_names[i]);
			}
			$scope.edit_label = true;
		};

		// update label names
		$scope.commit_edit_label = function() {
			$http.post('/update_labels',{board_id:$scope.board_data._id,labels:$scope.edit_label_names}).success(function(data) {
				$scope.achievement(53,1);
				$scope.board_data.label_names = data;
				MessageService.flash_success('Successfully Updated Labels',2000);		
				$scope.cancel_edit_label();								
			}).error(function(err) {
				if ( typeof err.message === 'undefined' ) {
					MessageService.flash_disaster('Unable to connect to server.',3000);					
				} else {
					MessageService.flash_disaster(err.message,3000);			
				}
			});
		};

		// hide edit label dialog
		$scope.cancel_edit_label = function() {		
			$scope.something_to_cancel = false;
			$scope.edit_label_names = [];
			$scope.edit_label = false;
			$scope.label_hover = -1;
		};

		// ########## Filtering #############

		// check if any filtered label is matched
		$scope.any_label = function (labels) {
			for ( var i = 0; i < labels.length; i++ ) {
				if ( labels[i] && $scope.filter_labels_active[i] ) return true;
			}
			return false;
		};

		// check if all filtered labels are matched
		$scope.all_labels = function (labels) {
			for ( var i = 0; i < $scope.filter_labels_active.length; i++ ) {
				if ( $scope.filter_labels_active[i] && !labels[i] ) return false;
			}
			return true;
		};

		// toggle any-all filtering
		// any: filter will match any selected label
		// all: filter will only match cards with all labels
		$scope.toggle_filter_any = function() {
			if ( $scope.filterAny ) {
				$scope.filterAny = false;
			} else {
				$scope.filterAny = true;
			}
			$scope.filter_anim_start();
		};		

		// trigger the filter animation
		// make sure the filter animation is on before applying the filter
		$scope.filter_anim_start = function() {
			$scope.achievement(9,1);
			var card;
			$scope.is_filter_time = true;
			removing_filters = true;
			for ( var i = 0; i < $scope.filter_labels_active.length; i++ ) {
				if ( $scope.filter_labels[i] ) {
					removing_filters = false;
					break;
				}
			}
			$timeout.cancel(filter_anim_to);
			$timeout(function(){
				$scope.filterTextActive=$scope.filterText;
				$scope.filter_labels_active=$scope.filter_labels;
				$scope.filtering_labels = false;
				for ( var i = 0; i < $scope.filter_labels_active.length; i++ ) {
					if ( $scope.filter_labels_active[i] ) {
						$scope.filtering_labels = true;
						break;
					}
				}				
				for ( i = 0; i < $scope.board_data.lists.length; i++ ) {
					for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
						card = $scope.board_data.lists[i].cards[j];
						card.filtered = true;
						if ( $scope.filterTextActive !== '' ) {

							if ( card.name.search(new RegExp($scope.filterTextActive, 'i')) === -1 && card.des.search(new RegExp($scope.filterTextActive, 'i')) === -1 ) card.filtered = false; 
						}
						if ( card.filtered ) {
							if ( $scope.filtering_labels && !removing_filters ) {
								if ( $scope.filterAny ) {
									card.filtered = $scope.any_label(card.labels);
								} else {
									card.filtered = $scope.all_labels(card.labels);
								}
							}
						}
					}
				}
			},0);
			filter_anim_to = $timeout(function() {
				$scope.is_filter_time = false;	
				$timeout(function(){
					$('.list').each(function() {
						// FIX
						$(this).children('.scrollbar-dynamic').scrollTop(0).perfectScrollbar('update').scrollTop(-1000);
					});
				},0);							
			},600);
		};

		// toggle a label to filter with
		$scope.toggle_filter_lab = function(lab) {
			if ( $scope.filter_labels[lab] ) {
				$scope.filter_labels[lab] = false;
			} else {
				$scope.filter_labels[lab] = true;
			}
			$scope.filter_anim_start();			
		};

		// completely cancel the filter
		$scope.cancel_filter = function() {
			$scope.filterText='';
			$scope.filter_labels = [false,false,false,false,false,false];
			$scope.filter_anim_start();
		};

		// ######## Food ############

		// Watch the Food Service in order to pull food, recipes, and achievements into scope
		$scope.$watch(function () { return FoodService.update; }, function (newVal, oldVal) {
		    if (newVal !== oldVal && typeof newVal !== undefined) {
		    	$scope.food = FoodService.food;
		    	$scope.recipes = FoodService.recipes;
		    	$scope.achievements = FoodService.achievements;
				$scope.food_categories = [{name:'',id:0}];//,{name:'Cat 1',id:1,food:[{name:'',id:-1},{name:'Redbull',id:0}]}]
				
				var i, j;
				var food_cat_found;
				var lut = {};
				for ( i = 0; i < $scope.food.length; i++ ) {
					if ( $scope.food[i].cat !== '' ) {
						food_cat_found = false;
						for ( j = 0; j < $scope.food_categories.length; j++ ) {
							if ( $scope.food_categories[j].name === $scope.food[i].cat ) { /**/
								food_cat_found = true;
							}
						}
						if ( !food_cat_found ) {
							$scope.food_categories.push({name:$scope.food[i].cat,id:$scope.food_categories.length,food:[{name:'',id:-1}]});
							lut[$scope.food[i].cat] = $scope.food_categories[$scope.food_categories.length-1].food;
						}
						lut[$scope.food[i].cat].push({name:$scope.food[i].name,id:i});
					} else {
						$scope.ice_id = i;
					}
					$scope.food[i].recipes_used_in = [];
				} 
				// setup recipes_used_in
				for ( i = 0; i < $scope.recipes.length; i++ ) {
					for ( j = 0; j < $scope.recipes[i].food.length; j++ ) {
						$scope.food[$scope.recipes[i].food[j].food].recipes_used_in.push(i);
					}
				}
				$scope.food_category = $scope.food_categories[0];
				$scope.food_select = null;
		    }
		});

		// Select a category of food to choose from
		$scope.food_category_select = function() {
			if ($scope.food_category.id >= 0 ) {
				$scope.select_food = $scope.food_categories[$scope.food_category.id].food[0];
			}
		};

		// Create more food
		$scope.food_submit = function(ice) {
			var food_id = -1;
			if ( ice >= 0 ) {
				food_id = ice;
			} else {
				if ( $scope.select_food.id >= 0 ) {
					food_id = $scope.select_food.id;
				}
			}
			if ( food_id >= 0 ) {
				$http.post('/add_food',{food_ref:food_id}).success(function(data) {
					/*$timeout(function() {
						MessageService.flash_success('Successfully 3D-Printed Food.',3000);		
					},0);*/
					$scope.food[data.food_id].count += data.create;	
					if ( $scope.food[data.food_id].count > 500 ) {
						$scope.achievement(4,1);
						$timeout(function(){
							$scope.achievement(24,1);	
						},3000);
					} else {
						$scope.achievement(24,1);							
					}
					// update servings if on the recipe board
		    		if ( $scope.custom_board === 4 ) {
		    			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
		    				for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
		    					if ( $scope.food[data.food_id].recipes_used_in.indexOf($scope.board_data.lists[i].cards[j].recipe_ref) !== -1 ) {
			    					$scope.board_data.lists[i].cards[j].servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
			    				}
		    				}
		    			}
		    		}			
				}).error(function(err){MessageService.handle_error(err);});
			}
		};

		// Prepare a recipe
		$scope.prepare_food = function(recipe_id) {
			$http.post('/prepare_recipe',{recipe_ref:recipe_id}).success(function(data) {
				var i, j;
				$scope.achievement(25,1);
		    	FoodPrepService.new_food = $scope.recipes[data.prepared].image;
		    	FoodPrepService.food_id = data.prepared;
		    	var foods_used = data.food_uses;
		    	var recipes_updated = [];
		    	for ( i = 0; i < foods_used.length; i++ ) {
		    		$scope.food[foods_used[i].food].count -= foods_used[i].amount;
		    		for ( j = 0; j < $scope.food[foods_used[i].food].recipes_used_in.length; j++ ) {
		    			if ( recipes_updated.indexOf($scope.food[foods_used[i].food].recipes_used_in[j]) === -1 ) {
		    				recipes_updated.push($scope.food[foods_used[i].food].recipes_used_in[j]);
		    			}
		    		}
		    	}
		    	// check servings to update 
    			for ( i = 0; i < $scope.board_data.lists.length; i++ ) {
    				for ( j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
    					if ( recipes_updated.indexOf($scope.board_data.lists[i].cards[j].recipe_ref) !== -1 ) {
	    					$scope.board_data.lists[i].cards[j].servings = ingredients($scope.recipes[$scope.board_data.lists[i].cards[j].recipe_ref].food);
	    				}
    				}
    			}			    	
			}).error(function(err){MessageService.handle_error(err);});
		};

		// check ingredient requirements
		function ingredients(food) {
			var num_food = food.length;
			var has_any_of_food = 0;
			var helpings = [];
			for ( var i = 0; i < food.length; i++ ) {
				if ( $scope.food[food[i].food].count > 0 ) {
					has_any_of_food++;
					helpings.push(Math.floor($scope.food[food[i].food].count / food[i].count));
				}
			}
			if ( has_any_of_food === 0 ) {
				return -1;
			} else if ( has_any_of_food < num_food ) {
				return 0;
			} else {
				// reuse var as min helpings
				has_any_of_food = 1000000;
				for ( i = 0; i < helpings.length; i++ ) {
					if ( helpings[i] < has_any_of_food ) {
						has_any_of_food = helpings[i];
					}
				}
				return has_any_of_food;
			}
		}

		// Prepare a snack for Munchkin (fun button)
		$scope.munchkin_snack = function() {
			var rand = Math.floor(Math.random()*$scope.recipes.length);
			FoodPrepService.new_food = $scope.recipes[rand].image;
			FoodPrepService.food_id = rand;
			$timeout(function() {
				rand = Math.floor(Math.random()*$scope.recipes.length);
				FoodPrepService.new_food = $scope.recipes[rand].image;
				FoodPrepService.food_id = rand;				
			},1000+1000*Math.random());
			$timeout(function() {
				rand = Math.floor(Math.random()*$scope.recipes.length);
				FoodPrepService.new_food = $scope.recipes[rand].image;
				FoodPrepService.food_id = rand;				
			},2000+1000*Math.random());	
			$scope.achievement(2,1);
		};

		// ############# Achievements ##################

		// Watch the Achievement Service for updates
		$scope.$watch(function () { return AchievementService.amount; }, function (newVal) {
		    if ( newVal !== 0 ) {
		    	$scope.achievement(AchievementService.id,AchievementService.amount);
		    	AchievementService.amount = 0;
		    }
		});

		// post the achievement to the server and see if it results in a new unlock
		$scope.achievement = function(achievement_id,achievement_amount) {
			if ( !$scope.achievements[achievement_id].unlocked ) {
				$http.post('/achievement',{achievement:achievement_id,update:achievement_amount}).success(function(data) {
					if ( data.achievement_unlocked >= 0 ) {
						$scope.achievements[data.achievement_unlocked].unlocked = true;
						MessageService.flash_achievement('Achievement Unlocked: ' + $scope.achievements[achievement_id].name,4000);
						if ( $scope.custom_board === 6 ) {
							// slide the card over if it's the Achievement Board (if the card is in the proper spot)
							var lock_list = $scope.board_data.lists[$scope.achievements[achievement_id].locked_list];
							var move_card = null;
							for ( var i = 0; i < lock_list.cards.length; i++ ) {
								if ( lock_list.cards[i].achievement_ref === achievement_id ) {
									move_card = lock_list.cards.splice(i,1)[0];
								}
							}
							if ( move_card !== null ) {
								$scope.board_data.lists[4].cards.push(move_card);
							}
						}
					}
				}).error(function(err){});
			}		
		};

		// ########### Games ################

		// ########### Snake #############

		// check if a candy spawn is valid
		function notOKCandySpawn() {
			if ( ( $scope.candy_x >= $scope.cat_x &&  $scope.candy_x < $scope.cat_x+$scope.cat_size && $scope.candy_y >= $scope.cat_y && $scope.candy_y < $scope.cat_y+$scope.cat_size ) ||
				( $scope.candy_x >= $scope.list_x &&  $scope.candy_x < $scope.list_x+$scope.list_size_x && $scope.candy_y >= $scope.list_y && $scope.candy_y < $scope.list_y+$scope.list_size_y ) ) {					
				return true;
			} else {
				for ( var i = 0; i < $scope.wello_snake.length; i++ ) {
					if ( $scope.candy_x === $scope.wello_snake[i].x && $scope.candy_y === $scope.wello_snake[i].y ) {
						return true;
					}
				}
			}		
			return false;	
		} 	

		// Wello Snake game
		$scope.wello_snake_start = function() {	
			if ( !$scope.show_nibbles ) {
				$scope.nibbles_cloak = true;
				$scope.achievement(13,1);
				$scope.achievement(15,1);
				MessageService.post('Wello Snake - Score: 0 (Top Score: '+$scope.snake_top_score+')');		
				var return_board = $scope.board_data._id;
				BoardService.board_request = 'snake';
				BoardService.force = true;	
				$scope.show_nibbles = true;
				BoardService.show_nibbles = true;
				$scope.obstacles = [];
				var cur_x = 40;
				var cur_y = 2;
				$scope.wello_snake = [{x:cur_x,y:cur_y}];			
				$scope.x_dir = 1;
				$scope.y_dir = 0;
				$scope.snake_score = 0;
				var snake_speed = 70.0;	
				var max_snake = 15.0;
				var cur_dir;
				var new_dir;
				var new_snake_cat;
				var new_snake_cat_color;

				var wello_colors = ['rgb(52, 178, 125)','rgb(219, 219, 87)','rgb(224, 153, 82)','rgb(203, 77, 77)','rgb(153, 51, 204)','rgb(77, 119, 203)'];
				// draw a 240x240 obstacle (cat) between 40-360y (4-12) and 40-450x (4-21)
				$scope.cat_x = 4+Math.floor(Math.random()*17);
				$scope.cat_y = 4+Math.floor(Math.random()*8); // 4+8+24+4
				$scope.snake_cat = '/modules/core/img/cats/'+Math.floor(Math.random()*12)+'.jpg';
				var cur_snake_cat_color = Math.floor(Math.random()*6);
				$scope.snake_cat_color = wello_colors[cur_snake_cat_color];		
				$scope.cat_size = 24;							
				// draw a 190x240 obstacle (list) between 
				$scope.list_x = 45+Math.floor(Math.random()*21); // 45+21+19+5
				$scope.list_y = 4; // 5+30+5
				$scope.list_size_x = 19;
				$scope.list_size_y = 33; 
				$scope.candy_x = Math.floor(Math.random()*90);
				$scope.candy_y = Math.floor(Math.random()*40);	
				while ( notOKCandySpawn() ) {
					$scope.candy_x = Math.floor(Math.random()*90);
					$scope.candy_y = Math.floor(Math.random()*40);							
				}		
				$timeout(function(){
					$scope.nibbles_cloak = false;
				},500);
			    var tick = function() {
			        $timeout(function() {
			        	if ( $scope.dirq.length > 0 ) {
			        		new_dir = parseInt($scope.dirq.splice(0,1));
			        		while ( new_dir === cur_dir ) {
			        			new_dir = parseInt($scope.dirq.splice(0,1));
			        		}
			        		cur_dir = new_dir;
			        		if ( cur_dir === 1 && $scope.y_dir !== 1 ) {
			        			$scope.x_dir = 0;
			        			$scope.y_dir = -1;
			        		} else if ( cur_dir === 2 && $scope.x_dir !== -1 ) {
			        			$scope.x_dir = 1;
			        			$scope.y_dir = 0;
			        		} else if ( cur_dir === 3 && $scope.y_dir !== -1 ) {
			        			$scope.x_dir = 0;
			        			$scope.y_dir = 1;
			        		} else if ( cur_dir === 4 && $scope.x_dir !== 1 ) {
			        			$scope.x_dir = -1;
			        			$scope.y_dir = 0;
			        		}
			        	}

						cur_x += $scope.x_dir;
						cur_y += $scope.y_dir;				
						$scope.wello_snake.push({x:cur_x,y:cur_y});
						if ( $scope.wello_snake.length > 0 ) {
							if ( cur_x === $scope.candy_x && cur_y === $scope.candy_y ) {
								$scope.snake_score++;
								if ( $scope.snake_score === 10 ) {
									$scope.achievement(14,1);
								} else if ( $scope.snake_score === 20 ) {
									$scope.achievement(16,1);
								}
								if ( $scope.snake_score > $scope.snake_top_score ) {
									$scope.snake_top_score = $scope.snake_score;
								}
								MessageService.post('Wello Snake - Score: '+$scope.snake_score+' (Top Score: '+$scope.snake_top_score+')');					
								max_snake *= 1.2;
								snake_speed /= 1.08;						
								while ( notOKCandySpawn() ) {
									$scope.candy_x = Math.floor(Math.random()*90);
									$scope.candy_y = Math.floor(Math.random()*40);							
								}
								new_snake_cat = Math.floor(Math.random()*12);
								while ( new_snake_cat === $scope.snake_cat ) {	
									new_snake_cat = Math.floor(Math.random()*12);
								}
								$scope.snake_cat = '/modules/core/img/cats/'+new_snake_cat+'.jpg';	
								new_snake_cat_color = Math.floor(Math.random()*6);
								while ( new_snake_cat_color === cur_snake_cat_color ) {	
									new_snake_cat_color = Math.floor(Math.random()*6);
								}
								cur_snake_cat_color = new_snake_cat_color;
								$scope.snake_cat_color = wello_colors[cur_snake_cat_color];												
							} else if ( cur_x < 0 || cur_x > 90 || cur_y < 0 || cur_y > 40 || 
							( cur_x >= $scope.cat_x &&  cur_x < $scope.cat_x+$scope.cat_size && cur_y >= $scope.cat_y && cur_y < $scope.cat_y+$scope.cat_size ) ||
							( cur_x >= $scope.list_x &&  cur_x < $scope.list_x+$scope.list_size_x && cur_y >= $scope.list_y && cur_y < $scope.list_y+$scope.list_size_y ) 					
							) {
								$scope.wello_snake = [];
								$scope.dirq = [];						
								$timeout(function(){
									$scope.show_nibbles = false;
									$scope.nibbles_cloak = true;
									BoardService.show_nibbles = false;	
									BoardService.board_request = return_board;
									return;				
								},600);	
							} else {
								for ( var i = 0; i < $scope.wello_snake.length-1; i++ ) {
									if ( cur_x === $scope.wello_snake[i].x && cur_y === $scope.wello_snake[i].y ) {
										$scope.wello_snake = [];
										$scope.dirq = [];
										$timeout(function(){
											$scope.show_nibbles = false;
											$scope.nibbles_cloak = true;
											BoardService.show_nibbles = false;	
											BoardService.board_request = return_board;
											return;				
										},600);				
									}
								}
							}
							if ( $scope.wello_snake.length > max_snake ) {
								$scope.wello_snake.splice(0,1);
								tick();
							} else if ( $scope.wello_snake.length > 0 && $scope.show_nibbles ) {
								tick();
							} 
				    	}
			        }, snake_speed);
			    };     
			    tick();
			}
		};		

		// ############ Card Breaker ##############

		// initialize cardbreaker
		$scope.wello_cardbreaker_start = function() {
			if ( !$scope.show_cardbreaker ) {
				$scope.cardbreaker_cloak = true;
				MessageService.post('Wello Card Breaker - Score: 0 (Top Score: '+$scope.cardbreaker_top_score+')');
				card_return_board = $scope.board_data._id;
				BoardService.board_request = 'cardbreaker';
				BoardService.force = true;
				$scope.show_cardbreaker = true;
				BoardService.show_cardbreaker = true;
				$timeout(function(){
					last_laser = card_anim_now = Date.now()		
					$scope.dropping_food = []			
					$scope.ball_x = 200;
					cb_laser = false;
					$scope.ball_y = 350;
					cardbreaker_score = 0;
					ball_speed_x = -250.0;
					ball_speed_y = -250.0;
					cumulative_speed = 1.0;
					$scope.paddle_size = 100.0						
					$scope.cardbreaker_cloak = false;
					munchkin_size = 25;	
					$scope.cb_lives = 3;
					cb_count = 15
					$scope.lasers = [];
					$scope.cb_level = [
						[{labels:2},{labels:1},{labels:2}],
						[{labels:1},{labels:4},{labels:3}],
						[{labels:1},{labels:6,name:'SALAD = BAD'},{labels:2}],
						[{labels:1},{labels:4},{labels:3}],
						[{labels:2},{labels:1},{labels:2}]																								
					]
					init_cb_pos()
 					animate_cardbreaker();		
				},500)					
			}
		};

		// initialize cardbreaker position
		function init_cb_pos() {
			for ( var i = 0; i < $scope.cb_level.length; i++ ) {
				for ( var j = 0; j < $scope.cb_level[i].length; j++ ) {
					$scope.cb_level[i][j].top = j*42;
				}
 			}
		}

		// move the cardbreaker paddle
		$scope.movepaddle = function(event) {
			if ( $scope.show_cardbreaker ) {
				$scope.paddle_x = (event.offsetX || event.clientX - $(event.target).offset().left);
				if ( $scope.paddle_x > 910-$scope.paddle_size ) {
					$scope.paddle_x =  910-$scope.paddle_size;
				}
			}
		};

		// grab next animation frame
		function animate_cardbreaker() {
			render_cardbreaker();
			cardbreaker_animation = window.requestAnimationFrame(animate_cardbreaker);			
		}

		// render loop for cardbreaker
		function render_cardbreaker() {
			$timeout(function() {
				card_anim_prev = card_anim_now;
				card_anim_now = Date.now();
				card_anim_elapsed = card_anim_now - card_anim_prev;
				for ( var i = 0; i < $scope.dropping_food.length; i++ ) {
					$scope.dropping_food[i].top += 0.2*card_anim_elapsed
					if ( $scope.dropping_food[i].top > 410 ) {
						$scope.dropping_food.splice(i,1)
					} else if ( $scope.dropping_food[i].top > 340 ) {
						if ( $scope.paddle_x < $scope.dropping_food[i].left+40 && $scope.paddle_x+$scope.paddle_size > $scope.dropping_food[i].left+40 ) {
							if ( $scope.dropping_food[i].type === 1 ) {
								$scope.cb_lives--;
								$scope.paddle_size = 100
								$scope.ball_x = 200;
								$scope.ball_y = 350;
								cb_laser = false
								ball_speed_x = -250.0*cumulative_speed;
								ball_speed_y = -250.0*cumulative_speed;								
							} else if ( $scope.dropping_food[i].type === 2 ) {
								cardbreaker_score += 10								
							} else if ( $scope.dropping_food[i].type === 3 ) {
								cardbreaker_score += 20										
								$scope.paddle_size = 150							
							} else if ( $scope.dropping_food[i].type === 4) {
								cardbreaker_score += 35
								cb_laser = true
								last_laser = Date.now()
							} else if ( $scope.dropping_food[i].type === 6 ) {
								cardbreaker_score += 5	
							} else {
								cardbreaker_score += 50
								$scope.cb_lives++
							}
							if ( cardbreaker_score > $scope.cardbreaker_top_score ) {
								$scope.cardbreaker_top_score = cardbreaker_score;
							}
							$scope.dropping_food.splice(i,1)
							MessageService.post('Wello Card Breaker - Lives: '+$scope.cb_lives+' Score: '+cardbreaker_score+' (Top Score: '+$scope.cardbreaker_top_score+')');
						}
					}
				}
				if ( cb_laser && Date.now() > last_laser+2000.0 ) {
					last_laser = Date.now()
					$scope.lasers.push({left:$scope.paddle_x+$scope.paddle_size/2,top:350});
				}
				for ( i = 0; i < $scope.lasers.length; i++ ) {
					$scope.lasers[i].top -= 0.15*card_anim_elapsed
					if ( $scope.lasers[i].top < -40 ) {
						$scope.lasers.splice(i,1)
					}
				}
				ball_x_last = $scope.ball_x
				ball_y_last = $scope.ball_y
				$scope.ball_x += ball_speed_x*(card_anim_elapsed/1000.0)
				$scope.ball_y += ball_speed_y*(card_anim_elapsed/1000.0)
				card_collision = false
				// check if collision with a card
				for ( i = 0; i < $scope.cb_level.length; i++ ) {
					x_begin = i*180;
					x_end = (i+1)*180;
					for ( var j = 0; j < $scope.cb_level[i].length; j++ ) {
						y_begin = j*40;
						y_end = (j+1)*40;
						for ( var k = 0; k < $scope.lasers.length; k++ ) {
							if ( $scope.lasers[k].left > x_begin && $scope.lasers[k].left < x_end && $scope.lasers[k].top < y_end ) {
								$scope.lasers.splice(k,1)
								$scope.cb_level[i][j].labels--;
								if ( $scope.cb_level[i][j].labels > 0 ) {
									if ( Math.random() < 0.3 ) {
										$scope.dropping_food.push({top:y_end,left:x_begin+70,type:1,image:'modules/core/img/recipes/salad.png'});
									} else {
										$scope.dropping_food.push({top:y_end,left:x_begin+70,type:6,image:'modules/core/img/recipes/cheeseburger.png'});
									}
								}
								ball_speed_x *= 1.01
								ball_speed_y *= 1.01
								cumulative_speed *= 1.01
							}
						}
						if ( !card_collision && $scope.ball_x+munchkin_size > x_begin && $scope.ball_x-munchkin_size < x_end && $scope.ball_y+munchkin_size > y_begin && $scope.ball_y-munchkin_size < y_end && $scope.cb_level[i][j].labels > 0 ) {
							card_collision = true;
							$scope.cb_level[i][j].labels--;
							if ( $scope.cb_level[i][j].labels > 0 ) {
								if ( Math.random() < 0.3 ) {
									$scope.dropping_food.push({top:y_end,left:x_begin+70,type:1,image:'modules/core/img/recipes/salad.png'});
								} else {
									$scope.dropping_food.push({top:y_end,left:x_begin+70,type:6,image:'modules/core/img/recipes/cheeseburger.png'});
								}
							}
							ball_speed_x *= 1.01
							ball_speed_y *= 1.01
							cumulative_speed *= 1.01
							if ( ball_x_last-munchkin_size > x_end && $scope.ball_x-munchkin_size < x_end ) {
								$scope.ball_x = ball_x_last
								ball_speed_x *= -1
							} else if ( ball_x_last+munchkin_size < x_begin && $scope.ball_x+munchkin_size > x_begin ) {
								$scope.ball_x = ball_x_last
								ball_speed_x *= -1
							} else {
								$scope.ball_y = ball_y_last
								ball_speed_y *= -1
							}
						}
						if ( $scope.cb_level[i][j].labels === 0 ) {
							cb_count--;
							food_type = Math.random()
							if ( food_type < 0.3 ) {
								food_type = 1
								food_image = 'modules/core/img/recipes/salad.png'
							} else if ( food_type < 0.8 ) {
								food_type = 2
								food_image = 'modules/core/img/recipes/hotdog.png'
							} else if ( food_type < 0.88) { // bigger paddle
								food_type = 3
								food_image = 'modules/core/img/recipes/surfandturf.png'
							} else if ( food_type < 0.96) { // laser 
								food_type = 4
								food_image = 'modules/core/img/recipes/redbullvodka.png'
							} else { // extra life
								food_type = 5
								food_image = 'modules/core/img/recipes/whiskey.png'
							}

							$scope.dropping_food.push({top:y_end,left:x_begin+70,type:food_type,image:food_image});
							$scope.cb_level[i].splice(j,1)
						}							
					}
				}
				if ( $scope.cb_lives === 0 ) {
					$scope.show_cardbreaker = false;
					$scope.cardbreaker_cloak = true;
					BoardService.show_cardbreaker = false;	
					BoardService.board_request = card_return_board;
					window.cancelAnimationFrame(cardbreaker_animation);						
				}
				if ( !card_collision ) {
					if ( $scope.ball_x < munchkin_size ) {
						ball_speed_x *= -1
						$scope.ball_x = munchkin_size+0.01
					} else if ( $scope.ball_x > 900-munchkin_size  ) {
						ball_speed_x *= -1
						$scope.ball_x = 899.99-munchkin_size					
					} else if ( $scope.ball_y < munchkin_size ) {
						ball_speed_y *= -1
						$scope.ball_y = munchkin_size+0.01
					} else if ( $scope.ball_y > 380-munchkin_size && $scope.ball_x+munchkin_size > $scope.paddle_x && $scope.ball_x-munchkin_size < $scope.paddle_x+$scope.paddle_size ) {
						ball_speed_y *= -1
						$scope.ball_y = 379-munchkin_size;
						ball_flatness = ($scope.ball_x-$scope.paddle_size/2-$scope.paddle_x)*Math.PI/($scope.paddle_size*1.6)
						//alert(ball_flatness + ' = ' + Math.sin(ball_flatness))
						ball_speed = Math.sqrt(ball_speed_x*ball_speed_x+ball_speed_y*ball_speed_y)
						ball_speed_y = -ball_speed*Math.cos(ball_flatness)
						ball_speed_x = ball_speed*Math.sin(ball_flatness)
					} else if ( $scope.ball_y > 400-munchkin_size ) {
						$scope.cb_lives--;
						$scope.ball_x = 200;
						$scope.ball_y = 350;
						ball_speed_x = -250.0*cumulative_speed;
						ball_speed_y = -250.0*cumulative_speed;	
						cb_laser = false
						$scope.paddle_size = 100.0					
						MessageService.post('Wello Card Breaker - Lives: '+$scope.cb_lives+' Score: '+cardbreaker_score+' (Top Score: '+$scope.cardbreaker_top_score+')');
					}
				}
				if ( cb_count === 0 ) {
					$scope.cb_level = [
						[{labels:6},{labels:3},{labels:1},{labels:1},{labels:1}],
						[{labels:4},{labels:4},{labels:1},{labels:1},{labels:1}],
						[{labels:6},{labels:5},{labels:1},{labels:1},{labels:6}],
						[{labels:4},{labels:4},{labels:1},{labels:1},{labels:1}],
						[{labels:6},{labels:3},{labels:1},{labels:1},{labels:1}]
					]
					init_cb_pos();
					cb_count = 25
					$scope.ball_x = 200;
					$scope.ball_y = 350;
					ball_speed_x = -250.0*cumulative_speed;
					ball_speed_y = -250.0*cumulative_speed;						
				}
			});	
		}

		// ####### Party Time ########

		// Play 52 Card Pickup (randomly shuffle cards everywhere)
		$scope.party_time = function() {
			if ( $scope.is_party_time ) return;
			if ( $scope.custom_board !== 0 ) {
				MessageService.flash_disaster('You can\'t party on a special board, show some respect.',3000);	
				return;			
			} else if ( $scope.board_data.lists.length < 2 ) {
				if ( $scope.board_data.lists.length === 0 ) {
					MessageService.flash_disaster('you had a party, but no lists showed up. =(',2800);
					$timeout(function(){
						$scope.achievement(51,1);
					},3000);
				} else {
					MessageService.flash_disaster('One list would be a lonely party.',3000);
				}
				return;
			} else {
				var count = 0;
				for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
					count += $scope.board_data.lists[i].cards.length;
				}
				if ( count < 2 ) {
					MessageService.flash_disaster('You have the lists, but you need some cards too.',3000);
					return;					
				}
			}
			MessageService.flash('Today\'s party game is: 52-Card Pickup!',6000);
			$scope.achievement(17,1);
			$('.list').each(function() {
				$(this).children('.scrollbar-dynamic').perfectScrollbar('destroy');
			});			
			$scope.is_party_time = true;
			var party_count = 0;
			var max_party = 52;
			var party_timeout = 100;
			var rlist, rlist2;
			var rcard, rcard2;
			var movecard;
			var total_cards = 0;
			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
				total_cards += $scope.board_data.lists[i].cards.length;
			}
			if ( total_cards === 0 ) return;
			(function party_on() {
				the_party = $timeout(function() {
					// randomly select an element
					rcard = Math.floor(Math.random()*(total_cards));
					rlist = 0;
					for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
						rlist += $scope.board_data.lists[i].cards.length;
						if ( rlist >= rcard ) {
							rlist = i;
							break;
						}
					}
					rcard = Math.floor(Math.random()*($scope.board_data.lists[rlist].cards.length));	
					movecard = $scope.board_data.lists[rlist].cards[rcard];
							
					// move it to random dest
					rlist2 = rlist;
					while ( rlist === rlist2 ) {
						rlist2 = Math.floor(Math.random()*($scope.board_data.lists.length));
					}
					rcard2 = Math.floor(Math.random()*($scope.board_data.lists[rlist].cards.length));	
					$scope.board_data.lists[rlist2].cards.splice(rcard2,0,movecard);	
					$scope.board_data.lists[rlist].cards.splice(rcard,1);

					party_count++;
					if ( party_count > max_party ) {
						$timeout.cancel(the_party);
						$timeout(function(){$scope.is_party_time = false;},1000);
						cleanup_party();
						return;						
					} else {
						party_on();
					}

					for ( i = 0; i < $scope.board_data.lists.length; i++ ) {
						for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
							if ( $scope.board_data.lists[i].cards[j] === undefined ) {
								$scope.board_data.lists[i].cards.splice(j,1);
							}
						}
					}	
				},party_timeout);
			})();
		};

		// Party has ended, trigger clean up
		$scope.party_over = function() {
			if ( $scope.is_party_time ) {
				$timeout.cancel(the_party);		
				$scope.is_party_time = false;
				cleanup_party();
				MessageService.revert();	
			}		
		};

		// Get the board to a better state after a party
		function cleanup_party() {
			for ( var i = 0; i < $scope.board_data.lists.length; i++ ) {
				for ( var j = 0; j < $scope.board_data.lists[i].cards.length; j++ ) {
					if ( $scope.board_data.lists[i].cards[j] === undefined ) {
						$scope.board_data.lists[i].cards.splice(j,1);
					}
				}
			}			
			$timeout(function(){
				$('.list').each(function() {
					$(this).children('.scrollbar-dynamic').scrollTop(0).perfectScrollbar({suppressScrollX:true});
				});
			},1000);		
			party_ended = true;
		}

		// ####### Misc #########
		
		// get an array of a certain size
		$scope.getLabelArr = function(num) {
			return new Array(num)
		}		

	}
]);