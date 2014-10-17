'use strict';

/**
 * ######## User Model ###########
 * Stores all user data, including OAuth properties
 */

// Module Dependencies
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto');

// Validation functions for local strategy password
var validateLocalStrategyProperty = function(property) {
	return ((this.provider !== 'local' && !this.updated) || property.length);
};
var validateLocalStrategyPassword = function(password) {
	return (this.provider !== 'local' || (password && password.length >= 8 && password.length <= 32));
};
var validateLocalStrategyUsername = function(username) {
	return (this.provider !== 'local' || (username && username.length >= 4 && username.length <= 16 && username.match(/^[A-Za-z0-9]+$/) ));
};

// Schema
var UserSchema = new Schema({
	displayName: {
		type: String,
		trim: true,
		required: true
	},
	firstName: {
		type: String,
		trim: true
	},
	lastName: {
		type: String,
		trim: true
	},
	initials: {
		type: String,
		trim: true
	},
	zip: {
		type: String,
		trim: true,
		default: 10021
	},
	username: {
		type: String,
		unique: 'Let me go ahead and delete the other account with this username for you, your majesty.',
		required: 'Please fill in a username.',
		trim: true,
		validate: [validateLocalStrategyUsername, 'Your username must be between 4 and 16 alphanumerics.']		
	},
	password: {
		type: String,
		default: ''
	},
	salt: {
		type: String
	},
	provider: {
		type: String,
		required: 'Provider is required'
	},
	providerData: {},
	additionalProvidersData: {},
	roles: {
		type: [{
			type: String,
			enum: ['user', 'admin']
		}],
		default: ['user']
	},
	updated: {
		type: Date
	},
	created: {
		type: Date,
		default: Date.now
	}
});

mongoose.model('User', UserSchema);