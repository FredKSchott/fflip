/**
 * @fileoverview These tests exist to test old functionality and deprecated method
 * signatures that are still supported. If these are breaking and cannot be easily
 * fixed, they can be removed across major versions.
 */

'use strict';


//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
var assert = require('assert');
var fflip = require('../lib/fflip');


//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

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
	features: {
		fEmpty: {},
		fOpen: {
			name: 'fOpen',
			description: 'true for all users',
			criteria: {
				c1: true
			}
		},
		fClosed: {
			criteria: {
				c1: false
			}
		},
		fEval: {
			criteria: {
				c2: 'abc'
			}
		}
	},
	reload: 0
};

var userABC = {
	flag: 'abc'
};
var userXYZ = {
	flag: 'xyz'
};


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe('fflip (deprecated)', function(){

	beforeEach(function() {
		fflip.config(configData);
	})

	describe('userHasFeature()', function(){

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return null if features does not exist', function(){
			assert.equal(null, fflip.userHasFeature(userABC, 'notafeature'));
		});

		it('should return false if no criteria set', function(){
			assert.equal(false, fflip.userHasFeature(userABC, 'fEmpty'));
		});

		it('should return false if all feature critieria evaluates to false', function(){
			assert.equal(false, fflip.userHasFeature(userABC, 'fClosed'));
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEval'));
		});

		it('should return true if one feature critieria evaluates to true', function(){
			assert.equal(true, fflip.userHasFeature(userABC, 'fOpen'));
			assert.equal(true, fflip.userHasFeature(userABC, 'fEval'));
		});

	});

	describe('userFeatures()', function(){

		it('userFeatures() is equivilent to getFeaturesForUser()', function() {
			assert.deepEqual(fflip.userFeatures(userABC), fflip.getFeaturesForUser(userABC));
		});

	});

	describe('express support', function(){

		it('throws error when called', function() {
			assert.throws(function() { fflip.express_middleware(); }, /fflip: Express support is no longer bundled/);
			assert.throws(function() { fflip.expressMiddleware(); }, /fflip: Express support is no longer bundled/);
			assert.throws(function() { fflip.express_route(); }, /fflip: Express support is no longer bundled/);
			assert.throws(function() { fflip.expressRoute(); }, /fflip: Express support is no longer bundled/);
			assert.throws(function() { fflip.express(); }, /fflip: Express support is no longer bundled/);
		});

	});

});
