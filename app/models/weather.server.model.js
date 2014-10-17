'use strict';

/**
 * ######## Weather Model ###########
 * Stores API responses from Google API and Open Weather Map.
 * Before making a new API request, this collection is checked for a recent-enough entry.
 */

// Module Dependencies.
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Schema
var WeatherSchema = new Schema({
	zip: {
		type: String,
		required: true
	}, 	
	state: {
		type: String
	}, 	
	city: {
		type: String
	}, 		
	country: {
		type: String
	},
	temp: {
		type: Number
	}, 	
	icon: {
		type: String
	},
	condition: {
		type: String
	},
	weather_id: {
		type: Number
	},
	weather_des: {
		type: String
	},
	updated: {
		type: Date
	}
});

mongoose.model('Weather', WeatherSchema);