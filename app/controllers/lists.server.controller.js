'use strict';

/**
 * ########## List Module ###########
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Board = mongoose.model('Board'),
	User_Boards = mongoose.model('User_Boards'),
	_ = require('lodash'),
	support = require('../controllers/support');

// Errors for this module
var WERR = {
	LIST_MOVE: 'Could not move list!',
	LIST_MOVE_LOCKED: 'Cannot move locked lists!',
	LIST_ADD: 'Could not create list!',
	LIST_DELETE: 'Could not delete list!',
	LIST_NAME: 'Could not update list name!',
};

// ensure that the requested list is within the bounds for the accompanying board
exports.check_list_bounds = function(board,list_index) {
	var x = board.lists;
	if ( isNaN(list_index) || list_index >= x.length ) {
		return false;
	} else {
		return x[list_index];
	}
}
var check_list_bounds = this.check_list_bounds;

// Create a new list on the given board
exports.list_add = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.LIST_ADD));
		} else {
			if ( board_data.lists_locked ) {
				next(new Error(WERR.LIST_LOCKED));
			} else {
				var new_list = {uid:support.gen_id(),name:support.name_len(req.body.name,60),cards:[]};
				board_data.lists.push(new_list);
				board_data.save(function(err) {
					if ( err ) {
						next(new Error(WERR.LIST_ADD));
					} else {
						res.jsonp({list:new_list});
					}
				});
			}
		}
	});	
};

// Rename a given list
exports.list_name = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.LIST_NAME));
		} else {
			if ( board_data.lists_locked ) {
				next(new Error(WERR.LIST_LOCKED));
			} else {
				var list = check_list_bounds(board_data,req.body.list);
				if ( list !== false && list.uid === req.body.list_id ) {
					list.name = support.name_len(req.body.name,60);								
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.LIST_NAME));
						} else {
							res.jsonp({name:list.name,list:req.body.list});
						}
					});
				} else {
					next(new Error(WERR.LIST_NAME));
				}
			}
		}
	});	
};

// Move the requested list to the requested location for the provided board
exports.list_move = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		var move = req.body.move;		
		if ( err || board_data === null ) {
			next(new Error(WERR.LIST_MOVE));
		} else {
			if ( board_data.card_labels_locked && move.from_list !== move.to_list ) {
				next(new Error(WERR.LIST_MOVE_LOCKED));
			} else {
				var list_from = check_list_bounds(board_data,move.from_list);
				if ( list_from !== false && list_from.uid === move.list_id && move.to_list <= board_data.lists.length ) {
					list_from = board_data.lists.splice(move.from_list,1)[0];
					board_data.lists.splice(move.to_list,0,list_from);					
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.LIST_MOVE));
						} else {
							res.jsonp({moved:true});
						}
					});
				} else {
					next(new Error(WERR.LIST_MOVE));
				}
			}
		}
	});	
};

// delete the given list from the given board
exports.list_delete = function(req, res, next) {
	Board.findOne({user: req.user._id, _id: req.body.board_id}).exec(function(err, board_data) {
		if ( err || board_data === null ) {
			next(new Error(WERR.LIST_DELETE));
		} else {
			if ( board_data.lists_locked ) {
				next(new Error(WERR.LIST_LOCKED));
			} else {
				var list = check_list_bounds(board_data,req.body.list);
				if ( list !== false && list.uid === req.body.list_id ) {
					board_data.num_cards -= board_data.lists[req.body.list].cards.length;
					board_data.lists.splice(req.body.list,1);								
					board_data.save(function(err) {
						if ( err ) {
							next(new Error(WERR.LIST_DELETE));
						} else {
							res.jsonp({list:req.body.list});
						}
					});
				} else {
					next(new Error(WERR.LIST_DELETE));
				}
			}
		}
	});	
};

