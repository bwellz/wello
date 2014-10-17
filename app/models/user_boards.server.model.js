'use strict';

/**
 * ######## User_Boards Model ###########
 * This collection stores general information about all boards (including special boards) belonging to a user.
 * Board data itself is stored in the boards collection as individual documents.
 * In addition, it stores recipes, food, and achievements.
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema
var User_BoardsSchema = new Schema({
	boards: [{	
		name: {
			type: String,
			default: '',
			required: true,
			trim: true
		},
		starred: {
			type: Boolean,
			default: false
		},
		board: {
			type: Schema.ObjectId,
			ref: 'Board'
		},
		trello_board: {
			type: Boolean,
			default: false
		},
		truncated: {
			type: Boolean,
			default: false
		},
		templated: {
			type: Boolean,
			default: false
		}	
	}],	
	food: [{
		name: {
			type: String,
			default: '',
			required: true,
			trim: true
		},
		count: {
			type: Number,
			default: 0
		},
		cat: {
			type: String,
			default: ''
		},
		create: {
			type: Number,
			default: 0
		}				
	}],
	recipes: [{
		name: {
			type: String,
			default: '',
			trim: true
		},
		food: [{
			food: {
				type: Number,
				default: 0
			},
			count: {
				type: Number,
				default: 0
			}
		}],
		image: {
			type: String,
			default: '',
			trim: true
		}			
	}],	
	achievements: [{
		name: {
			type: String,
			default: '',
			trim: true
		},		
		unlocked: {
			type: Boolean,
			default: false
		},	
		locked_list: {
			type: Number,
			default: 0
		},	
		value: {
			type: Number,
			default: 0
		},	
		trigger: {
			type: Number,
			default: 0
		}							
	}],
	cur_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},		
	return_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},
	resume_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},
	portfolio_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},
	food_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	recipe_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	chores_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	art_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	pills_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	homework_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},				
	welcome_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},	
	snake_board: {
		type: Schema.ObjectId,
		ref: 'Board'
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
});

mongoose.model('User_Boards', User_BoardsSchema);