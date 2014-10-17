'use strict';

/**
 * Local Passport Strategy
 */

// Module Depdencies
var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	User = require('mongoose').model('User'),
	crypto = require('crypto');

// Local Passport Strategy
module.exports = function() {
	passport.use(new LocalStrategy({
			usernameField: 'username',
			passwordField: 'password'
		},
		function(username, password, done) {
			User.findOne({
				username: username
			}, function(err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, {
						message: 'Unknown user'
					});
				}
				password = crypto.pbkdf2Sync(password, new Buffer(user.salt,'base64'), 10000, 64).toString('base64');
				if ( password !== user.password ) {
					return done(null, false, {
						message: 'Invalid password'
					});
				}
				return done(null, user);
			});
		}
	));
};