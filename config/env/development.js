'use strict';

module.exports = {
	db: 'mongodb://localhost/wello-dev',
	app: {
		title: 'Wello Fridge [Dev]'
	},
	trello: {
		clientID: process.env.TRELLO_KEY,
		clientSecret: process.env.TRELLO_SECRET,
		callbackURL: 'http://localhost:3000/auth/trello/callback'
	}
};