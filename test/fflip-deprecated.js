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
	criteria: {
		c1: function(user, bool) {
			return bool;
		},
		c2: function(user, flag) {
			return user.flag == flag;
		}
	},
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

	describe('express integration', function(){

		it('express_middleware() still exists for v2.x backwards compatibility', function() {
			assert(fflip.express_middleware);
		});

		it('express_route() still exists for v2.x backwards compatibility', function() {
			assert(fflip.express_route);
		});

	});

});
