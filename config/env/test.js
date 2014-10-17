'use strict';

module.exports = {
	db: 'mongodb://localhost/mean-test',
	port: 3001,
	app: {
		title: 'Wello Fridge [Test]'
	},
	trello: {
		clientID: process.env.TRELLO_KEY,
		clientSecret: process.env.TRELLO_SECRET,
		callbackURL: 'http://localhost:3000/auth/trello/callback'
	}
};