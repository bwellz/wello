'use strict';

/**
 * Kinda empty in here, being a Single Page App.
 */
 
exports.index = function(req, res) {
	res.render('index', {
		user: req.user || null
	});
};



