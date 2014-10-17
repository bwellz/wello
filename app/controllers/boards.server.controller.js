'use strict';

/**
 * ########## Board Module ###########
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Board = mongoose.model('Board'),
	User_Boards = mongoose.model('User_Boards'),
	_ = require('lodash'),
	support = require('../controllers/support');

// Errors for Module
var WERR = {
	BOARD_CREATION: 'New board creation failed!',
	BOARD_DELETION: 'Could not delete board!',
	BOARD_FIND: 'Could not find board!',
	BOARDS_FIND: 'Could not load boards!',
	BOARD_DELETION_LOCKED: 'Cannot delete locked boards!',
	BOARD_NAME: 'Could not update board name!',
	BOARD_STAR: 'Could not update board stars!',
	BOARD_LOCKED: 'Cannot update locked boards!',
	LABEL_UPDATE: 'Could not update labels!',
	LABEL_LOCKED: 'Cannot update locked labels!',
	ADD_FOOD: 'Could not 3D-print food!',
	PREPARE_FOOD: 'Could not prepare recipe!',
	PREPARE_FOOD_INGREDIENTS: 'Insufficient Ingredients!'
};

// get the User_Boards document belonging to the session user
// User_Boards contains all basic board data, as well as food, recipes, and achievements
exports.boards = function(req, res, next) {
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.BOARDS_FIND));
		} else {
			res.jsonp(boards_data);
		}
	});
};

// get a single detailed Board document for the session user
// this is called whenever a board is changed on the client
exports.board = function(req, res, next) {
	// get boards record
	if ( req.params.board_id === 'cardbreaker' ) {
		res.jsonp({_id: 'cardbreaker'});
	} else {
		User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
			if (err || boards_data === null) {
				next(new Error(WERR.BOARD_FIND));
			} else {
				Board.findOne({_id: req.params.board_id, user: req.user._id}).exec(function(err, board_data) {
					if (err || board_data === null) {
						next(new Error(WERR.BOARD_FIND));
					} else {
						// update current board
						if ( boards_data.cur_board !== boards_data.snake_board ) {
							boards_data.return_board = boards_data.cur_board;
						}
						boards_data.cur_board = req.params.board_id;
						boards_data.save(function(err) {
							if (err) {
								next(new Error(WERR.BOARD_FIND));
							} else {
								res.jsonp(board_data);
							}
						});
					}
				});
			}
		});	
	}
};

// create a new Board and add the record to User_Boards
exports.new_board = function(req, res, next) {
	//create new board before updating boards record
	var user_board = new Board({
		lists_locked: false, // cannot add/remove, reorder, or edit lists or labels
		cards_locked: false, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: false,
		num_cards: 0,
		label_names: ['Label 1','Label 2','Label 3','Label 4','Label 5','Label 6'],			
		lists:[
			{uid:support.gen_id(),name:'New List',cards:[]}
		], user:req.user._id });
	user_board.save(function(err) {
		if ( err ) {
			next(new Error(WERR.BOARD_CREATION));
		} else {
			// get boards record and update
			User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
				if (err || boards_data === null) {
					next(new Error(WERR.BOARD_CREATION));
				} else {
					var newboard = {'name':support.name_len(req.body.name,40),'board':user_board._id};
					boards_data.boards.push(newboard);
					boards_data.save(function(err) {
						if (err) {
							next(new Error(WERR.BOARD_CREATION));
						} else {
							res.jsonp(newboard);
						}
					});
				}
			});
		}
	});
};

// Change the name of the provided board if the ID matches
exports.board_name = function(req, res, next) {
	// grab user boards
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.BOARD_NAME));
		} else {
			var board_id = req.body.board_id;
			var found = false;
			for ( var i = 0; i < boards_data.boards.length; i++ ) {
				if ( String(boards_data.boards[i].board) === String(board_id) ) {
					found = true;
					boards_data.boards[i].name = support.name_len(req.body.name,40);
					break;
				}
			}	
			if ( found ) {
				boards_data.save(function(err) {
					if ( err ) {
						next(new Error(WERR.BOARD_NAME));	
					} else {
						res.jsonp({board_name:support.name_len(req.body.name,40)});						
					}
				});
			} else {
				next(new Error(WERR.BOARD_NAME));			
			}
		}
	});	
};

// Update the starred status of a board to the provided value
// Starred boards are moved to the top of the board list panel
exports.board_star = function(req, res, next) {
	// grab user boards
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.BOARD_STAR));
		} else {
			var board_id = req.body.board_id;
			var found = false;
			for ( var i = 0; i < boards_data.boards.length; i++ ) {
				if ( String(boards_data.boards[i].board) === String(board_id) ) {
					found = true;
					boards_data.boards[i].starred = req.body.star;
					break;
				}
			}	
			if ( found ) {
				boards_data.save(function(err) {
					if ( err ) {
						next(new Error(WERR.BOARD_STAR));	
					} else {
						res.jsonp({star:req.body.star});						
					}
				});
			} else {
				next(new Error(WERR.BOARD_STAR));			
			}
		}
	});	
};

// Update the names of all labels for the provided board
exports.update_labels = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.LABEL_UPDATE));
		} else {
			if ( board_data.labels_locked ) {
				next(new Error(WERR.LABEL_LOCKED));
			} else {
				// make sure six labels
				if ( req.body.labels.length === 6 ) {					
					board_data.label_names = req.body.labels;		
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.LABEL_UPDATE));
						} else {
							res.jsonp(board_data.label_names);
						}
					});
				} else {
					next(new Error(WERR.LABEL_UPDATE));		
				}
			}
		}
	});
};

// Add additional food (of the amount defined on the backend) to the requested food type
exports.add_food = function(req, res, next) {
	// grab user boards
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.ADD_FOOD));
		} else {
			boards_data.food[req.body.food_ref].count += boards_data.food[req.body.food_ref].create;
			boards_data.save(function(err) {
				if (err) {
					next(new Error(WERR.ADD_FOOD));
				} else {
					res.jsonp({food_id:req.body.food_ref,create:boards_data.food[req.body.food_ref].create});
				}
			});		
		}
	});	
};

// Create the requested recipe if the user has the ingredients required
exports.prepare_recipe = function(req, res, next) {
	// grab user boards
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.PREPARE_FOOD));
		} else {
			var recipe = boards_data.recipes[req.body.recipe_ref];
			var have_ingredients = true;
			for ( var i = 0; i < recipe.food.length; i++ ) {
				if ( boards_data.food[recipe.food[i].food].count < recipe.food[i].count ) {
					have_ingredients = false;
				}
			}
			if ( have_ingredients ) {
				var food_use = [];
				for ( i = 0; i < recipe.food.length; i++ ) {
					food_use.push({food:recipe.food[i].food,amount:recipe.food[i].count});
					boards_data.food[recipe.food[i].food].count -= recipe.food[i].count;
				}	
				boards_data.save(function(err) {
					if (err) {
						next(new Error(WERR.PREPARE_FOOD));
					} else {
						res.jsonp({food_uses:food_use,prepared:req.body.recipe_ref});
					}
				});		
			} else {
				next(new Error( WERR.PREPARE_FOOD_INGREDIENTS));
			} 
		}
	});	
};

// increment the achievement count by the amount provided by the client (yes, this allows cheating)
// If the increment "unlocks" the achievement, then it allows gets moved to the "completed list" and the user is notified
exports.achievement = function(req, res, next) {
	// grab user boards
	var achieve = req.body.achievement;
	var update = req.body.update;
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			res.jsonp({achievement_unlocked:-1});
		} else {		
			// see if it's time to unlock
			var achievement = boards_data.achievements[achieve];
			if ( achievement.unlocked ) {
				res.jsonp({achievement_unlocked:-1});
			} else {
				achievement.value += update;
				if ( achievement.value >= achievement.trigger ) {
					achievement.unlocked = true;
					Board.findOne({user: req.user._id, _id: boards_data.welcome_board}).exec(function(err, board_data) {		
						if ( err || board_data === null ) {
							res.jsonp({achievement_unlocked:-1});
						} else {
							var lock_list = board_data.lists[achievement.locked_list];
							var temp_card = null;
							for ( var i = 0; i < lock_list.cards.length; i++ ) {
								var card = lock_list.cards[i];
								if ( card.achievement_ref === achieve ) {
									temp_card = lock_list.cards.splice(i,1)[0];
									break;
								}
							}
							if ( temp_card !== null ) {
								// move the card before unlocking the achievement
								// just exit without saving anything if moving the card fails
								board_data.lists[4].cards.push(temp_card);
								board_data.save(function(err) {
									if (err) {
										res.jsonp({achievement_unlocked:-1});
									} else {
										boards_data.save(function(err) {
											if (err) {
												res.jsonp({achievement_unlocked:-1});
											} else {
												res.jsonp({achievement_unlocked:achieve});
											}
										});			
									}
								});
							} else {
								// if the achievement isn't on the lock list, it may have already been registered
								// just save off and report success
								boards_data.save(function(err) {
									if (err) {
										res.jsonp({achievement_unlocked:-1});
									} else {
										res.jsonp({achievement_unlocked:achieve});
									}
								});										
							}
						}
					});	
				} else {
					// save off non-unlocking value
					boards_data.save(function(err) {
						res.jsonp({achievement_unlocked:-1});
					});	
				}
			}	
		}
	});	
};

// permanently delete the requested board along with all lists and cards belonging to it
exports.delete_board = function(req, res, next) {
	// grab user boards
	User_Boards.findOne({user: req.user._id}).exec(function(err, boards_data) {
		if (err || boards_data === null) {
			next(new Error( WERR.BOARD_DELETION));
		} else {
			var board_id = req.params.board_id;
			if ( board_id === boards_data.snake_board || board_id === boards_data.resume_board ) {
				next(new Error(WERR.BOARD_DELETION_LOCKED));				
			}
			var found = false;
			for ( var i = 0; i < boards_data.boards.length; i++ ) {
				if ( String(boards_data.boards[i].board) === String(board_id) ) {
					found = true;
					boards_data.boards.splice(i,1);
					boards_data.cur_board = boards_data.welcome_board;
					break;
				}
			}	
			if ( found ) {
				boards_data.save(function(err) {
					if ( err ) {
						next(new Error(WERR.BOARD_DELETION));	
					} else {
						res.jsonp(boards_data);						
					}
				});
			} else {
				next(new Error(WERR.BOARD_DELETION));			
			}
		}
	});	
};