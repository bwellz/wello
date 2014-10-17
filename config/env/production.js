'use strict';

module.exports = {
	db: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://localhost/wello',
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.min.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.min.css'
			],
			js: [
				'public/lib/jquery/dist/jquery.min.js',
				'public/lib/angular/angular.min.js',
				'public/lib/angular-resource/angular-resource.min.js',
				'public/lib/angular-animate/angular-animate.min.js',
				'public/lib/angular-ui-router/release/angular-ui-router.min.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.min.js',
				'public/lib/angular-ui-sortable/sortable.min.js',
				'public/lib/jquery-ui/jquery-ui.min.js',
				'public/lib/perfect-scrollbar/src/jquery.mousewheel.js',
				'public/lib/perfect-scrollbar/min/perfect-scrollbar.min.js', // do not use min
				'public/modules/core/js/angular-sortable-view.js'
			]
		},
		css: 'public/dist/application.min.css',
		js: 'public/dist/application.min.js'
	},
	trello: {
		clientID: process.env.TRELLO_KEY,
		clientSecret: process.env.TRELLO_SECRET,
		callbackURL: 'https://wellofridge.herokuapp.com/auth/trello/callback'
	}
};