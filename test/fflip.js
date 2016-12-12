'use strict';

var Promise = global.Promise;

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
var assert = require('assert'),
	sinon = require('sinon');

require('mocha-as-promised')();

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------
function isObjectEmpty(obj) {
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
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

var asyncConfigData = {
	criteria: [
		{
			id: 'c1',
			check: function(user, bool) {
				return Promise.resolve(bool);
			}
		},
		{
			id: 'c2',
			check: function(user, flag) {
				return Promise.resolve(user.flag == flag);
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
}

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
				callback(configData.features);
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
		it('should be called every X seconds where X = reloadRate', function(done) {
			this.timeout(205);
			var loadAsyncronously = function(callback) {
				callback({});
				done();
			};
			fflip.config({features: loadAsyncronously, reload: 0.2, criteria: configData.criteria});
		});

		it('should update features', function(done){
			this.timeout(100);
			var testReady = false;
			var loadAsyncronously = function(callback) {
				callback({});
				if(testReady)
					done();
			};
			fflip.config({features: loadAsyncronously, criteria: configData.criteria});
			testReady = true;
			fflip.reload();
		});
	});

	describe('isFeatureEnabledForUserSync()', function() {
		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return null if features does not exist', function(){
			assert.equal(null, fflip.isFeatureEnabledForUserSync('notafeature', userABC));
		});

		it('should return false if no criteria set', function(){
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEmpty', userABC));
		});

		// TODO(fks) 03-14-2016: (Edge Case) Test that an empty criteria object disables a feature

		it('should return false if all feature criteria evaluates to false', function(){
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fClosed', userABC));
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEval', userXYZ));
		});

		it('should return false if one feature criteria evaluates to true and the other evaluates to false', function(){
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEval', userXYZ));
		});

		it('should return true if all feature criteria evaluates to true', function(){
			assert.equal(true, fflip.isFeatureEnabledForUserSync('fEval', userABC));
		});

		it('should return false if zero feature criteria evaluates to true', function(){
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEvalOr', userXYZ));
		});

		it('should return true if one feature criteria evaluates to true', function(){
			assert.equal(true, fflip.isFeatureEnabledForUserSync('fEvalOr', userABC));
		});

		it('should handle nested arrays', function(){
			assert.equal(true, fflip.isFeatureEnabledForUserSync('fEvalComplex', userABC));
			assert.equal(true, fflip.isFeatureEnabledForUserSync('fEvalComplex', userEFG));
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEvalComplex', userXYZ));
		});

		it('should handle the $veto property', function(){
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEvalVeto', userABC));
			assert.equal(true, fflip.isFeatureEnabledForUserSync('fEvalVeto', userEFG));
			assert.equal(false, fflip.isFeatureEnabledForUserSync('fEvalVeto', userXYZ));
		});

		it('should error out if there are async criteria', function() {
			fflip.config(asyncConfigData);
			assert.throws(function () {
				fflip.isFeatureEnabledForUserSync('fClosed', userABC);
			}, new RegExp('asynchronous.+c1'));
		});
	});

	describe('isFeatureEnabledForUser()', function() {
		beforeEach(function() {
			fflip.config(asyncConfigData);
		});

		it('should return null if features does not exist', function(){
			return fflip.isFeatureEnabledForUser('notafeature', userABC)
				.then(function(res) {
					assert.equal(null, res);
				});
		});

		it('should return false if no criteria set', function(){
			return fflip.isFeatureEnabledForUser('fEmpty', userABC)
				.then(function(res) {
					assert.equal(false, res);
				});
		});

		// TODO(fks) 03-14-2016: (Edge Case) Test that an empty criteria object disables a feature

		it('should return false if all feature criteria evaluates to false', function(){
			return Promise.all([
				fflip.isFeatureEnabledForUser('fClosed', userABC),
				fflip.isFeatureEnabledForUser('fEval', userXYZ)
			])
			.then(function(results) {
				assert.deepEqual([false, false], results);
			});
		});

		it('should return false if one feature criteria evaluates to true and the other evaluates to false', function(){
			return fflip.isFeatureEnabledForUser('fEval', userXYZ)
				.then(function(res) {
					assert.equal(false, res);
				});
		});

		it('should return true if all feature criteria evaluates to true', function(){
			return fflip.isFeatureEnabledForUser('fEval', userABC)
				.then(function(res) {
					assert.equal(true, res);
				});
		});

		it('should return false if zero feature criteria evaluates to true', function(){
			return fflip.isFeatureEnabledForUser('fEvalOr', userXYZ)
				.then(function(res) {
					assert.equal(false, res);
				});
		});

		it('should return true if one feature criteria evaluates to true', function(){
			return fflip.isFeatureEnabledForUser('fEvalOr', userABC)
				.then(function(res) {
					assert.equal(true, res);
				});
		});

		it('should handle nested arrays', function(){
			return Promise.all([
				fflip.isFeatureEnabledForUser('fEvalComplex', userABC),
				fflip.isFeatureEnabledForUser('fEvalComplex', userEFG),
				fflip.isFeatureEnabledForUser('fEvalComplex', userXYZ),
			])
			.then(function(results) {
				assert.deepEqual([true, true, false], results);
			})
		});

		it('should handle the $veto property', function(){
			return Promise.all([
				fflip.isFeatureEnabledForUser('fEvalVeto', userABC),
				fflip.isFeatureEnabledForUser('fEvalVeto', userEFG),
				fflip.isFeatureEnabledForUser('fEvalVeto', userXYZ),
			])
			.then(function(results) {
				assert.deepEqual([false, true, false], results);
			});
		});

		it('should still work if there are no async criteria', function() {
			fflip.config(configData);
			return fflip.isFeatureEnabledForUser('fClosed', userABC)
				.then(function(res) {
					assert.equal(false, res);
				});
		});
	});

	describe('getFeaturesForUserSync()', function(){
		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return an object of features for a user', function(){
			var featuresABC = fflip.getFeaturesForUserSync(userABC);
			assert.deepEqual(featuresABC, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: true,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: false
			});

			var featuresEFG = fflip.getFeaturesForUserSync(userEFG);
			assert.deepEqual(featuresEFG, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: false,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: true
			});

			var featuresXYZ = fflip.getFeaturesForUserSync(userXYZ);
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
			var featuresXYZ = fflip.getFeaturesForUserSync(userXYZ);
			assert.equal(featuresXYZ.fEval, false);
			featuresXYZ = fflip.getFeaturesForUserSync(userXYZ, {fEval: true});
			assert.equal(featuresXYZ.fEval, true);
		});

		it('should error out if there are async criteria', function() {
			fflip.config(asyncConfigData);
			assert.throws(function () {
				fflip.getFeaturesForUserSync(userXYZ);
			}, new RegExp('asynchronous.+c1'));
		});
	});

	describe('getFeaturesForUser()', function(){
		beforeEach(function() {
			fflip.config(asyncConfigData);
		});

		it('should return an object of features for a user', function(){
			return Promise.all([
				fflip.getFeaturesForUser(userABC),
				fflip.getFeaturesForUser(userEFG),
				fflip.getFeaturesForUser(userXYZ)
			])
			.then(function(features) {
				var featuresABC = features[0];
				var featuresEFG = features[1];
				var featuresXYZ = features[2];

				assert.deepEqual(featuresABC, {
					fEmpty: false,
					fOpen: true,
					fClosed: false,
					fEval: true,
					fEvalOr: true,
					fEvalComplex: true,
					fEvalVeto: false
				});

				assert.deepEqual(featuresEFG, {
					fEmpty: false,
					fOpen: true,
					fClosed: false,
					fEval: false,
					fEvalOr: true,
					fEvalComplex: true,
					fEvalVeto: true
				});

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
		});

		it('should overwrite values when flags are set', function() {
			return Promise.all([
				fflip.getFeaturesForUser(userXYZ),
				fflip.getFeaturesForUser(userXYZ, { fEval: true })
			])
			.then(function(features) {
				assert.equal(features[0].fEval, false);
				assert.equal(features[1].fEval, true);
			});
		});

		it('should still work for sync criteria', function() {
			fflip.config(configData);
			return fflip.getFeaturesForUser(userXYZ)
				.then(function(featuresXYZ) {
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
		});
	});
});
