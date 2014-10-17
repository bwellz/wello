'use strict';

/**
 * ########## Card Module ###########
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Board = mongoose.model('Board'),
	User_Boards = mongoose.model('User_Boards'),
	_ = require('lodash'),
	list_exports = require('../controllers/lists'),
	support = require('../controllers/support');

// Errors for this module
var WERR = {
	CARD_LABEL_LOCKED: 'Cannot update locked labels!',
	CARD_LABEL_TOGGLE: 'Could not toggle label!',
	CARD_LOCKED: 'Cannot update or delete locked cards!',
	CARD_NAME: 'Could not update card name!',
	CARD_DES: 'Could not update card description!',
	CARD_DELETE: 'Could not delete card!',
	CARD_ADD: 'Could not create card!',
	CARD_ADD_MAX: 'Cannot add more than 75 cards to a single board!',
	CARD_MOVE: 'Could not move card!',
	CARD_MOVE_LOCKED: 'Cannot move locked cards between lists!',
	CARD_MUNCHKIN: 'Munchkin is too heavy to move.  Worst. Mascot. Ever.'
};

// ensure that both the provided list and card are within the array bounds for the board
function check_card_bounds(board,list_index,card_index) {
	var x = board.lists;
	if ( isNaN(list_index) || isNaN(card_index) || list_index >= x.length ) {
		return false;
	} else {
		x = x[list_index].cards;
		if ( card_index >= x.length ) {
			return false;
		} else {
			return x[card_index];
		}
	}
}

// Add a new card to the board.list requested
exports.card_add = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_ADD));
		} else {
			if ( board_data.card_labels_locked ) {
				next(new Error(WERR.CARD_LOCKED));
			} else {
				var list = list_exports.check_list_bounds(board_data,req.body.list);
				if ( list !== false && list.uid === req.body.list_id ) {
					if ( board_data.num_cards >= 75 ) {
						next(new Error(WERR.CARD_ADD_MAX));
					} else {
						board_data.num_cards++;
						var new_card = {uid:support.gen_id(),name:req.body.name,des:'',labels:[false,false,false,false,false,false]};
						// randomly place Munchkin on 10% of new cards, making them unmovable.
						if ( Math.random() < 0.1 ) {
							new_card.munchkined = true;
							new_card.des += ' Munchkin is sitting on this card so it will be impossible to move.  Wello needs a new mascot.';
							new_card.name += ' ...Bad Munchkin!  Get off that card!';
							new_card.image = 'modules/core/img/munchkin.png';
						}
						board_data.lists[req.body.list].cards.push(new_card);
						board_data.save(function(err) {
							if ( err ) {
								next(new Error(WERR.CARD_ADD));
							} else {
								res.jsonp({card:new_card,num_cards:board_data.num_cards});
							}
						});
					}
				} else {
					next(new Error(WERR.CARD_ADD));
				}
			}
		}
	});	
};

// rename a card after making sure it exists and is the card requested
exports.card_name = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_NAME));
		} else {
			if ( board_data.card_labels_locked ) {
				next(new Error(WERR.CARD_LOCKED));
			} else {
				var card = check_card_bounds(board_data,req.body.list,req.body.card);
				if ( card !== false && card.uid === req.body.card_id ) {
					card.name = req.body.name;						
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.CARD_NAME));
						} else {
							res.jsonp({name:card.name});
						}
					});
				} else {
					next(new Error(WERR.CARD_NAME));
				}
			}
		}
	});	
};

// rewrite a description for a card after making sure it exists and is the card requested
exports.card_des = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_DES));
		} else {
			if ( board_data.card_labels_locked ) {
				next(new Error(WERR.CARD_LOCKED));
			} else {
				var card = check_card_bounds(board_data,req.body.list,req.body.card);
				if ( card !== false && card.uid === req.body.card_id ) {
					card.des = req.body.des;					
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.CARD_DES));
						} else {
							res.jsonp({des:card.des});
						}
					});
				} else {
					next(new Error(WERR.CARD_DES));
				}
			}
		}
	});	
};

// toggle a label for a card after making sure it exists and is the card requested
exports.toggle_label = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_LABEL_TOGGLE));
		} else {
			if ( board_data.card_labels_locked ) {
				next(new Error(WERR.CARD_LABEL_LOCKED));
			} else {
				var card = check_card_bounds(board_data,req.body.list,req.body.card);
				if ( card !== false && card.uid === req.body.card_id ) {
					var tog = card.labels[req.body.label];
					if ( tog ) {
						tog = false;
					} else {
						tog = true;
					}
					card.labels[req.body.label] = tog;	
					card.markModified('labels');					
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.CARD_LABEL_TOGGLE));
						} else {
							res.jsonp({toggle:tog});
						}
					});
				} else {
					next(new Error(WERR.CARD_LABEL_TOGGLE));
				}
			}
		}
	});
};

// Move the requested card from a verified list to another on the provided board
exports.card_move = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		var move = req.body.move;	
		var card;	
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_MOVE));
		} else {
			if ( board_data.cards_locked && move.from_list !== move.to_list ) {
				card = check_card_bounds(board_data,move.from_list,move.from_card);
				if ( card !== false && card.munchkined ) {
					next(new Error(WERR.CARD_MUNCHKIN));
				} else {
					next(new Error(WERR.CARD_MOVE_LOCKED));
				}
			} else {
				card = check_card_bounds(board_data,move.from_list,move.from_card);
				var list_to = list_exports.check_list_bounds(board_data,move.to_list);		
				if ( card !== false && list_to !== false && card.uid === move.card_id && list_to.uid === move.list_to_id && move.to_card <= list_to.cards.length ) {
					if ( card.munchkined ) {
						next(new Error(WERR.CARD_MUNCHKIN));
					} else {
						board_data.lists[move.from_list].cards.splice(move.from_card,1);
						list_to.cards.splice(move.to_card,0,card);	
						board_data.save(function(err) {
							if ( err ) {
								next(new Error(WERR.CARD_MOVE));
							} else {
								res.jsonp({moved:true});
							}
						});
					}
				} else {
					next(new Error(WERR.CARD_MOVE));
				}
			}
		}
	});	
};

// delete the given card from the given board.list
exports.card_delete = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.CARD_DELETE));
		} else {
			if ( board_data.cards_locked ) {
				next(new Error(WERR.CARD_LOCKED));
			} else {
				var card = check_card_bounds(board_data,req.body.list,req.body.card);
				if ( card !== false && card.uid === req.body.card_id ) {
					board_data.num_cards--;
					board_data.lists[req.body.list].cards.splice(req.body.card,1);								
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.CARD_DELETE));
						} else {
							res.jsonp({deleted:true});
						}
					});
				} else {
					next(new Error(WERR.CARD_DELETE));
				}
			}
		}
	});	
};