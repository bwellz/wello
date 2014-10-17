'use strict';

module.exports = function(app) {
	// Root routing
	var core = require('../controllers/core'),
	    users = require('../controllers/users'),
	    cards = require('../controllers/cards'),
	    lists = require('../controllers/lists'),
	    boards = require('../controllers/boards'),
	    support = require('../controllers/support'),
	    passport = require('passport');

	// Redirect to HTTPS
	app.use('*',function(req,res,next){
	  	if(req.headers['x-forwarded-proto']!='https' && process.env.NODE_ENV === 'production') {
	    	res.redirect('https://wellofridge.herokuapp.com'+req.url)
	  	} else {
	    	next() /* Continue to other routes if we're not redirecting */
		}
	})

	// Render the page
	app.route('/').get(core.index);

	// User Routes
	app.route('/users/me').get(users.me);
	app.route('/auth/signup').post(users.signup);
	app.route('/auth/signin').post(users.signin);
	app.route('/auth/signout').post(users.signout);
	
	// Trello OAuth and Callback
	app.route('/auth/trello/:fridge').get(users.setcb, passport.authenticate('trello'));
	app.route('/auth/trello/callback').get(users.oauthCallback('trello'));

	app.route('/change_zip').post(users.requiresUser, users.change_zip);

	app.param('userId', users.userByID);

	// Board Routes
	app.route('/boards').get(users.requiresUser, boards.boards);
	app.route('/board/:board_id').get(users.requiresUser, boards.board);
	app.route('/board_name').post(users.requiresUser, boards.board_name);	
	app.route('/board_star').post(users.requiresUser, boards.board_star);	
	app.route('/new_board').post(users.requiresUser, boards.new_board);
	app.route('/delete_board/:board_id').get(users.requiresUser, boards.delete_board);
	app.route('/update_labels').post(users.requiresUser, boards.update_labels);	
	app.route('/add_food').post(users.requiresUser, boards.add_food);
	app.route('/prepare_recipe').post(users.requiresUser, boards.prepare_recipe);
	app.route('/achievement').post(users.requiresUser, boards.achievement);

	// List Routes
	app.route('/list_move').post(users.requiresUser, lists.list_move);
	app.route('/list_add').post(users.requiresUser, lists.list_add);	
	app.route('/list_delete').post(users.requiresUser, lists.list_delete);	
	app.route('/list_name').post(users.requiresUser, lists.list_name);

	// Card Routes
	app.route('/update_card_label').post(users.requiresUser, cards.toggle_label);	
	app.route('/update_card_name').post(users.requiresUser, cards.card_name);	
	app.route('/update_card_des').post(users.requiresUser, cards.card_des);			
	app.route('/delete_card').post(users.requiresUser, cards.card_delete);	
	app.route('/add_card').post(users.requiresUser, cards.card_add);
	app.route('/card_move').post(users.requiresUser, cards.card_move);

	// Weather API Route
	app.route('/weather').post(users.requiresUser, support.weather);	
};