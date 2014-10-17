'use strict';

/**
 * Trello Passport Strategy
 */

// Module Depdencies
var passport = require('passport'),
	url = require('url'),
	TrelloStrategy = require('passport-trello').Strategy,
	config = require('../config'),
	users = require('../../app/controllers/users');

// Trello Passport Strategy
module.exports = function() {
	
	// Use 'google strategy' for OAuth
	passport.use(new TrelloStrategy({
			consumerKey: config.trello.clientID,
			consumerSecret: config.trello.clientSecret,	
			callbackURL: config.trello.callbackURL,
			passReqToCallback: true,
			trelloParams: {
        		scope: 'read',
        		name: 'Wello',
        		expiration: 'never'
        	}
		},
		function(req, accessToken, refreshToken, profile, done) {
		
			// Set the provider data and include tokens
			var providerData = profile._json;
			providerData.accessToken = accessToken;
			providerData.refreshToken = refreshToken;

			// Create the user OAuth profile
			var providerUserProfile = {
				initials: profile.initials,
				displayName: profile.displayName,
				username: providerData.username,
				providerIdentifierField: 'id',
				provider: 'trello',
				providerData: providerData
			};

			req.user = null;
			// Save the user OAuth profile
			users.saveTrelloProfile(req, providerUserProfile, done);
		}
	));
};

