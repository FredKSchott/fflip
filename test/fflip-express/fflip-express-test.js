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
var fflip = require('../../lib/fflip');
var FFlipExpressIntegration = require('../../lib/fflip-express/fflip-express');

var customizationOptions = {
	cookieName: 'CUSTOM_COOKIE_NAME',
	routeParamForName: 'CUSTOM_NAME_PARAM',
	routeParamForAction: 'CUSTOM_ACTION_PARAM',
	cookieMaxAge: 123456789
};

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
describe('fflip-express', function(){

	beforeEach(function() {
		fflip.config(configData);
	});

	afterEach(function(){
		sandbox.verifyAndRestore();
	});

	describe('configuration', function() {

		it('should set option defaults properly when no user-defined options are passed', function() {
			var expressIntegration = new FFlipExpressIntegration(fflip);
			assert.deepEqual(expressIntegration.options, {
				cookieName: 'fflip',
				routeParamForName: 'name',
				routeParamForAction: 'action',
				cookieMaxAge: 900000
			});
		});

		it('should override option defaults properly when user-defined options are passed', function() {
			var expressIntegration = new FFlipExpressIntegration(fflip, customizationOptions);
			assert.deepEqual(expressIntegration.options, {
				cookieName: 'CUSTOM_COOKIE_NAME',
				routeParamForName: 'CUSTOM_NAME_PARAM',
				routeParamForAction: 'CUSTOM_ACTION_PARAM',
				cookieMaxAge: 123456789
			});
		});

		it('should generate all expected routes and middleware', function() {
			var expressIntegration = new FFlipExpressIntegration(fflip);
			assert.equal(typeof expressIntegration.middleware, 'function');
			assert.equal(expressIntegration.middleware.length, 3);
			assert.equal(typeof expressIntegration.manualRoute, 'function');
			assert.equal(expressIntegration.manualRoute.length, 3);
		});

	});

	describe('.middleware', function(){

		var expressIntegration,
			reqMock,
			resMock,
			renderOriginalSpy;

		beforeEach(function() {
			expressIntegration = new FFlipExpressIntegration(fflip, customizationOptions);

			reqMock = {
				cookies: {}
			};
			reqMock.cookies[customizationOptions.cookieName] = {fClosed: true};
			renderOriginalSpy = sandbox.spy();
			resMock = {
				render: renderOriginalSpy
			};
		});

		it('should set fflip object onto req', function(done) {
			expressIntegration.middleware(reqMock, resMock, function() {
				assert(reqMock.fflip);
				assert(reqMock.fflip._flags);
				done();
			});
		});

		it('should allow res.render() to be called without model object', function(done) {
			expressIntegration.middleware(reqMock, resMock, function() {
				assert.doesNotThrow(function() {
					resMock.render('testview');
				});
				done();
			});
		});

		it('should wrap res.render() to set features object automatically', function(done) {
			expressIntegration.middleware(reqMock, resMock, function() {
				var features = {features : { fClosed: true }};
				var featuresString = JSON.stringify(features);

				reqMock.fflip.features = features;
				resMock.render('testview', {});
				assert(renderOriginalSpy.calledOnce);

				assert(renderOriginalSpy.calledWith('testview', {
					Features: features,
					FeaturesJSON: featuresString
				}));
				done();
			});
		});

		it('req.fflip.setFeatures() should call userFeatures() with cookie flags', function(done) {
			var spy = sandbox.spy(fflip, 'userFeatures');
			expressIntegration.middleware(reqMock, resMock, function() {
				reqMock.fflip.setForUser(userXYZ);
				assert(fflip.userFeatures.calledOnce);
				assert(fflip.userFeatures.calledWith(userXYZ, {fClosed: true}));
				spy.restore();
				done();
			});
		});

		it('req.fflip.has() should get the correct features', function(done) {
			expressIntegration.middleware(reqMock, resMock, function() {
				reqMock.fflip.setForUser(userXYZ);
				assert.strictEqual(reqMock.fflip.has('fOpen'), true);
				assert.strictEqual(reqMock.fflip.has('fClosed'), true);
				assert.strictEqual(reqMock.fflip.has('notafeature'), false);
				done();
			});
		});

		it.skip('req.fflip.has() should throw when called before features have been set', function() {
			assert.throws(function() {
				expressIntegration.middleware(reqMock, resMock, function() {
					reqMock.fflip.has('fOpen');
				});
			});
		});

		it('req.fflip.featuers should be an empty object if setFeatures() has not been called', function(done) {
			var consoleErrorStub = sandbox.stub(console, 'error'); // Supress Error Output
			expressIntegration.middleware(reqMock, resMock, function() {
				assert.ok(isObjectEmpty(reqMock.fflip.features));
				done();
				consoleErrorStub.restore();
			});
		});

	});

	describe('manualRoute', function(){

		var expressIntegration,
			reqMock,
			resMock;

		beforeEach(function() {
			expressIntegration = new FFlipExpressIntegration(fflip, customizationOptions);

			reqMock = {
				params: {},
				cookies: {}
			};
			reqMock.params[customizationOptions.routeParamForName] = 'fClosed';
			reqMock.params[customizationOptions.routeParamForAction] = '1';
			resMock = {
				json: sandbox.spy(),
				cookie: sandbox.spy()
			};
		});

		it('should propogate a 404 error if feature does not exist', function(done) {
			reqMock.params[customizationOptions.routeParamForName] = 'doesnotexist';
			expressIntegration.manualRoute(reqMock, resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 404);
				done();
			});
		});

		it('should propogate a 500 error if cookies are not enabled', function(done) {
			reqMock.cookies = null;
			expressIntegration.manualRoute(reqMock, resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 500);
				done();
			});
		});

		it('should set the right cookie flags', function() {
			expressIntegration.manualRoute(reqMock, resMock);
			assert(resMock.cookie.calledWithMatch(customizationOptions.cookieName, {fClosed: true}, { maxAge: customizationOptions.cookieMaxAge }));
		});

		it('should send back 200 json response on successful call', function() {
			expressIntegration.manualRoute(reqMock, resMock);
			assert(resMock.json.calledWith(200));
		});

		// var request = require('supertest')('http://localhost:5555');
		// it('should return a 404 error if feature does not exist', function(done) {
		//   request.get('/fflip/doesnotexist/1').expect(404, function(err){
		//     if(err) done(err);
		//     done();
		//   });
		// });

		// it('should return a 400 error if action is invalid', function() {
		//   request.get('/fflip/fOpen/5').expect(400, function(err){
		//     if(err) done(err);
		//     done();
		//   });
		// });

		// it('should return a 200 sucess if request was valid', function() {
		//   request.get('/fflip/fOpen/1').expect(400, function(err){
		//     if(err) done(err);
		//     done();
		//   });
		// });

		// it('should call res.cookie() on successful request', function() {
		//   self.expressRoute(reqMock, resMock);
		//   assert(res.cookie.calledWith('fflip'));
		// });

	});

	describe('.connectAll()', function() {

		var expressIntegration,
			appMock;

		beforeEach(function() {
			expressIntegration = new FFlipExpressIntegration(fflip);
			appMock = {
				use: sandbox.spy(),
				get: sandbox.spy()
			};
		});

		it('should mount express middleware into provided app', function() {
			expressIntegration.connectAll(appMock);
			assert.ok(appMock.use.calledWith(expressIntegration.middleware));
		});

		it('should add GET route for manual feature flipping into provided app', function() {
			expressIntegration.connectAll(appMock);
			assert.ok(appMock.get.calledWith('/fflip/:name/:action', expressIntegration.manualRoute));
		});

	});

});
