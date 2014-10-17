'use strict';

/**
 * Board Model Unit Tests
 */

// Module dependencies.
var should = require('should'),
	mongoose = require('mongoose'),
	Board = mongoose.model('Board'),
	usr = require('../controllers/users');

// Unit Tests
describe('Board Model Unit Tests:', function() {
	var board;
	before(function(done) {
		board = new Board({
			lists_locked: false, 
			cards_locked: false,
			labels_locked: false,
			card_labels_locked: false,
			label_names: ['Label 1','Label 2'],
			num_cards: 2,
			lists: [{
				uid: usr.gen_id(),
				name: 'List 1',
				cards: [{
					uid: usr.gen_id(),			
					name: 'Card 1',
					labels: [false,false],
					des: 'Description',
					image: '',
					munchkined: false,
					food_ref: 1,
					recipe_ref: 1,
					achievement_ref: 1
				}]
			},{
				uid: usr.gen_id(),
				name: 'List 2',
				cards: [{
					uid: usr.gen_id(),			
					name: 'Card 2',
					labels: [false,false],
					des: 'Description',
					image: '',
					munchkined: false,
					food_ref: 1,
					recipe_ref: 1,
					achievement_ref: 1
				}]
			}],		
		});
		done();
	});

	describe('Method Save', function() {
		it('should begin with no boards', function(done) {
			Board.find({}, function(err, boards) {
				boards.should.have.length(0);
				done();
			});
		});

		it('should be able to save without problems', function(done) {
			board.save(done);
		});

		it('should be able to find the newly created board and see that it has 2 cards', function(done) {
			Board.findOne({}).exec(function(err, board) {
				should.equal(2,board.num_cards);
				done();
			});
		});

		it('should be able to show an error when try to save without a missing list uid', function(done) {
			board.lists[0].uid = '';
			return board.save(function(err) {
				should.exist(err);
				done();
			});
		});

		it('should be able to show an error when try to save with a missing card uid', function(done) {
			board.lists[0].uid = usr.gen_id();
			board.lists[0].cards[0].uid = ''
			return board.save(function(err) {
				should.exist(err);
				done();
			});
		});

	});

	after(function(done) {
		Board.remove().exec();
		done();
	});
});