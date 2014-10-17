'use strict';

/**
 * ########## Support Functions for the other Modules ###########
 */

// Module Dependencies
var mongoose = require('mongoose'),
	support = require('../controllers/support'),
	Weather = mongoose.model('Weather'),
	User_Boards = mongoose.model('User_Boards'),
	_ = require('lodash'),
	crypto = require('crypto'),
	request = require('request'),
	config = require('../../config/config');

// Errors for this module
var WERR = {
	WEATHER: 'An error occured with the weather API!'
};

// generate a random ID for uniquely identifying boards, lists, and cards
// there is enough entropy in 6 bytes for performing this hash duty, no need for the "full 16"
exports.gen_id = function() {
	return crypto.randomBytes(6).toString('hex');
}
var gen_id = exports.gen_id;

// truncate a string to the provided length
exports.name_len = function (str,len) {
	if ( str.length > len ) {
		return str.substr(0,len) + '..';
	} else {
		return str;
	}
};

// Use the Google API for geocoding a zipcode and then use the Open Weather Map API to lookup weather
// The client will select a random picture of a cat if either the zipcode did not translate to a valid location or the weather is not nice
// The last result for each zipcode is saved so that the same API lookups will not be performed less than 10 minutes apart
exports.weather = function(req, res, next) {
	var datetime = new Date();
	if ( req.body.zip.length !== 5 || isNaN(req.body.zip) ) {
		next(new Error(WERR.WEATHER));
	} else {
		Weather.findOne({zip: req.body.zip}).exec(function(err, weather) {
			if (err || weather === null || (weather.updated.getTime()+600000) < datetime ) {	
				if ( weather === null ) {
					weather = new Weather({zip:req.body.zip});
				}
				request('https://maps.googleapis.com/maps/api/geocode/json?address='+req.body.zip+'&sensor=false&key='+config.apiKeys.google, function (error, response, data) {
					if ( !error) data = JSON.parse(data);
					if (!error && response.statusCode === 200 && data.status === 'OK' ) {
						var foundcity = false, foundstate = false, foundcountry = false;
						for ( var i = 0; i < data.results[0].address_components.length; i++ ) { 
							if ( data.results[0].address_components[i].types.indexOf('locality') !== -1 ) {
								weather.city = data.results[0].address_components[i].short_name;
								foundcity = true;
							} else if ( data.results[0].address_components[i].types.indexOf('administrative_area_level_1') !== -1 ) {
								weather.state = data.results[0].address_components[i].short_name;
								foundstate = true;
							} else if ( data.results[0].address_components[i].types.indexOf('country') !== -1 ) {
								weather.country = data.results[0].address_components[i].short_name;
								foundcountry = true;
							}
						}
						if ( foundcity === false || foundstate === false || foundcountry === false || weather.country !== 'US' ) { /**/
							weather.city = 'Some City';
							weather.state = 'Not America';
						}
						var loc = data.results[0].geometry.location;
						request('http://api.openweathermap.org/data/2.5/weather?lat='+loc.lat+'&lon='+loc.lng+'&APPID='+config.apiKeys.openWeatherMap, function (error, response, data) {
							if (!error && response.statusCode === 200) {
								data = JSON.parse(data);
								weather.temp = ((data.main.temp-273.15)*1.8+32.0).toFixed(1);
								weather.condition = data.weather[0].main;
								weather.icon = data.weather[0].icon;
								weather.weather_id = data.weather[0].id;
								weather.weather_des = data.weather[0].description;
								weather.updated = datetime;
								weather.save(function(err) {
									console.log(err);
									res.jsonp(weather);
								});
							} else {
								res.jsonp({fail:1});
							}
						});
					} else {	
						weather.city = 'Soujourner\'s Grave';
						weather.state = 'Mars';	
						weather.country = 'Space';
						weather.updated = datetime;
						weather.save(function(err) {
							res.jsonp(weather);
						});
					}
				});
			} else {	
				res.jsonp(weather);
			}
		});
	}
};

// lay out all boards, food, recipes, and achievements for a new user
// the array then gets batch-inserted into Mongo in the users module
exports.boards_seed = function(docs,inserted_boards,user) {
	var resume_board = docs[inserted_boards.length]._id;
	var portfolio_board = docs[inserted_boards.length+1]._id;
	var food_board = docs[inserted_boards.length+2]._id;
	var recipe_board = docs[inserted_boards.length+3]._id;
	var chores_board = docs[inserted_boards.length+4]._id;									
	var art_board = docs[inserted_boards.length+5]._id;
	var pills_board = docs[inserted_boards.length+6]._id;						
	var homework_board = docs[inserted_boards.length+7]._id;
	var welcome_board = docs[inserted_boards.length+8]._id;
	var snake_board = docs[inserted_boards.length+9]._id;
	var default_board = welcome_board;
	return new User_Boards({'boards':inserted_boards,'resume_board':resume_board,
		'portfolio_board':portfolio_board,'food_board':food_board,'recipe_board':recipe_board,
		'chores_board':chores_board,'art_board':art_board,'pills_board':pills_board,
		'homework_board':homework_board,'welcome_board':welcome_board,
		'snake_board':snake_board,'cur_board':default_board,'user':user._id,
		'food':[{name:'Coke',cat:'Sweets',count:0,create:12}, // 0
		{name:'Redbull',cat:'Sweets',count:45,create:4},
		{name:'Icecream',cat:'Sweets',count:0,create:4},
		{name:'Sugar',cat:'Sweets',count:0,create:100},
		{name:'Milk',cat:'Dairy',count:0,create:10}, 
		{name:'Cheese',cat:'Dairy',count:0,create:64}, // 5
		{name:'Butter',cat:'Dairy',count:0,create:10},
		{name:'Mayo',cat:'Dairy',count:0,create:20},
		{name:'Eggs',cat:'Dairy',count:0,create:12},
		{name:'Fish',cat:'Meats & Poultry',count:0,create:1},
		{name:'Chicken',cat:'Meats & Poultry',count:0,create:4}, // 10
		{name:'Bacon',cat:'Meats & Poultry',count:0,create:6},
		{name:'Steak',cat:'Meats & Poultry',count:0,create:1},
		{name:'Hamburger',cat:'Meats & Poultry',count:0,create:4},
		{name:'Hot Dogs',cat:'Meats & Poultry',count:0,create:10},
		{name:'Turkey',cat:'Meats & Poultry',count:0,create:4}, // 15
		{name:'MEAN Cuisine',cat:'Meats & Poultry',count:20,create:1},
		{name:'Lobster',cat:'Meats & Poultry',count:17,create:1},
		{name:'Tomato',cat:'Fruits',count:0,create:4},
		{name:'Ketchup',cat:'Fruits',count:0,create:20},
		{name:'Orange',cat:'Fruits',count:0,create:4}, // 20
		{name:'Strawberry',cat:'Fruits',count:0,create:20},
		{name:'Pasta Sauce',cat:'Vegetables',count:0,create:4},
		{name:'Broccoli',cat:'Vegetables',count:0,create:4},
		{name:'Pizza',cat:'Vegetables',count:0,create:8},
		{name:'Lettuce',cat:'Vegetables',count:0,create:4}, // 25
		{name:'Bread',cat:'Grains',count:0,create:16},
		{name:'Burger Buns',cat:'Grains',count:0,create:8},
		{name:'Hotdog Buns',cat:'Grains',count:0,create:8},
		{name:'Vodka',cat:'Grains',count:0,create:17},
		{name:'Spaghetti',cat:'Grains',count:0,create:5}, // 30
		{name:'Pancake Mix',cat:'Grains',count:0,create:10},
		{name:'Whiskey',cat:'Grains',count:25,create:17},
		{name:'Syrup',cat:'Sweets',count:0,create:20},
		{name:'Mustard',cat:'Grains',count:0,create:20},
		{name:'Beer',cat:'Grains',count:12,create:6}, // 35
		{name:'Ice Cube',cat:'',count:60,create:10},
		{name:'Banana',cat:'Fruits',count:0,create:3}],
		'recipes':[{ name: 'Eggs and Bacon', // 0
		  food: [{food:8,count:2},{food:11,count:4}],
		  image: 'modules/core/img/recipes/eggsandbacon.png' },
		{ name: 'Strawberry Pancakes',
		  food: [{food:31,count:1},{food:21,count:15},{food:4,count:1},{food:8,count:2},{food:3,count:2}],
		  image: 'modules/core/img/recipes/strawberrypancakes.png' },
		{ name: 'Pancakes',
		  food: [{food:31,count:1},{food:33,count:2},{food:4,count:1},{food:6,count:2},{food:8,count:2}],
		  image: 'modules/core/img/recipes/pancakes.png' },
		{ name: 'Munchkin Delight',
		  food: [{food:9,count:10},{food:10,count:10}],
		  image: 'modules/core/img/recipes/munchkin.png' },					
		{ name: 'Cheeseburger',
		  food: [{food:27,count:1},{food:13,count:1},{food:5,count:1},{food:18,count:1},{food:25,count:1},{food:7,count:1}],
		  image: 'modules/core/img/recipes/cheeseburger.png' },
		{ name: 'Buttered Noodles', //5
		  food: [{food:30,count:1},{food:6,count:2}],
		  image: 'modules/core/img/recipes/noodles.png' },
		{ name: 'Turkey Sandwich',
		  food: [{food:15,count:1},{food:26,count:2},{food:5,count:1},{food:18,count:1},{food:7,count:1}],
		  image: 'modules/core/img/recipes/turkeysandwich.png' },
		{ name: 'Hotdog',
		  food: [{food:28,count:1},{food:14,count:1},{food:19,count:1},{food:34,count:1}],
		  image: 'modules/core/img/recipes/hotdog.png' },
		{ name: 'Lobster Roll',
		  food: [{food:17,count:1},{food:28,count:1},{food:7,count:1},{food:6,count:1}],
		  image: 'modules/core/img/recipes/lobsterroll.png' },
		{ name: 'Grilled Cheese',
		  food: [{food:5,count:4},{food:26,count:2}],
		  image: 'modules/core/img/recipes/grilledcheese.png' },
		{ name: 'Salad', // 10
		  food: [{food:25,count:1},{food:18,count:1}],
		  image: 'modules/core/img/recipes/salad.png' },			  				  
		{ name: 'Pasta',
		  food: [{food:30,count:1},{food:22,count:1}],
		  image: 'modules/core/img/recipes/pasta.png' },
		{ name: 'Broccoli Casserole',
		  food: [{food:23,count:4},{food:5,count:4},{food:6,count:4},{food:7,count:4}],
		  image: 'modules/core/img/recipes/broccolicasserole.png' },
		{ name: 'MEAN Cuisine',
		  food: [{food:16,count:1}],
		  image: 'modules/core/img/recipes/mean.png' },
		{ name: 'Lobster',
		  food: [{food:17,count:1},{food:6,count:8}],
		  image: 'modules/core/img/recipes/lobster.png' },
		{ name: 'Surf and Turf', // 15
		  food: [{food:12,count:1},{food:17,count:1}],
		  image: 'modules/core/img/recipes/surfandturf.png' },
		{ name: 'Pizza!',
		  food: [{food:24,count:8}],
		  image: 'modules/core/img/recipes/pizza.png' },
		{ name: 'Fancy Sauce',
		  food: [{food:19,count:1},{food:7,count:1}],
		  image: 'modules/core/img/recipes/fancysauce.png' },
		{ name: 'Lobster Mac and Cheese',
		  food: [{food:17,count:1},{food:5,count:4},{food:30,count:1}],
		  image: 'modules/core/img/recipes/lobstermac.png' },						  				  
		{ name: 'Redbull and Vodka',
		  food: [{food:1,count:1},{food:29,count:1}],
		  image: 'modules/core/img/recipes/redbullvodka.png' },
		{ name: 'Orange Juice', // 20
		  food: [{food:20,count:6},{food:3,count:1}],
		  image: 'modules/core/img/recipes/orangejuice.png' },
		{ name: 'Banana Shake',
		  food: [{food:37,count:2},{food:4,count:1},{food:3,count:1}],
		  image: 'modules/core/img/recipes/bananashake.png' },
		{ name: 'Coke Float',
		  food: [{food:0,count:1},{food:2,count:1}],
		  image: 'modules/core/img/recipes/cokefloat.png' },
		{ name: 'Big Cup of Whiskey',
		  food: [{food:32,count:4},{food:36,count:1}],
		  image: 'modules/core/img/recipes/whiskey.png' },
		{ name: 'Beer!', // 24
		  food: [{food:35,count:1}],
		  image: 'modules/core/img/recipes/beer.png' }],
		'achievements': [{ name: 'Meet Munchkin', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // 0 --- click on munch
		{ name: 'Fatten the Cat', unlocked: false, locked_list: 3, value: 0, trigger: 30 }, // feed munchkin 30 times
		{ name: 'Snack Attack', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // create munchkin snack
		{ name: 'Lobster Four Ways', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // all four lobster dishes
		{ name: 'Tofu Compression', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // have 500 of the same food
		{ name: 'ALS Challenge', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // 5 --- ALS challenge
		{ name: 'Spinning Ionized Negligence Razors', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // move a card to another list
		{ name: 'You Won\'t Regret It', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // hire Brad
		{ name: 'Fine Imported Cardboard', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // visit trello board
		{ name: 'Sieve of Erratainthis', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // apply a filter
		{ name: 'A Whole New Board', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // 10 --- create a board
		{ name: 'All-American Obesity Epidemic', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // cheeseburger, pizza, hotdog, beer
		{ name: 'Munchkin Surprise', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // munchkin appears
		{ name: 'Snaaaaaake!', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // play snake
		{ name: 'Snake Handler', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // Snake 10
		{ name: 'Snake Addict', unlocked: false, locked_list: 3, value: 0, trigger: 10 }, // 15 --- play snake 10
		{ name: 'ng-deplete', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // Snake 20
		{ name: 'Party Down!', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // party mode
		{ name: 'Impressive Credentials', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // resume board
		{ name: 'Get Things Done', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // portfolio board
		{ name: 'Food Fight', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // 20 -- food board
		{ name: 'Let\'s Get Cooking', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // recipe board
		{ name: 'Recipe for Success', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // view recipe				
		{ name: 'Typical SoHo Gallery', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // art board
		{ name: 'Everything Tastes like Tofu', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // create food
		{ name: 'Cookin\' with Uranium', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // 25 --- prepare recipe
		{ name: 'Card Shark', unlocked: false, locked_list: 3, value: 0, trigger: 30 }, // create 30 cards
		{ name: 'Need to Cut You Off', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // truncated
		{ name: 'A Moment of Peace', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // make munchkin pass out
		{ name: 'Throw It on the Ground!', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // have non-salad food hit the floor
		{ name: 'Ice to Meet You', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // 30 --- freezer
		{ name: 'Gross!', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // have munchkin drop salad
		{ name: 'Chill Out', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // fridge
		{ name: 'Scorcher', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // 95+ degrees
		{ name: 'O Glorious Day', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // 72.x degrees and sunny
		{ name: 'SYN...SYN....SYN.....', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // 35 --- unknown location
		{ name: 'The Greatest City', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // Check weather in NYC
		{ name: 'Pleasant Day', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // good weather
		{ name: 'Outlook Not So Good', unlocked: false, locked_list: 2, value: 0, trigger: 1 }, // bad weather
		{ name: 'Immovable Object', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // try to move Munchkin
		{ name: 'Pop Some Tags', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // 40 --- toggle a label
		{ name: 'Old Name was Better', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // rename card
		{ name: 'Still Confused', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // change description
		{ name: 'That Changes Everything', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // rename list
		{ name: 'Reinvent Yourself', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // rename board
		{ name: 'No Half-Measures', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // 45 --- delete																
		{ name: 'Shuffleboard', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // move list																
		{ name: 'Brand Spankin\' New Car...d', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // create card																
		{ name: 'On the Eighth Day', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // create list
		{ name: 'The Better Browser', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // use chrome
		{ name: 'Playing Favorites', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // 50 --- toggle star
		{ name: 'Worst. Party. Ever.', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // no lists at the party
		{ name: 'Cultured', unlocked: false, locked_list: 3, value: 0, trigger: 1 }, // non-US city
		{ name: 'Labelmaker', unlocked: false, locked_list: 1, value: 0, trigger: 1 }, // edit label name
		{ name: 'Push It to the Limit', unlocked: false, locked_list: 3, value: 0, trigger: 1 }] // 75 cards on a board
	});
}

// write individual board data for each of a new users boards to an array
exports.setup_boards = function(insert_boards,user_id) {
	var user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Lead Developer','Heavy Math & Algorithm','Modeling & Simulation',
		'Networking & Cyber Security','Web Development','Visualization'],
		lists: [
			{ name: 'About',
			uid: gen_id(),
			cards: [
				{ name: 'Versatile and results-driven software engineer seeks to continue to solve challenging problems, design incredible products, and "make the world a better place."',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Smart and gets things done.',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },				  
				{ name: 'Click cards with this book icon for more info!',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false],
				  des: 'This is extra test you can see if you click cards with books on them!' },
				{ name: 'Be sure to visit the portfolio board as well.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },				  
				{ name: 'This is me.',
				  uid: gen_id(),
				  image: 'modules/core/img/me.jpg',				  
				  labels: [false,false,false,false,false,false] }					  				  	  
			]},		
			{ name: 'Roles within Past Year',
			uid: gen_id(),			
			cards: [
				{ name: 'Lead Software Developer',
				  des: 'Within the past year: Lead software efforts on multiple products including Noctua (cyber security dashboard), Digital BootStrAPP (a web-based training application for the Army), Wonderwall (cyber security log parser), and the National Event Traffic Estimation Service (a web service for estimating regional traffic volumes).  Worked with the following high-level technologies as a lead: Node.js, MongoDB, Angular.js, Backbone.js, Ruby on Rails, Java (Jersey), at least four flavors of SQL, Python, C++, C#.',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Full-Stack Engineer',
				  des: 'Within the past year: Produced full products in both MEAN.js and Ruby on Rails/Backbone.js.  Extremely versatile and comfortable working on everything from front-end graphics and CSS animation to hardcore back-end analysis.',
				  uid: gen_id(),
				  labels: [true,true,false,true,true,true] },				  
				{ name: 'Intrusion Response (IR) Cyber Security Analyst',
				  des: 'Within the past year: Participated in Booz Allen\'s largest commercial engagement of 2013 for the majority of its duration as a network analyst.  Wrote software for parsing terabytes of logs in order to build a case of institutional failure in regards to network security policies.  Authored a major section of the final document delivered to the C-Suite.',
				  uid: gen_id(),
				  labels: [false,false,false,true,false,true] },
				{ name: 'Internal Booz Allen Capture the Flag (CTF) Champion',
				  des: 'Within the past year: Participated in my first firm-wide CTF (no prior experience) where I placed second.  Routinely won monthly challenges afterwards.  Placed 88th world-wide (top 10%) as a two-person team during PlaidCTF in April.',
				  uid: gen_id(),
				  labels: [false,true,false,true,true,false] },
				{ name: 'Fiance',
				  des: 'Created wedding website somehow containing more schtick than this one.',
				  uid: gen_id(),
				  labels: [false,false,false,false,true,false] },
				{ name: 'Husband',
				  des: 'Developing algorithm to keep wife content.  So far I have had some success with a recursive spend-money algorithm but it blows up my stacks pretty quick and segfaults.  I probably need to move to a 7-figure architecture.',
				  uid: gen_id(),
				  labels: [false,true,false,false,false,false] }				  
			]},
			{ name: 'Employment and Education History',
			uid: gen_id(),
			cards: [
				{ name: 'Wello - CEO (August 2014)',
				  uid: gen_id(),
				  labels: [true,false,false,false,true,false] },			
				{ name: 'Booz Allen Hamilton - Associate / Lead Technologist (2010-Present)',
				  des: 'Initialized and lead the development of many software products across a multitude of technologies, mostly within modeling and simulation of telecommunications networks and cyber security.  Participated in cyber Incident Response (IR) for a commercial client that handled over a quadrillion dollars in annual contracts.',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Booz Allen Hamilton - Senior Consultant (2008-2010)',
				  des: 'Functioned as the technical lead for the DHS modeling and simulation contract.  Designed and implemented modeling and simulation products and visualization capabilities for priority telecommunications and network analysis.',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },				  
				{ name: 'Booz Allen Hamilton - Consultant (2007-2008)',
				  des: 'Hired to build an IP Multimedia Subsystem (IMS) core model in OPNET Modeler.  Delivered well enough to have the work included in OPNET\'s annual conference.',
				  uid: gen_id(),
				  labels: [false,true,true,true,true,true]  },
				{ name: 'NASA Goddard Space Flight Center - Intern (2002-2007)',
				  des: 'Developed a mapping and navigation system for an autonomous rover using Laser Detection and Ranging (LADAR) that eventually got deployed in Antarctica.  Developed and installed an interactive kiosk in the International Antarctic Museum in New Zealand.  Built various science education websites.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/nasa.jpg',
				  labels: [true,true,false,false,true,true]  },
				{ name: 'University of Virginia - B.S. Computer Science (2002-2006)',
				  des: 'Developed a strong interest in computer graphics and parallel computing, but mostly learned algorithms I already knew and software development processes that are now antiquated.',
				  uid: gen_id(),
				  labels: [false,true,false,false,true,true] },
				{ name: 'Georgetown Preparatory School (1998-2002)',
				  des: 'Top of the class in Math, Physics, and Computers.',
				  uid: gen_id(),
				  labels: [false,true,false,false,true,false] },
				{ name: 'Began Messing Around with Programming (1994)',
				  des: 'The biggest highlight was getting suspended in 4th grade for "hacking" (making the Nibbles snake grow indefinitely).  Now I can pop boxes and I\'m responsible for Wello Snake, what now?',
				  uid: gen_id(),
				  labels: 1 }					  
			]},
			{ name: 'Selected Products (Details in Portfolio)',
			uid: gen_id(),
			cards: [
				{ name: 'This (August 2014)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/wello.jpg',
			      labels: [true,false,false,false,true,false] },
				{ name: 'Digital BootStrAPP: Interactive Web-Based Training (Army, 2014)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/bootstrapp.jpg',
				  labels: [true,false,true,false,true,true]  },				  
				{ name: 'Noctua: Cyber Security Dashboard (Commercial, 2014)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/noctua.jpg',
				  labels:[true,false,false,true,true,true]  },
				{ name: 'Intrusion Response Network Analysis and Report (Commercial, 2013)',
				  uid: gen_id(),
				  labels: [false,false,false,true,false,true] },
				{ name: ' National Event Traffic Estimation Service (DHS, 2013)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/tes.jpg',
				  labels: [true,true,true,true,true,true]  },
				{ name: 'US Internet Backbone Simulator with Visualization (Govt., 2008-2009)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/neat.png',
				  labels: [true,true,true,true,false,true]  },
				{ name: 'Modeling and Simulation Products in Support of Priority Telecommunications (DHS, 2007-2013)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/tis.jpg',
				  labels: [true,true,true,true,true,true]  },
				{ name: 'Autonomous Rover Using LADAR (NASA, 2005-2006)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/mapping.png',
				  labels: [true,true,false,false,false,true] },
				{ name: 'Ray Tracer and Scene Graph from Scratch (UVA, 2005)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/raytracer.jpg',
				  labels: [true,true,false,false,false,true] },				  
				{ name: 'Interactive Kiosk in the International Antarctic Centre (NASA, 2004)',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/iam.jpg',
				  labels: [true,false,false,false,false,true] } 
			]},			
			{ name: 'Tech Preferences',
			uid: gen_id(),
			cards: [
				{ name: 'Web: Node.js, Express.js, Angular.js, Backbone.js, *.js, D3.js, CSS3, Ruby on Rails',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/css.gif',
				  labels: [true,true,false,true,true,true]  },		
				{ name: 'Database: MongoDB, Redis, yesSQL',
				  uid: gen_id(),
				  labels: [true,false,false,false,true,false] },				  		
				{ name: 'Real-time Rendering: OpenGL, WebGL, DirectX, Ogre3D, Three.js',
				  uid: gen_id(),
				  labels: [true,true,true,false,false,true]  },				  
				{ name: 'Scripting: Python',
				  uid: gen_id(),
				  labels: [true,true,false,true,true,false]  },
				{ name: 'Application: C++/Boost',
				  uid: gen_id(),
				  labels: [true,true,true,true,false,true]  },
				{ name: 'Content Creation: Blender/ZBrush (3D), Photoshop (2D), Office (Boring Stuff)',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,true] }				  	  
			]},			
			{ name: 'Selected Primary Author Publications',
			uid: gen_id(),
			cards: [
				{ name: 'Intrusion Response Report - Network Analysis Section (Commercial, 2013)',
				  des: 'Authored the majority of the Network Analysis section of the final report to the C-Suite of a company that handles over a quadrillion dollars in annual transactions.',
				  uid: gen_id(),
				  labels: [false,false,false,true,false,false] },
				{ name: 'Future Technology Studies (DHS, 2013)',
				  des: 'Researched 33 telecommunications technologies on the horizon and analyzed them in the context of priority service for national security.  Developed use cases and risks for each technology and designed how they could be included in the program.',
				  uid: gen_id(),
				  labels: [true,false,false,true,false,false] },				  
				{ name: 'ATIS-0100036: Media Plane Security Impairments for Evolving VoIP/Multimedia Networks (2013)',
				  des: 'Determined the impact of including additional security services on priority service through modeling and simulation and made recommendations.',
				  uid: gen_id(),
				  labels: [true,false,true,true,false,false] },
				{ name: 'OPNETWORK 2008: Integrating National Security and Emergency Preparedness (NS/EP) Protocols with the IP Multimedia Subsystem (2008)',
				  uid: gen_id(),
				  des: 'Presented the technical details of the IMS Core OPNET model that I created.',
				  labels: [true,true,true,true,false,false]  },
				{ name: 'Modsim World 2008: Modeling the IP Multimedia Subsystem with NS/EP Support (2008)',
				  uid: gen_id(),
				  des: 'Described the challenges of modeling a complex telecommunications system with notional protocols and my approach for overcoming it.',
				  labels:[true,true,true,true,false,false]  },	
				{ name: 'Thesis: A Mapping and Navigation System for an Autonomouos Rover using LADAR (2006)',
				  des: 'Based on my work at NASA, my thesis described my approach for computer vision navigation.',
				  uid: gen_id(),
				  labels: [true,true,false,false,false,true] }				  	  
			]},			
			{ name: 'Six Last Things',
			uid: gen_id(),
			cards: [				
				{ name: 'Discerning: Resident of the greatest city that will ever exist.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },	
				{ name: 'Trustworthy: Active TS (2007-Present)',
				  uid: gen_id(),
				  labels: [false,false,false,true,false,false] },			
				{ name: 'Unrelenting: Billed 400 hours in a single month.',
				  des: 'I drink 5 Five-Hour Energies per day (gaining an extra hour in the process) and I don\'t stop until the project is done.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },				  			  			  
				{ name: 'Rational: Completed many of the older Project Euler problems with <1000 solves (2011-2013)',
				  uid: gen_id(),
				  labels: [false,true,false,false,false,false] },
				{ name: 'Instinctual: Routinely placed first in monthly firm-wide Capture the Flag cyber security challenges despite being brand new to them.',
				  uid: gen_id(),
				  labels: [false,true,false,false,false,false] },					  				  	  	  
				{ name: 'Practical: Studied really hard for a couple days to get a CCNA to help out a proposal effort and then immediately threw it in the garbage because it\'s a CCNA (2009)',
				  uid: gen_id(),
				  labels: [false,false,false,true,false,false] },					  				  	  	  
				{ name: 'Multi-dimensional: Hobbies include both programming AND coding.',
				  uid: gen_id(),
				  des: 'I abandoned my dreams of being a racecar driver when I moved to Manhattan.',
				  labels: [false,true,false,false,true,true] }
			]}		
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Lead Developer','Heavy Math & Algorithm','Modeling & Simulation',
		'Networking & Cyber Security','Web Development','Visualization'],	
		lists: [
			{ name: 'Network Analysis',
			uid: gen_id(),
			cards: [				  
				{ name: 'Connectivity and Damage Analysis Tool',
				  des: 'C++/OpenGL (2009-2010).  The Connectivity and Damage Analysis Tool (CDAT) is the evolution of the Network Examination and Analysis Tool with the key addition of the ability to simulate (and animate) a network over time as it responds to cyber attacks.  The tool is able to simulate Distributed Denial of Service (DDoS) attacks, worm propagation, network router outages, and BGP blackhole attacks.  Simulation results for DDoS attacks were able to match real-world Akamai findings for historical events.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/cdat.jpg',
				  labels: [true,true,true,true,false,true] },			
				{ name: 'Network Examination and Analysis Tool',
				  des: 'C++/OpenGL (2008).  The Network Examination and Analysis Tool (NEAT) ingests open-sourced network data (primarily distributed traceroutes) and builds a model of provider backbone and access assets.  It then establishes a routing policy based on peering assumptions and generates scaled US Internet traffic in order to gauge network performance.  Graphics acceleration allows a user to zoom seamlessly between detail levels.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/neat.png',
				  labels: [true,true,true,true,false,true] },
				{ name: 'National Event Traffic Estimation Service',
				  des: 'Ruby on Rails/C++ (2013).  This web service allowed non-technical users to describe notional national security events at a high level and then see potential network traffic and performance after modeling and simulation take place on the backend.  It made use of both open and proprietary historical data to perform the estimations.  It also created animations showing future trending potential.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/tes.jpg',
				  labels: [true,true,true,true,true,true] }
			]},	
			{ name: '3D Visualization',
			uid: gen_id(),
			cards: [
				{ name: 'Flow-Based Network Visualization',
				  des: 'C++/Ogre3D (2012).  This analysis looked at the effects of a sudden surge of non-malicious cellular traffic originating from a specific geographic location.  It made use of IMS simulator that I developed.  An accompanying flow-based visualization explained simulation results to a non-technical audience.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/flashmob.jpg',
				  labels: [true,true,true,true,false,true] },	
				{ name: 'VoIP Performance Visualization',
				  des: 'C++/OpenGL (2010).  Simulation results from the IP Multimedia Subsystem (IMS) Core OPNET model were often difficult to explain to a non-technical audience.  This visualization showed individual signaling messages as they tranversed the core network as end-to-end voice calls were established and identified congestion points visibly (such as animating dropped packets falling from the relevant server).  It functioned by ingesting custom OPNET output.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/tis.jpg',
				  labels: [true,true,true,true,false,true] },					  
				{ name: 'Hippo-Glide',
				  des: 'C++/OpenGL (2005).  Have you ever wondered about the physics of a hippopotamus in a hang-glider?  Of course you have and that is exactly why Hippo-Glide was invented.  Hippo-Glide makes use of a scene graph developed from scratch and includes 3D terrain generation, terrain culling, terrain Level of Detail (LOD), day-night cycle shaders, and "physics simulation."',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/hippo.jpg',
				  labels: [true,true,true,false,false,true] },	
				{ name: 'Ray Tracer',
				  des: 'C++ (2004).  Wrote a ray-tracer from scratch.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/raytracer.jpg',
				  labels: [true,true,false,false,false,true] },				  			  		
				{ name: 'N^3 Rubik\'s Cube Solver',
				  des: 'C++/OpenGL (2004).  The N-by-N-by-N Rubik\'s Solver allows a user to choose a number of rows and either manually or randomly shuffle the cube.  Once the cube is shuffled, the user may choose to have the program solve the cube or solve it themselves.  Each transition plays through a smooth animation.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/rubix.png',
				  labels: [true,true,false,false,false,true] },
				{ name: 'Camera Array HDR Rendering',
				  des: 'C++/Canon API (2006).  Wrote procedures for taking photographs at various exposures using an array of digital cameras and then transforming the lighting information into an High Dynamic Range (HDR) rendering.',
				  uid: gen_id(),
				  labels: [false,true,false,false,false,true] }				  
			]},				
			{ name: 'Modeling & Sim',
			uid: gen_id(),
			cards: [
				{ name: 'Large-Scale IP Multimedia Subsystem (IMS) Simulator',
				  des: 'C++ (2009-2012).  The OPNET IP Multimedia Subsystem (IMS) core model, which I also developed, had high-fidelity and low-scalability as a result.  In response, I created a standalone simulator that was able to handle the setup and teardown processes of hundreds of thousands in faster than real-time by abstracting away unnecessary facets of the protocols, enabling the team to greatly increase the scale of simulations and the number of trials run.  Built through an incremental process, this tool was the analytical product backing many studies on priority mechanisms for national security traffic, including an Alliance for Telecommunications Industry Solutions (ATIS) standard that I authored.  Primary challenges involved efficiently routing dynamic network traffic, adhering to both standards and priority service requirements, modeling server utilization, appropriately retransmitting dropped packets during server overload, and modeling user behavior.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/ims.jpg',
				  labels: [true,true,true,true,false,false] },	
				{ name: 'IMS and EV-DO OPNET Models',
				  des: 'C/C++/OPNET (2007-2009).  OPNET Modeler is heavy duty commercial simulation product.  It contains many default models for various routers and other network entities, although it also provides the ability to develop new models and protocols through programming using its low-level API.  I developed two extremely complex models according to both standard and priority service requirements: (1) IP Multimedia Subsystem (IMS) and (2) EV-DO (3G Technology).  I presented my work on the IMS model at OPNETWORK, OPNET\'s big annual conference',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/imsopnet.jpg',
				  labels: [true,true,true,true,false,false] },					  				  				
				{ name: 'OPNET Performance Report Web Portal',
				  des: 'Ruby on Rails (2007).  This web portal allowed network analysts to view historical simulation results from the OPNET IMS Core model that I developed.  It was much more convenient for non-modelers to interface with a web portal than OPNET itself.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/imsperf.jpg',
				  labels: [true,false,true,true,true,false] },
			]},				
			{ name: 'Cyber Security',
			uid: gen_id(),
			cards: [				  
				{ name: 'Noctua: Cyber Security Dashboard',
				  des: 'Ruby on Rails, Backbone.js, D3, MongoDB, and Python (January-April 2014).  The goal of Noctua is to provide a cyber security analysis framework and dashboard that resides within a single drop-in box on client sites.  It is meant to be the analysis-heavy complement to Security Information and Event Management (SIEM) servers, featuring much lower storage needs and curated reporting.  End users are able to tune analytical modules, track cyber alerts, and visualize alert data.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/noctua.jpg',
				  labels: [true,false,false,true,true,true] },
				{ name: 'Wonderwall: Log Analyzer',
				  des: 'Python/C++ (2013).  Our cloud deployment failed on a commercial engagement, leaving a gap in log analysis capability.  In response, I created Wonderwall to crunch Firewall and Router log data in a highly efficient and customized way in able to enable sophisticated analysis of IP Blocking policies.  As a result, I was able to show that the organization had misinformed legal about the timing of their policies and that they had implemented other policies incorrectly.  The tool featured a visualization component that plotted complex data on a timeline.',
				  uid: gen_id(),
				  labels: [true,true,false,true,false,true] }				  
			]},				
			{ name: 'Internships',
			uid: gen_id(),
			cards: [
				{ name: 'Computer Vision Mapping and Navigation',
				  des: 'Written in C (2004-2006).  Primary software developer (responsible for processing laser-ranging signals and computing mapping data and movement decisions) working with a multi-discipline team of electrical and mechanical engineers.  The system captured Laser Detecting and Ranging (LADAR) from a sweeping device mounted on a functional autonomous rover.  Software engineering challenges included trigonometrically transforming scan lines into 3D point clouds, "sewing" disparate 3D point clouds together, and route decision making on 3D data.  This work formed the basis for my undergraduate thesis.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/mapping.png',
				  labels: [true,true,false,false,false,true] },
				{ name: 'International Antarctic Museum Interactive Movie Kiosk',
				  des: 'Java (2004).  Developed and installed a two-panel interactive movie kiosk at the International Antartic Museum in Christchurch, New Zealand.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/iam.jpg',
				  labels: [true,false,false,false,false,true] },	
				{ name: 'Science on a Sphere',
				  des: 'C++ (2003).  Wrote a C++ library for converting static imagery into a format suitable for projection onto a spherical display at the NASA-GSFC visitor center.  Demonstrated seasonal ice-cap melting.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/sphere.jpg',
				  labels: [true,true,false,false,false,true] },
				{ name: 'NITF Viewer',
				  des: 'Java (2004).  Developed a web service for efficiently reading specific regions of National Imagery Transmission Format (NITF) images.',
				  uid: gen_id(),
				  labels: [true,true,false,false,true,false] },
				{ name: 'Science Education Portal',
				  des: 'ASP/Flash (2002-2003).  It was Flash, I don\'t want to think about it.',
				  uid: gen_id(),
				  labels: [true,false,false,false,true,false] }			  
			]},				
			{ name: 'Other',
			uid: gen_id(),
			cards: [
				{ name: 'Wello',
				  des: 'MEAN.js (August 2014).  I\'ll let my father-in-law explain: "I don\'t understand why you are doing whatever it is that you are doing."',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/wello.jpg',
				  labels: [true,false,false,false,true,false] },
				{ name: 'Digital BootStrAPP: Interactive Web-Based Training',
				  des: 'MEAN.js (June-August 2014).  Developed interactive vignette-based training for a complex Army applicaton-of-applications.  Developed mock sub-applications as state machines in Angular and allowed analysts to create their own training stories through a sophisticated content management system.',
				  uid: gen_id(),
				  image: 'modules/core/img/portfolio/bootstrapp.jpg',
				  labels: [true,false,true,false,true,false] },
				{ name: 'Tons of Throwaway Capture the Flag (CTF) and Project Euler Code',
				  uid: gen_id(),
				  labels: [true,true,false,true,false,false] },				  
				{ name: 'Roughly a Billion Websites Not Worth Mentioning that Last Existed Prior to 2006',
				  uid: gen_id(),
				  labels: [true,false,true,false,true,false] }	    
			]}				
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Meat & Poultry','Dairy','Fruits','Vegetables','Grains','Sweets'],	
		lists: [
			{ name: 'Main Fridge',
			uid: gen_id(),
			cards: [
				{ name: 'Redbull',
				  uid: gen_id(),
				  food_ref: 1,
				  image: 'modules/core/img/food/redbull.png',
				  labels: [false,false,false,false,false,true] },
	
				  			  
				{ name: 'Hamburger',
				  uid: gen_id(),
				  food_ref: 13,
				  image: 'modules/core/img/food/hamburger.png',
				  labels: [true,false,false,false,false,false] },	  
				{ name: 'Hotdogs',
				  uid: gen_id(),
				  food_ref: 14,
				  image: 'modules/core/img/food/hotdogs.png',
				  labels: [true,false,false,false,false,false] },
				{ name: 'Bacon',
				  uid: gen_id(),
				  food_ref: 11,
				  image: 'modules/core/img/food/bacon.png',
				  labels: [true,false,false,false,false,false] },				  		
				{ name: 'Chicken',
				  uid: gen_id(),
				  food_ref: 10,
				  image: 'modules/core/img/food/chicken.png',
				  labels: [true,false,false,false,false,false] },				  			  
				{ name: 'Turkey',
				  uid: gen_id(),
				  food_ref: 15,
				  image: 'modules/core/img/food/turkey.png',
				  labels: [true,false,false,false,false,false] },	
				{ name: 'Coke',
				  uid: gen_id(),
				  food_ref: 0,
				  image: 'modules/core/img/food/coke.png',
				  labels: [false,false,false,false,false,true] },
				{ name: 'Cheese',
				  uid: gen_id(),
				  food_ref: 5,
				  des: 'Mmmm... 64 slices of American cheese.',
				  image: 'modules/core/img/food/cheese.png',
				  labels: [false,true,false,false,false,false] },
				{ name: 'Strawberry',
				  uid: gen_id(),
				  food_ref: 21,
				  image: 'modules/core/img/food/strawberry.png',
				  labels: [false,false,true,false,false,false] },	
				{ name: 'Beer',
				  uid: gen_id(),
				  food_ref: 35,
				  image: 'modules/core/img/food/beer.png',
				  labels: [false,false,false,false,true,false] }				  		  		  
			]},
			{ name: 'Fridge Door',
			uid: gen_id(),
			cards: [
				{ name: 'Eggs',
				  uid: gen_id(),
				  food_ref: 8,
				  image: 'modules/core/img/food/eggs.png',
				  labels: [false,true,false,false,false,false] },			
				{ name: 'Milk',
				  uid: gen_id(),
				  food_ref: 4,
				  image: 'modules/core/img/food/milk.png',
				  labels: [false,true,false,false,false,false] },
				{ name: 'Butter',
				  uid: gen_id(),
				  food_ref: 6,
				  image: 'modules/core/img/food/butter.png',
				  labels: [false,true,false,false,false,false] },	
				{ name: 'Mayo',
				  uid: gen_id(),
				  food_ref: 7,
				  image: 'modules/core/img/food/mayo.png',
				  labels: [false,true,false,false,false,false] },	
				{ name: 'Ketchup',
				  uid: gen_id(),
				  food_ref: 19,
				  image: 'modules/core/img/food/ketchup.png',
				  labels: [false,false,true,false,false,false] },	
				{ name: 'Mustard',
				  uid: gen_id(),
				  food_ref: 34,
				  image: 'modules/core/img/food/mustard.png',
				  labels: [false,false,true,false,false,false] }				  				  					  				  			  
			]},
			{ name: 'Freezer',
			uid: gen_id(),
			cards: [
				{ name: 'Ice Cube',
				  uid: gen_id(),
				  food_ref: 36,
				  image: 'modules/core/img/food/icecube.png',
				  labels: [false,false,false,false,false,false] },			
				{ name: 'MEAN Cuisine',
				  uid: gen_id(),
				  food_ref: 16,
				  image: 'modules/core/img/food/mean.png',
				  labels: [true,true,true,true,true,true] },		
				{ name: 'Pizza',
				  uid: gen_id(),
				  food_ref: 24,
				  image: 'modules/core/img/food/pizza.png',
				  labels: [true,true,false,true,true,false] },					  		  
				{ name: 'Steak',
				  uid: gen_id(),
				  food_ref: 12,
				  image: 'modules/core/img/food/steak.png',
				  labels: [true,false,false,false,false,false] },	
				{ name: 'Icecream',
				  uid: gen_id(),
				  food_ref: 2,
				  image: 'modules/core/img/food/icecream.png',
				  labels: [false,true,false,false,false,true] },
				{ name: 'Fish',
				  uid: gen_id(),
				  food_ref: 9,
				  image: 'modules/core/img/food/fish.png',
				  labels: [true,false,false,false,false,false] },					  
				{ name: 'Vodka',
				  uid: gen_id(),
				  food_ref: 29,
				  image: 'modules/core/img/food/vodka.png',
				  labels: [false,false,false,false,true,false] }			  				  			  				  			  
			]},
			{ name: 'Lettuce / Lobster Drawer',
			uid: gen_id(),
			cards: [
				{ name: 'Lobster',
				  uid: gen_id(),
				  food_ref: 17,
				  image: 'modules/core/img/food/lobster.png',
				  labels: [true,false,false,false,false,false] },
				{ name: 'Tomato',
				  uid: gen_id(),
				  food_ref: 18,
				  image: 'modules/core/img/food/tomato.png',
				  labels: [false,false,true,false,false,false] },	
				{ name: 'Orange',
				  uid: gen_id(),
				  food_ref: 20,
				  image: 'modules/core/img/food/orange.png',
				  labels: [false,false,true,false,false,false] },	
				{ name: 'Banana',
				  uid: gen_id(),
				  food_ref: 37,
				  image: 'modules/core/img/food/banana.png',
				  labels: [false,false,true,false,false,false] },					  
				{ name: 'Broccoli',
				  uid: gen_id(),
				  food_ref: 23,
				  image: 'modules/core/img/food/broccoli.png',
				  labels: [false,false,false,true,false,false] },
				{ name: 'Lettuce',
				  uid: gen_id(),
				  food_ref: 25,
				  image: 'modules/core/img/food/lettuce.png',
				  labels: [false,false,false,true,false,false] }				  					  				  			  
			]},
			{ name: 'Cabinets',
			uid: gen_id(),
			cards: [
				{ name: 'Bread',
				  uid: gen_id(),
				  food_ref: 26,
				  image: 'modules/core/img/food/bread.png',
				  labels: [false,false,false,false,true,false] },

				{ name: 'Pasta Sauce',
				  uid: gen_id(),
				  food_ref: 22,
				  image: 'modules/core/img/food/sauce.png',
				  labels: [false,false,false,true,false,false] },

				{ name: 'Hamburger Buns',
				  uid: gen_id(),
				  food_ref: 27,
				  image: 'modules/core/img/food/hamburgerbuns.png',
				  labels: [false,false,false,false,true,false] },
				{ name: 'Hotdog Buns',
				  uid: gen_id(),
				  food_ref: 28,
				  image: 'modules/core/img/food/hotdogbuns.png',
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Spaghetti',
				  uid: gen_id(),
				  food_ref: 30,
				  image: 'modules/core/img/food/spaghetti.png',
				  labels: [false,false,false,false,true,false] },
				{ name: 'Pancake Mix',
				  uid: gen_id(),
				  food_ref: 31,
				  image: 'modules/core/img/food/pancakemix.png',
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Whiskey',
				  uid: gen_id(),
				  food_ref: 32,
				  image: 'modules/core/img/food/whiskey.png',
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Syrup',
				  uid: gen_id(),
				  food_ref: 33,
				  image: 'modules/core/img/food/syrup.png',
				  labels: [false,false,false,false,false,true] },	
				{ name: 'Sugar',
				  uid: gen_id(),
				  food_ref: 3,
				  image: 'modules/core/img/food/sugar.png',
				  labels: [false,false,false,false,false,true] }				  				  				  			  					  			  					  					  
			]}									
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Healthy','Gluten-Free','Soy-Free','Not Healthy','Alcoholic','Delicious'],	
		lists: [
			{ name: 'Breakfast',
			uid: gen_id(),
			cards: [
				{ name: 'Eggs and Bacon',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 0,
				  image: 'modules/core/img/recipes/eggsandbacon.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Strawberry Pancakes',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 1,
				  image: 'modules/core/img/recipes/strawberrypancakes.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Pancakes',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 2,
				  image: 'modules/core/img/recipes/pancakes.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Munchkin Delight',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 3,
				  image: 'modules/core/img/recipes/munchkin.png',
				  labels: [false,false,false,true,false,false] }			  				  
			]},
			{ name: 'Lunch',
			uid: gen_id(),
			cards: [
				{ name: 'Cheeseburger',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 4,
				  image: 'modules/core/img/recipes/cheeseburger.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Lobster Roll',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 8,
				  image: 'modules/core/img/recipes/lobsterroll.png',
				  labels: [false,false,false,true,false,true] },				  
				{ name: 'Hotdog',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 7,
				  image: 'modules/core/img/recipes/hotdog.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Grilled Cheese',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 9,
				  image: 'modules/core/img/recipes/grilledcheese.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Turkey Sandwich',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 6,
				  image: 'modules/core/img/recipes/turkeysandwich.png',
				  labels: [false,false,false,true,false,true] },				  
				{ name: 'Buttered Noodles',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 5,
				  image: 'modules/core/img/recipes/noodles.png',
				  labels: [false,false,false,true,false,true] },				  
				{ name: 'Salad',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 10,
				  image: 'modules/core/img/recipes/salad.png',
				  labels: [true,true,true,false,false,false] }				  				  
			]},
			{ name: 'Dinner',
			uid: gen_id(),
			cards: [
				{ name: 'Pasta',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 11,
				  image: 'modules/core/img/recipes/pasta.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Pizza!',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 16,
				  image: 'modules/core/img/recipes/pizza.png',
				  labels: [false,false,false,true,false,true] },	
				{ name: 'Lobster',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 14,
				  image: 'modules/core/img/recipes/lobster.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Surf and Turf',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 15,
				  image: 'modules/core/img/recipes/surfandturf.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Lobster Mac and Cheese',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 18,
				  image: 'modules/core/img/recipes/lobstermac.png',
				  labels: [false,false,false,true,false,true] },				  			  
				{ name: 'MEAN Cuisine',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 13,
				  image: 'modules/core/img/recipes/mean.png',
				  labels: [false,false,false,true,false,false] },
				{ name: 'Broccoli Casserole',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 12,
				  image: 'modules/core/img/recipes/broccolicasserole.png',
				  labels: [false,false,false,true,false,true] },

				{ name: 'Fancy Sauce',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 17,
				  image: 'modules/core/img/recipes/fancysauce.png',
				  labels: [false,false,false,true,false,true] }					  				  
			]},
			{ name: 'Drink',
			uid: gen_id(),
			cards: [
				{ name: 'Redbull and Vodka',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 19,
				  image: 'modules/core/img/recipes/redbullvodka.png',
				  labels: [false,false,false,true,true,true] },
				{ name: 'Orange Juice',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 20,
				  image: 'modules/core/img/recipes/orangejuice.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Banana Shake',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 21,
				  image: 'modules/core/img/recipes/bananashake.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Coke Float',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 22,
				  image: 'modules/core/img/recipes/cokefloat.png',
				  labels: [false,false,false,true,false,true] },
				{ name: 'Big Cup of Whiskey',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 23,
				  image: 'modules/core/img/recipes/whiskey.png',
				  labels: [false,false,false,true,true,true] },
				{ name: 'Beer!',
				  des: 'f',
				  uid: gen_id(),
				  recipe_ref: 24,
				  image: 'modules/core/img/recipes/beer.png',
				  labels: [false,false,false,true,true,true] }					  				  
			]},						
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Stock Options','Platinum','Gold','Silver','Copper','Bitcoin'],	
		lists: [
			{ name: 'Chores',
			uid: gen_id(),
			cards: [
				{ name: 'Use W,A,S,D to Move',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
			]}
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['The Favorite','The Smart One','The Oldest','The Underachiever','The Pretty One','Munchkin'],	
		lists: [
			{ name: 'Terrible. F.',
			uid: gen_id(),
			cards: [
				{ name: '"That\'s Great, Son"',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/1.jpg',
				  labels: [false,false,false,true,false,false] },
				{ name: '"That\'s Great, Sweetie"',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/3.jpg',
				  labels: [false,false,false,false,true,false] },				  
				{ name: '"That\'s Great, Son"',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/2.jpg',
				  labels: [false,false,false,true,false,false] },
				{ name: '"That\'s Great, Son"',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/4.jpg',
				  labels: [false,false,false,true,false,false] },
				{ name: '"That\'s Really Special, Munchkin, I\'m just putting it at the bottom so I always know where to find it."',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/5.jpg',
				  labels: [false,false,false,false,false,true] }				  				  				  				  
			]},
			{ name: 'Meh.',
			uid: gen_id(),
			cards: [
				{ name: '"That\'s Great, Son"',
				  uid: gen_id(),
				  image: 'modules/core/img/artwork/6.jpg',
				  labels: [false,true,false,false,false,false] }			  				  				  				  
			]},
			{ name: 'Actually Good',
			uid: gen_id(),
			cards: []}			
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: false,
		label_names: ['Shouldn\'t','You','Be','Playing','The','Game?'],	
		lists: [
			{ name: 'Pills',
			uid: gen_id(),
			cards: [
				{ name: 'Use W,A,S,D to Move',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
			]}
		], user:user_id
	};
	insert_boards.push(user_board);

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: false,
		label_names: ['Shouldn\'t','You','Be','Playing','The','Game?'],	
		lists: [
			{ name: 'Homework',
			uid: gen_id(),
			cards: [
				{ name: 'Use W,A,S,D to Move',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
			]}
		], user:user_id
	};
	insert_boards.push(user_board);		

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: true,
		label_names: ['Stock Options','Platinum','Gold','Silver','Copper','Bitcoin'],	
		lists: [
			{ name: 'Tips',
			uid: gen_id(),
			cards: [
				{ name: 'Welcome to Wello!  This is an automated board that will keep track of things you should do on your Fridge.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },
				{ name: 'If you signed in with Trello, Wello has magically imported your boards.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },
				{ name: 'Click on cards with this book icon for more info.',
				  des: 'Sometimes the extra information isn\'t too useful though.',
				  uid: gen_id(),
				  labels: [false,false,false,false,false,false] },				  
				{ name: 'This is Munchkin, Wello\'s "loveable" mascot.',
				  des: 'Munchkin is Wello\'s unfortunate mascot...  Wello\'s unfortunate and very obese mascot.  She will arrive occasionally to ruin everything you are working on.',
				  uid: gen_id(),
				  munchkined: true,
				  image: 'modules/core/img/munchkin.png',
				  labels: [false,false,false,false,false,false] }				  
			]},
			{ name: 'The Basics',
			uid: gen_id(),
			cards: [
				{ name: 'Hire Brad.',
				  uid: gen_id(),
				  achievement_ref: 7,
				  labels: [false,true,false,false,false,false] },
				{ name: 'Meet Munchkin by clicking on her card.',
				  uid: gen_id(),
				  achievement_ref: 0,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Visit a board imported from Trello.',
				  des: 'Requires logging in with your Trello account',
				  uid: gen_id(),
				  achievement_ref: 8,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Use Chrome for the best experience.',
				  des: 'Actually applying might be a better idea than spending more time optimizing animation-heavy ridiculousness for all the browsers.',
				  uid: gen_id(),
				  achievement_ref: 49,
				  labels: [false,false,false,false,true,false] },					  				  
				{ name: 'Create a new Wello board.',
				  uid: gen_id(),
				  achievement_ref: 10,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Create a new Wello list.',
				  des: 'You cannot perform this action on any special board since lists there are locked.',
				  uid: gen_id(),
				  achievement_ref: 48,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Create a new Wello card.',
				  des: 'You cannot perform this action on any special board since cards there are locked.',
				  uid: gen_id(),
				  achievement_ref: 47,
				  labels: [false,false,false,false,true,false] },					  				  				  
				{ name: 'Move a card between lists on a Wello board.',
				  des: 'Locked cards cannot be moved.  Special boards have all of their cards locked.',
				  uid: gen_id(),
				  achievement_ref: 6,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Move a list on a Wello board.',
				  des: 'Grab the header or footer a list to slide it.  This cannot be done on locked lists.  Special boards have all of their lists locked.',
				  uid: gen_id(),
				  achievement_ref: 46,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Apply a text or label filter.',
				  uid: gen_id(),
				  achievement_ref: 9,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Apply or remove a label.',
				  uid: gen_id(),
				  achievement_ref: 40,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Edit the name of a label.',
				  des: 'This action cannot be performed on special boards.',
				  uid: gen_id(),
				  achievement_ref: 53,
				  labels: [false,false,false,false,true,false] },				  
				{ name: 'Rename a card.',
				  des: 'First you have to click on a card to open it and then on the name of the card to open the edit dialog.  This will not work on locked cards.',
				  uid: gen_id(),
				  achievement_ref: 41,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Change the description on a card.',
				  des: 'First you have to click on a card to open it and then on the description to open the edit dialog.  This will not work on locked cards.',
				  uid: gen_id(),
				  achievement_ref: 42,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Rename a list.',
				  des: 'Click on a list title to open the edit dialog.  This will not work on locked lists.',
				  uid: gen_id(),
				  achievement_ref: 43,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Rename a board.',
				  des: 'Click on an open board icon to open the edit dialog.',
				  uid: gen_id(),
				  achievement_ref: 44,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Delete something.',
				  des: 'Delete a card, list, or board (preferably a list since it has the best animation).  You\'re smart, I\'m sure you\'ll figure it out',
				  uid: gen_id(),
				  achievement_ref: 45,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Favorite a Board.',
				  des: 'Click the star in the corner of a board to toggle its status as a favorite',
				  uid: gen_id(),
				  achievement_ref: 50,
				  labels: [false,false,false,false,true,false] }	   			  
			]},
			{ name: 'Exploration',
			uid: gen_id(),
			cards: [			  				  
				{ name: 'Open the freezer by clicking the handle.',
				  uid: gen_id(),
				  achievement_ref: 30,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Open the fridge by clicking the handle.',
				  uid: gen_id(),
				  achievement_ref: 32,
				  labels: [false,false,false,false,true,false] },				  
				{ name: 'Visit Brad\'s Resume Board.',
				  uid: gen_id(),
				  achievement_ref: 18,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Visit Brad\'s Portfolio Board.',
				  uid: gen_id(),
				  achievement_ref: 19,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Visit the Food Board.',
				  uid: gen_id(),
				  achievement_ref: 20,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Visit the Recipe Board.',
				  uid: gen_id(),
				  achievement_ref: 21,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Visit the Children\'s Art Board.',
				  uid: gen_id(),
				  achievement_ref: 23,
				  labels: [false,false,false,false,true,false] },					  
				{ name: '3D-Print a food item.',
				  des: 'This can be done on the food board or by clicking on a recipe and then the print button on an ingredient.  Food is digitally transmitted between all of your Wello devices.',
				  uid: gen_id(),
				  achievement_ref: 24,
				  labels: [false,false,false,false,true,false] },		
				{ name: 'View a Recipe by clicking it.',
				  uid: gen_id(),
				  achievement_ref: 22,
				  labels: [false,false,false,false,true,false] },	
				{ name: 'Prepare a meal.',
				  des: 'This can be done on the recipe board if you have the proper ingredients in your fridge.',
				  uid: gen_id(),
				  achievement_ref: 25,
				  labels: [false,false,false,false,true,false] },					  				  				  			  			  
				{ name: 'Play Wello Snake.',
				  des: 'To access Wello Snake, click the snake icon on the fun bar that is in the upper right corner of your Wello Fridge.',
				  uid: gen_id(),
				  achievement_ref: 13,
				  labels: [false,false,false,false,true,false] },
				{ name: 'Throw a sweet party.',
				  des: 'To throw a party, click the disco ball icon on the fun bar that is in the upper right corner of your Wello Fridge.',
				  uid: gen_id(),
				  achievement_ref: 17,
				  labels: [false,false,false,false,true,false] },				  				  				  
				{ name: 'Prepare a tasty snack for Munchkin.',
				  des: 'To prepare a snack, click the cheeseburger icon on the fun bar that is in the upper right corner of your Wello Fridge.',
				  uid: gen_id(),
				  achievement_ref: 2,
				  labels: [false,false,false,false,true,false] },				  				  				  
				{ name: 'Load pleasant weather for a new city with CatWeather.',
				  des: 'To load weather for a city, click the zipcode listed on the widget and change the value to the city that you want.',		
				  uid: gen_id(),
				  achievement_ref: 37,
				  labels: [false,false,false,false,true,false] },				  				  				  
				{ name: 'Load lousy weather for a new city with CatWeather.',
				  des: 'To load weather for a city, click the zipcode listed on the widget and change the value to the city that you want.',
				  uid: gen_id(),
				  achievement_ref: 38,
				  labels: [false,false,false,false,true,false] }				  			  
			]},			
			{ name: 'Challenges',
			uid: gen_id(),
			cards: [
				{ name: 'Have Munchkin appear without food being involved.',
				  des: 'Maybe you should start creating cards and see what happens.',
				  uid: gen_id(),
				  achievement_ref: 12,
				  labels: [false,false,false,true,false,false] },
				{ name: 'Attempt to move a card that cannot be moved at all.',
				  des: 'You can\'t move any cards between locked lists, but you can move them up or down on the same list so those do not count for this achievement.',
				  uid: gen_id(),
				  achievement_ref: 39,
				  labels: [false,false,false,true,false,false] },				  
				{ name: 'Create 30 cards.',
				  uid: gen_id(),
				  achievement_ref: 26,
				  labels: [false,false,false,true,false,false] },	
				{ name: 'Hit the maximum number of cards for a board.',
				  des: 'The limit has absolutely nothing to do with overuse of Angular dirty-checking and animation, Wello assures you.',
				  uid: gen_id(),
				  achievement_ref: 54,
				  labels: [false,false,false,true,false,false] },					  				  
				{ name: 'Feed Munchkin over 30 times.',
				  uid: gen_id(),
				  achievement_ref: 1,
				  labels: [false,false,false,true,false,false] },
				{ name: 'Get food past Munchkin.',
				  des: 'Munchkin can only hold 5 items at once.  Also, salad doesn\'t count as food.',
				  uid: gen_id(),
				  achievement_ref: 29,
				  labels: [false,false,false,true,false,false] },	
				{ name: 'Find the one food that Munchkin won\'t eat.',
				  uid: gen_id(),
				  achievement_ref: 31,
				  labels: [false,false,false,true,false,false] },					  			  
				{ name: 'Make Munchkin pass out.',
				  des: 'Why don\'t you filter by "alcoholic" on the recipe board?',
				  uid: gen_id(),
				  achievement_ref: 28,
				  labels: [false,false,false,true,false,false] },				  	
				{ name: 'Play Wello Snake 10 times.',
				  uid: gen_id(),
				  achievement_ref: 15,
				  labels: [false,false,false,true,false,false] },
				{ name: 'Get to level 10 in Wello Snake.',
				  uid: gen_id(),
				  achievement_ref: 14,
				  labels: [false,false,false,true,false,false] },	
				{ name: 'Host a terrible party.',
				  des: 'Wouldn\'t it be horrible if no lists showed up?',
				  uid: gen_id(),
				  achievement_ref: 51,
				  labels: [false,false,false,true,false,false] },				  			  			  
				{ name: 'Complete the ALS Challenge.',
				  des: 'You will need to explore the Wello Fridge DX to find it.  If the Wello Fridge DX is sold out, then you will have to wait for another to be produced first.',
				  uid: gen_id(),
				  achievement_ref: 5,
				  labels: [false,false,false,true,false,false] },
				{ name: 'Have over 500 of the same food item.',
				  uid: gen_id(),
				  achievement_ref: 4,
				  labels: [false,false,false,true,false,false] },	
				{ name: 'Visit a truncated board.',
				  des: 'Wello imports at most 60 cards for any single Trello board and 20 images total.  A board is considered truncated if it contained more than 60 cards on Trello or if Wello skipped over downloading images from Trello.',
				  uid: gen_id(),
				  achievement_ref: 27,
				  labels: [false,false,false,true,false,false] },	
				{ name: 'Load weather at a zipcode belonging to the greatest city.',
				  uid: gen_id(),
				  achievement_ref: 36,
				  labels: [false,false,false,true,false,false] },		  
				{ name: 'Load weather for a non-US city.',
				  uid: gen_id(),
				  achievement_ref: 52,
				  labels: [false,false,true,false,false,false] },
				{ name: 'Load weather in Space.',
				  des: 'Try some other-wordly zipcodes.',
				  uid: gen_id(),
				  achievement_ref: 35,
				  labels: [false,false,true,false,false,false] },
				{ name: 'Load weather at a zipcode where it\'s over 100 degrees.',
				  uid: gen_id(),
				  achievement_ref: 33,
				  labels: [false,false,true,false,false,false] },	
				{ name: 'Load glorious weather.',
				  des: '72 and sunny',
				  uid: gen_id(),
				  achievement_ref: 34,
				  labels: [false,false,true,false,false,false] },			  				  			  			  
				{ name: 'Have Munchkin hold 4 different lobster dishes at once.',
				  uid: gen_id(),
				  achievement_ref: 3,
				  labels: [false,false,true,false,false,false] },
				{ name: 'Have Munchkin hold pizza, a hotdog, a cheeseburger, and a beer at once.',
				  uid: gen_id(),
				  achievement_ref: 11,
				  labels: [false,false,true,false,false,false] },
				{ name: 'Get to level 20 in Wello Snake.',
				  uid: gen_id(),
				  achievement_ref: 16,
				  labels: [false,true,false,false,false,false] }				  	
			]},
			{ name: 'Unlocked Achievements',
			uid: gen_id(),
			cards: []}			
		], user:user_id
	};
	insert_boards.push(user_board);			

	user_board = {
		labels_locked: true,
		lists_locked: true, // cannot add/remove, reorder, or edit lists
		cards_locked: true, // cannot add/remove or edit cards or move them between lists
		card_labels_locked: false,
		label_names: ['Shouldn\'t','You','Be','Playing','The','Game?'],	
		lists: [
			{ name: 'Wello Snake',
			uid: gen_id(),
			cards: [
				{ name: 'Use W,A,S,D to Move',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Collect Wello Candy',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Have Wello Fun',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'Keep questions about the disgusting amount of ng-dirty-checking to yourself',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'template',
				  template: 'cur_score',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] },
				{ name: 'template',
				  template: 'top_score',
				  uid: gen_id(),
				  labels: [true,true,true,true,true,true] }
			]}
		], user:user_id
	};
	insert_boards.push(user_board);	
	return insert_boards;
};