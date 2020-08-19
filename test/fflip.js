'use strict';


//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
var assert = require('assert'),
	sinon = require('sinon');


//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------
function isObjectEmpty(obj) {
	for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

var sandbox = sinon.sandbox.create();
var fflip = require('../lib/fflip');

var configData = {
	criteria: [
		{
			id: 'c1',
			check: function(user, bool) {
				return bool;
			}
		},
		{
			id: 'c2',
			check: function(user, flag) {
				return user.flag == flag;
			}
		}
	],
	features: [
		{
			id: 'fEmpty'
		},
		{
			id: 'fOpen',
			name: 'fOpen',
			description: 'true for all users',
			criteria: {
				c1: true
			}
		},
		{
			id: 'fClosed',
			criteria: {
				c1: false
			}
		},
		{
			id: 'fEval',
			criteria: {
				c1: true,
				c2: 'abc'
			}
		},
		{
			id: 'fEvalOr',
			criteria: [
				{c1: false},
				{c2: 'abc'},
				{c2: 'efg'}
			]
		},
		{
			id: 'fEvalComplex',
			criteria: [
				{c1: false, c2: 'abc'},
				{c1: true, c2: 'abc'},
				[{c1: false, c2: 'xyz'}, {c1: true, c2: 'efg'}]
			]
		},
		{
			id: 'fEvalVeto',
			criteria: [
				{c1: false},
				{c2: 'abc'},
				{c2: 'efg', $veto: true}
			]
		}
	],
	reload: 0
};

var userABC = {
	flag: 'abc'
};
var userEFG = {
	flag: 'efg'
};
var userXYZ = {
	flag: 'xyz'
};


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
describe('fflip', function(){

	afterEach(function(){
		sandbox.verifyAndRestore();
	});

	describe('config()', function(){

		it('should set features if given static feature array', function(){
			fflip.features = {};
			fflip.config(configData);
			assert.deepEqual(fflip.features, {
				fEmpty: configData.features[0],
				fOpen: configData.features[1],
				fClosed: configData.features[2],
				fEval: configData.features[3],
				fEvalOr: configData.features[4],
				fEvalComplex: configData.features[5],
				fEvalVeto: configData.features[6]
			});
		});

		it('should set features if given a syncronous loading function', function(){
			var loadSyncronously = function() {
				return configData.features;
			};
			fflip.features = {};
			fflip.config({features: loadSyncronously, criteria: configData.criteria});
			assert.deepEqual(fflip.features, {
				fEmpty: configData.features[0],
				fOpen: configData.features[1],
				fClosed: configData.features[2],
				fEval: configData.features[3],
				fEvalOr: configData.features[4],
				fEvalComplex: configData.features[5],
				fEvalVeto: configData.features[6]
			});
		});

		it('should set features if given an asyncronous loading function', function(done){
			var loadAsyncronously = function(callback) {
				callback(undefined, configData.features);
				assert.deepEqual(fflip.features, {
					fEmpty: configData.features[0],
					fOpen: configData.features[1],
					fClosed: configData.features[2],
					fEval: configData.features[3],
					fEvalOr: configData.features[4],
					fEvalComplex: configData.features[5],
					fEvalVeto: configData.features[6]
				});
				done();
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria});
		});

		it('should invoke the callback after asynchronous features have been loaded', function(done){
			var loadAsyncronously = function(callback) {
				callback(undefined, configData.features);
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria}, function(err) {
				assert.equal(err, undefined);
				assert.deepEqual(fflip.features, {
					fEmpty: configData.features[0],
					fOpen: configData.features[1],
					fClosed: configData.features[2],
					fEval: configData.features[3],
					fEvalOr: configData.features[4],
					fEvalComplex: configData.features[5],
					fEvalVeto: configData.features[6]
				});
				done();
			});
		});

		it('should invoke the callback after asynchronous features have failed', function(done){
			var error = new Error();
			var loadAsyncronously = function(callback) {
				callback(error);
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria}, function(err) {
				assert.equal(err, error);
				done();
			});
		});

		it('should set criteria if given static criteria array', function(){
			fflip.criteria = {};
			fflip.config(configData);
			assert.deepEqual(fflip.criteria, {
				c1: configData.criteria[0],
				c2: configData.criteria[1]
			});
		});

		it('should set reloadRate if given reload', function(){
			fflip._reloadRate = 0;
			fflip.config(configData);
			assert.equal(configData.reload*1000, fflip._reloadRate);
		});

	});

	describe('reload()', function() {

		beforeEach(function() {

		});

		it('should be called every X seconds where X = reloadRate', function(done) {
			this.timeout(205);
			var loadAsyncronously = function(callback) {
				callback(undefined, {});
				done();
			};
			fflip.config({features: loadAsyncronously, reload: 0.2, criteria: configData.criteria});
		});

		it('should update features', function(done){
			this.timeout(100);
			var testReady = false;
			var loadAsyncronously = function(callback) {
				callback(undefined, {});
				if(testReady)
					done();
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria});
			testReady = true;
			fflip.reload();
		});

		it('should invoke the callback after asynchronous features have been loaded', function(done) {
			this.timeout(100);
			var loadAsyncronously = function(callback) {
				callback(undefined, {});
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria});
			fflip.reload(function(err) {
				assert.equal(err, undefined);
				done();
			});
		});

		it('should invoke the callback after asynchronous features have failed', function(done) {
			this.timeout(100);
			var error = new Error();
			var testReady = false;
			var loadAsyncronously = function(callback) {
				callback(testReady ? error : undefined, {});
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria});
			testReady = true;
			fflip.reload(function(err) {
				assert.equal(err, error);
				done();
			});
		});

	});

	describe('isFeatureEnabledForUser()', function() {

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return null if features does not exist', function(){
			assert.equal(null, fflip.isFeatureEnabledForUser('notafeature', userABC));
		});

		it('should return false if no criteria set', function(){
			assert.equal(false, fflip.isFeatureEnabledForUser('fEmpty', userABC));
		});

		// TODO(fks) 03-14-2016: (Edge Case) Test that an empty criteria object disables a feature

		it('should return false if all feature critieria evaluates to false', function(){
			assert.equal(false, fflip.isFeatureEnabledForUser('fClosed', userABC));
			assert.equal(false, fflip.isFeatureEnabledForUser('fEval', userXYZ));
		});

		it('should return false if one feature critieria evaluates to true and the other evaluates to false', function(){
			assert.equal(false, fflip.isFeatureEnabledForUser('fEval', userXYZ));
		});

		it('should return true if all feature critieria evaluates to true', function(){
			assert.equal(true, fflip.isFeatureEnabledForUser('fEval', userABC));
		});

		it('should return false if zero feature critieria evaluates to true', function(){
			assert.equal(false, fflip.isFeatureEnabledForUser('fEvalOr', userXYZ));
		});

		it('should return true if one feature critieria evaluates to true', function(){
			assert.equal(true, fflip.isFeatureEnabledForUser('fEvalOr', userABC));
		});

		it('should handle nested arrays', function(){
			assert.equal(true, fflip.isFeatureEnabledForUser('fEvalComplex', userABC));
			assert.equal(true, fflip.isFeatureEnabledForUser('fEvalComplex', userEFG));
			assert.equal(false, fflip.isFeatureEnabledForUser('fEvalComplex', userXYZ));
		});

		it('should handle the $veto property', function(){
			assert.equal(false, fflip.isFeatureEnabledForUser('fEvalVeto', userABC));
			assert.equal(true, fflip.isFeatureEnabledForUser('fEvalVeto', userEFG));
			assert.equal(false, fflip.isFeatureEnabledForUser('fEvalVeto', userXYZ));
		});


	});

	describe('getFeaturesForUser()', function(){

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return an object of features for a user', function(){
			var featuresABC = fflip.getFeaturesForUser(userABC);
			assert.deepEqual(featuresABC, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: true,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: false
			});

			var featuresEFG = fflip.getFeaturesForUser(userEFG);
			assert.deepEqual(featuresEFG, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: false,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: true
			});

			var featuresXYZ = fflip.getFeaturesForUser(userXYZ);
			assert.deepEqual(featuresXYZ, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: false,
				fEvalOr: false,
				fEvalComplex: false,
				fEvalVeto: false
			});
		});

		it('should overwrite values when flags are set', function() {
			var featuresXYZ = fflip.getFeaturesForUser(userXYZ);
			assert.equal(featuresXYZ.fEval, false);
			featuresXYZ = fflip.getFeaturesForUser(userXYZ, {fEval: true});
			assert.equal(featuresXYZ.fEval, true);
		});

	});

});
