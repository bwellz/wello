'use strict';

/**
 * ########## User Module ###########
 */

// Module Dependencies
var mongoose = require('mongoose'),
	passport = require('passport'),
	config = require('../../config/config'),
	User = mongoose.model('User'),
	Board = mongoose.model('Board'),
	User_Boards = mongoose.model('User_Boards'),
	request = require('request'),	
	crypto = require('crypto'),	
	async = require('async'),
	_ = require('lodash'),
	core = require('../controllers/core'),
	support = require('../controllers/support');

// Handle user errors
var getErrorMessage = function(err) {
	var message = '';
	if (err.code) {
		switch (err.code) {
			case 11000:
			case 11001:
				message = 'Username already exists';
				break;
			default:
				message = 'Something went wrong';
		}
	} else {
		for (var errName in err.errors) {
			if (err.errors[errName].message) message = err.errors[errName].message;
		}
	}
	return message;
};

// Signup through local passport strategy
exports.signup = function(req, res) {
	// For security measurement we remove the roles from the req.body object
	delete req.body.roles;

	// Init Variables
	var user = new User(req.body);
	var message = null;

	if ( !req.body.password ) {
		return res.send(400, {
			message: 'You must enter a Password.'
		});		
	} else if ( req.body.password !== req.body.confirm ) {
		return res.send(400, {
			message: 'The Password must match the Confirm Password.'
		});	
	} else if ( req.body.password.length < 6 || req.body.password.length > 32 ) {
		return res.send(400, {
			message: 'Passwords must be between 6 and 32 characters.'
		});			
	} else {
		user.salt = crypto.randomBytes(16).toString('base64');
		user.password = crypto.pbkdf2Sync(user.password, new Buffer(user.salt,'base64'), 10000, 64).toString('base64');

		// Add missing user fields
		user.provider = 'local';
		user.displayName = user.username;

		var insert_boards = [];
		var inserted_boards = [];

		//create each board before creating boards record
		var user_board = {
			labels_locked: false,
			lists_locked: false, // cannot add/remove, reorder, or edit lists
			cards_locked: false, // cannot add/remove or edit cards or move them between lists
			num_cards: 4,
			label_names: ['Label 1','Label 2','Label 3','Label 4','Label 5','Label 6'],				
			lists:[
				{uid:support.gen_id(),name:'List 1',cards:[
					{uid:support.gen_id(),name:'Card 1.1',des:'',labels:[true,true,false,false,false,false]},
					{uid:support.gen_id(),name:'Card 1.2',des:'',labels:[false,true,true,false,false,false]}
				]},
				{uid:support.gen_id(),name:'List 2',cards:[
					{uid:support.gen_id(),name:'Card 2.1',des:'',labels:[false,false,true,true,false,false]},
					{uid:support.gen_id(),name:'Card 2.2',des:'',labels:[false,false,false,true,true,false]}
				]}
			], user:user._id
		};
		insert_boards.push(user_board);
		inserted_boards.push({'name':'Sample Board'});	
		insert_boards = support.setup_boards(insert_boards,user._id);
		Board.collection.insert(insert_boards, {}, function(err,docs) {
			if ( err ) {
				console.log(err);			
				return res.send(400, {
					message: getErrorMessage(err)
				});
			} else {
				for ( var i = 0; i < inserted_boards.length; i++ ) {
					inserted_boards[i].board = docs[i]._id;
				}
				var boards = support.boards_seed(docs,inserted_boards,user);
				boards.save(function(err) {
					if (err) {
						return res.send(400, {
							message: getErrorMessage(err)
						});
					} else {
						// Then save the user 
						user.save(function(err) {
							if (err) {
								return res.send(400, {
									message: getErrorMessage(err)
								});
							} else {
								// Remove sensitive data before login
								user.password = undefined;
								user.salt = undefined;
								req.login(user, function(err) {
									if (err) {
										res.send(400, err);
									} else {
										res.jsonp(user);
									}
								});
							}
						});
					}
				});		
			}
		});
	}
};

// Local Signin after passport authentication
exports.signin = function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err || !user) {
			res.send(400, info);
		} else {
			// Remove sensitive data before login
			user.password = undefined;
			user.salt = undefined;

			req.login(user, function(err) {
				if (err) {
					res.send(400, err);
				} else {
					res.jsonp(user);
				}
			});
		}
	})(req, res, next);
};

// Routing middleware to ensure that a user is actually logged in
exports.requiresUser = function(req, res, next) {
	if (!req.isAuthenticated()) {
		return res.send(401, {
			message: 'User is not logged in'
		});
	}
	next();
};

// Save the URL to use for the OAuth callback
exports.setcb = function(req,res,next) {
	if ( req.params.fridge === 'base' || req.params.fridge === 'dx' || req.params.fridge === 'mini' || req.params.fridge === 'silver' ) {
		req.session.cburl = req.params.fridge;
	}
	return next();
};

// OAuth callback that will result in redirecting to the URL saved in setcb()
exports.oauthCallback = function(strategy) {
	return function(req, res, next) {
		passport.authenticate(strategy, function(err, user, redirectURL) {
			if ( req.session.cburl ) {
				return res.redirect('/#!/fridge/'+req.session.cburl);
			} else {
				return res.redirect('/');
			}
		})(req, res, next);
	};
};

// OAuth for Trello succeeded, populate the profile and initial boards via the Trello API
exports.saveTrelloProfile = function(req, providerUserProfile, done) {
	if (!req.user) {
		// Define a search query fields
		var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
		var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

		// Define main provider search query
		var mainProviderSearchQuery = {};
		mainProviderSearchQuery.provider = providerUserProfile.provider;
		mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define additional provider search query
		var additionalProviderSearchQuery = {};
		additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define a search query to find existing user with current provider profile
		var searchQuery = {
			$or: [mainProviderSearchQuery, additionalProviderSearchQuery]
		};

		User.findOne(searchQuery, function(err, user) {
			if (err) {
				return done(err);
			} else {
				if (!user) {
					var possibleUsername = providerUserProfile.username;
					User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
						user = new User({
							initials: providerUserProfile.initials,
							username: availableUsername,
							displayName: providerUserProfile.displayName,
							provider: providerUserProfile.provider,
							providerData: providerUserProfile.providerData
						});
						// And save the user
						request('https://trello.com/1/members/'+user.username+'/boards?key='+config.trello.clientID+'&token='+user.providerData.accessToken, function (error, response, body) {
							if (!error && response.statusCode === 200) {

								body = JSON.parse(body);
								
								var insert_boards = [];
								var inserted_boards = [];
								var list_index_lookup = {};
								var board_index_lookup = {};
								var card_index_lookup = {};
								var board_cards = [];

								var image_requests = 0;

								//create each Trello board
								for ( var i = 0; i < body.length; i++ ) { 
									var user_board = {
										labels_locked: false,
										lists_locked: false, // cannot add/remove, reorder, or edit lists
										cards_locked: false, // cannot add/remove or edit cards or move them between lists	
										/*label_names: ['a','b','c','d','e','f'],*/
										label_names: [body[i].labelNames.green,
										body[i].labelNames.yellow,
										body[i].labelNames.orange,
										body[i].labelNames.red,
										body[i].labelNames.purple,
										body[i].labelNames.blue],		
										lists:[], 
										user:user._id
									};

									board_index_lookup[body[i].id] = i;
									inserted_boards.push({'name':body[i].name,trello_board:true,truncated:false,starred:body[i].starred});
									insert_boards.push(user_board);
									board_cards.push(0);
								}
		
								// pull in individual board data
								async.each(body,
									function(board, cb) {
										request('https://trello.com/1/boards/'+board.id+'/lists?key='+config.trello.clientID+'&token='+user.providerData.accessToken, function (error, response, lists) {
											if (!error && response.statusCode === 200) {
												lists = JSON.parse(lists);
												var board_lists, board_index;
												for ( var i = 0; i < lists.length; i++ ) {
													board_index = board_index_lookup[lists[i].idBoard];
													list_index_lookup[lists[i].id] = {list:i,board:board_index};
													board_lists = insert_boards[board_index].lists;
													board_lists.push({name: core.name_len(lists[i].name,60), uid: lists[i].id, cards: []});
												}
												request('https://trello.com/1/boards/'+board.id+'/cards?key='+config.trello.clientID+'&token='+user.providerData.accessToken, function (error, response, cards) {
													if (!error && response.statusCode === 200) {
														cards = JSON.parse(cards);
														var list_index, list_cards, cur_card;
														var attachment_needs = [];
														for ( var i = 0; i < cards.length; i++ ) {
															list_index = list_index_lookup[cards[i].idList];
															if ( board_cards[list_index.board] < 60 ) {
																board_cards[list_index.board]++;
																var labs = [false,false,false,false,false,false];//labels":[{"color":"red","name":"Long"}]
																for ( var j = 0; j < cards[i].labels.length; j++ ) {
																	switch(cards[i].labels[j].color) {
																		case 'green': labs[0] = true; break;
																		case 'yellow': labs[1] = true; break;
																		case 'orange': labs[2] = true; break;
																		case 'red': labs[3] = true; break;
																		case 'purple': labs[4] = true; break;
																		case 'blue': labs[5] = true; break;
																		case 'default': break;																	
																	}
																}
																list_cards = insert_boards[list_index.board].lists[list_index.list].cards;
																list_cards.push({uid: support.gen_id(), name: cards[i].name, des: cards[i].desc, labels: labs});
																card_index_lookup[cards[i].id] = {list:list_index.list,board:list_index.board,card:list_cards.length-1};
																if ( cards[i].badges.attachments > 0 ) {
																	if ( attachment_needs.length < 20 ) {
																		attachment_needs.push({card_id:cards[i].id,cover_id:cards[i].idAttachmentCover});
																	} else {
																		cur_card = card_index_lookup[cards[i].id];
																		insert_boards[cur_card.board].truncated = true;
																		cur_card = insert_boards[cur_card.board].lists[cur_card.list].cards[cur_card.card];
																		cur_card.image = 'modules/core/img/skipped_trello_img.png';																		
																		cur_card.des += ' Wello limits the number of images loaded from Trello in order to reduce the number of API calls made to their servers.  This will reduce account creation time as well as prevent sudden surges of traffic from hitting their servers.';
																	}
																} else {
																	if ( Math.random() < 0.05 ) {
																		cur_card = card_index_lookup[cards[i].id];
																		cur_card = insert_boards[cur_card.board].lists[cur_card.list].cards[cur_card.card];
																		cur_card.image = 'modules/core/img/munchkin.png';
																		cur_card.name += ' ...Bad Munchkin!  Get off that card!';
																		cur_card.des += ' Munchkin is sitting on this card so it will be impossible to move.  Wello needs a new mascot.';
																		cur_card.munchkined = true;
																	}
																}


															} else {
																inserted_boards[board_index].truncated = true;
															}
														}
														insert_boards[board_index].num_cards = board_cards[board_index];

														// loop attachment_needs and make a second layer of async calls before triggering first async cb
														// attachments aren't necessary for success so just continue whether they all fail/succeed
														// do mark that the board has attachment errors though
														if ( attachment_needs.length > 0 ) {
															async.each(attachment_needs,
																function(attachment, cb2) {
																	var card_index = card_index_lookup[attachment.card_id];
																	request('https://trello.com/1/cards/'+attachment.card_id+'/attachments?key='+config.trello.clientID+'&token='+user.providerData.accessToken, function (error, response, attachments) {
																		if (!error && response.statusCode === 200) {
																			// find correct attachement
																			attachments = JSON.parse(attachments);
																			for ( var i = 0; i < attachments.length; i++ ) {
																				if ( attachments[i].id === attachment.cover_id ) {
																					var found = false;
																					// loop through previews and save the 300 width one, because THIS. IS. WELLO!
																					for ( var j = 0; j < attachments[i].previews.length; j++ ) {
																						if ( attachments[i].previews[j].width === 300 ) {
																							found = true;
																							insert_boards[card_index.board].lists[card_index.list].cards[card_index.card].image = attachments[i].previews[j].url;
																						}
																					}
																					// if a 300-width record wasn't found for whatever reason, use the default
																					if ( !found ) {
																						insert_boards[card_index.board].lists[card_index.list].cards[card_index.card].image = attachments[i].url;																						
																					}
																				}
																			}
																		} else {
																			inserted_boards[card_index.board].truncated = true;
																		}
																		cb2();
																	});
																},
																function(err) {
																	cb();
																}
															);
														} else {
															cb();
														}

													} else {
														console.log('Trello API get cards failed');
														return done(err, user);	
													}
												});
											} else {
												console.log('Trello API get lists failed');
												return done(err, user);								
											}
										});
									},
									// async callback
									function(err) {
										if ( err ) {
											console.log('Trello API error');
											return done(err, user);	
										} else {
											insert_boards =support.setup_boards(insert_boards,user._id);
											Board.collection.insert(insert_boards, {}, function(err,docs) {
												if ( err ) {		
													return done(err, user);
												} else {
													for ( var i = 0; i < inserted_boards.length; i++ ) {
														inserted_boards[i].board = docs[i]._id;
													}
													var boards = support.boards_seed(docs,inserted_boards,user);
													boards.save(function(err) {
														if (err) {
															return done(err, user);
														} else {
															user.save(function(err) {
																return done(err, user);
															});
														}
													});
												}
											});
										}
									}
								);
							} else {
								console.log('Trello API get boards failed');
								return done(err, user);								
							}
						});
					});
				} else {
					console.log('User Already Exists!');
					return done(err, user);
				}
			}
		});
	} else {
		// User is already logged in, join the provider data to the existing user
		var user = req.user;

		// Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
		if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
			// Add the provider data to the additional provider data field
			if (!user.additionalProvidersData) user.additionalProvidersData = {};
			user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

			// Then tell mongoose that we've updated the additionalProvidersData field
			user.markModified('additionalProvidersData');

			// And save the user
			user.save(function(err) {
				return done(err, user, '/#!/settings/accounts');
			});
		} else {
			return done(new Error('User is already connected using this provider'), user);
		}
	}
};

// Middleware for loading users
exports.userByID = function(req, res, next, id) {
	User.findOne({
		_id: id
	}).exec(function(err, user) {
		if (err) return next(err);
		if (!user) return next(new Error('Failed to load User ' + id));
		req.profile = user;
		next();
	});
};

// Return the user attached to the current session
exports.me = function(req, res) {
	res.jsonp(req.user || null);
};

// Update the zipcode kept for the weather app
exports.change_zip = function(req, res, next) {
	var zip = {};
	zip.zip = req.body.zip;
	var user = _.extend(req.user, zip);
	user.updated = Date.now();
	user.save(function(err) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp({});
		}
	});
};

// Signout by destroying the user session
exports.signout = function(req, res) {
	req.session.destroy();
	res.jsonp(null);
};