'use strict';

module.exports = {
	app: {
		title: 'Wello Fridge',
		description: 'MEAN Refrigerator with MongoDB, Express, AngularJS, and Node.js',
		keywords: 'mongodb, express, angularjs, node.js, trello, mongoose, passport'
	},
	port: process.env.PORT || 3000,
	templateEngine: 'swig',
	sessionSecret: process.env.SESSION_SECRET,
	sessionCollection: 'sessions',
	newRelic: process.env.NEW_RELIC_LICENSE_KEY,
	apiKeys: {
		google: process.env.GOOGLE_API,
		openWeatherMap: process.env.OPEN_WEATHER_MAP_API
	},
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.css',
				'public/lib/perfect-scrollbar/src/perfect-scrollbar.css'
			],
			js: [
				'public/lib/jquery/dist/jquery.min.js',
				'public/lib/angular/angular.min.js',
				'public/lib/angular-resource/angular-resource.min.js',
				'public/lib/angular-animate/angular-animate.min.js',
				'public/lib/angular-ui-router/release/angular-ui-router.min.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.min.js',
				'public/lib/angular-ui-sortable/sortable.min.js',		
				'public/lib/misc-js/jquery-ui.min.js',
				'public/lib/misc-js/jquery.mousewheel.js',		
				'public/lib/angular-sortable-view/src/angular-sortable-view.js',
				'public/lib/perfect-scrollbar/src/perfect-scrollbar.js'
			]
		},
		css: [
			'public/modules/**/css/*.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	}
};