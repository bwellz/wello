'use strict';

/**
 * ######## Board Model ###########
 * Each board is stored as a separate document. 
 * Lists and cards are stored as nested properties.
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema
var BoardSchema = new Schema({
	// cannot add/remove or edit board	
	lists_locked: {
		type: Boolean,
		default: false,
		required: true
	}, 
	// cannot add/remove or edit cards	
	cards_locked: {
		type: Boolean,
		default: false,
		required: true
	}, 	
	// cannot change labels
	labels_locked: {
		type: Boolean,
		default: false,
		required: true
	}, 		
	// cannot add/remove labels on cards
	card_labels_locked: {
		type: Boolean,
		default: false,
		required: true
	}, 	
	label_names: [{
		type: String,
		default: 'Label',
		required: true,
		trim: true
	}],
	num_cards: {
		type: Number,
		default: 0,
		required: true
	},
	lists: [{
		uid: {
			type: String,
			required: true
		},
		name: {
			type: String,
			default: '',
			required: true,
			trim: true
		},
		cards: [{
			uid: {
				type: String,
				required: true
			},			
			name: {
				type: String,
				default: '',
				required: true,
				trim: true		
			},
			labels: [{
				type: Boolean,
				default: false
			}],
			des: {
				type: String,
				default: '',
				trim: true
			},
			image: {
				type: String,
				default: '',
				trim: true
			},
			munchkined: {
				type: Boolean,
				default: false
			},
			food_ref: {
				type: Number
			},
			recipe_ref: {
				type: Number
			},
			achievement_ref: {
				type: Number
			}
		}]
	}],			
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	}
});

mongoose.model('Board', BoardSchema);