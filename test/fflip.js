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
			fflip._features = {};
			fflip.config(configData);
			assert.deepEqual(fflip._features, {
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
			fflip._features = {};
			fflip.config({features: loadSyncronously, criteria: configData.criteria});
			assert.deepEqual(fflip._features, {
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
				assert.deepEqual(fflip._features, {
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
			fflip._criteria = {};
			fflip.config(configData);
			assert.deepEqual(fflip._criteria, {
				c1: configData.criteria[0].check,
				c2: configData.criteria[1].check
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

	describe('userHasFeature()', function() {

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return null if features does not exist', function(){
			assert.equal(null, fflip.userHasFeature(userABC, 'notafeature'));
		});

		it('should return false if no criteria set', function(){
			assert.equal(false, fflip.userHasFeature(userABC, 'fEmpty'));
		});

		// TODO(fks) 03-14-2016: (Edge Case) Test that an empty criteria object disables a feature

		it('should return false if all feature critieria evaluates to false', function(){
			assert.equal(false, fflip.userHasFeature(userABC, 'fClosed'));
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEval'));
		});

		it('should return false if one feature critieria evaluates to true and the other evaluates to false', function(){
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEval'));
		});

		it('should return true if all feature critieria evaluates to true', function(){
			assert.equal(true, fflip.userHasFeature(userABC, 'fEval'));
		});

		it('should return false if zero feature critieria evaluates to true', function(){
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEvalOr'));
		});

		it('should return true if one feature critieria evaluates to true', function(){
			assert.equal(true, fflip.userHasFeature(userABC, 'fEvalOr'));
		});

		it('should handle nested arrays', function(){
			assert.equal(true, fflip.userHasFeature(userABC, 'fEvalComplex'));
			assert.equal(true, fflip.userHasFeature(userEFG, 'fEvalComplex'));
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEvalComplex'));
		});

		it('should handle the $veto property', function(){
			assert.equal(false, fflip.userHasFeature(userABC, 'fEvalVeto'));
			assert.equal(true, fflip.userHasFeature(userEFG, 'fEvalVeto'));
			assert.equal(false, fflip.userHasFeature(userXYZ, 'fEvalVeto'));
		});


	});

	describe('userFeatures()', function(){

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return an object of features for a user', function(){
			var featuresABC = fflip.userFeatures(userABC);
			assert.deepEqual(featuresABC, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: true,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: false
			});

			var featuresEFG = fflip.userFeatures(userEFG);
			assert.deepEqual(featuresEFG, {
				fEmpty: false,
				fOpen: true,
				fClosed: false,
				fEval: false,
				fEvalOr: true,
				fEvalComplex: true,
				fEvalVeto: true
			});

			var featuresXYZ = fflip.userFeatures(userXYZ);
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
			var featuresXYZ = fflip.userFeatures(userXYZ);
			assert.equal(featuresXYZ.fEval, false);
			featuresXYZ = fflip.userFeatures(userXYZ, {fEval: true});
			assert.equal(featuresXYZ.fEval, true);
		});

	});

	describe('express middleware', function(){

		beforeEach(function() {
			this.reqMock = {
				cookies: {
					fflip: {
						fClosed: false
					}
				}
			};
			this.renderOriginal = sandbox.spy();
			this.resMock = {
				render: this.renderOriginal
			};
			this.appMock = {
				use: sandbox.spy(),
				get: sandbox.spy()
			};
		});

		it('should set fflip object onto req', function(done) {
			var me = this;
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				assert(me.reqMock.fflip);
				assert(me.reqMock.fflip._flags, me.reqMock.cookies.fflip);
				done();
			});
		});

		it('should allow res.render() to be called without model object', function(done) {
			var me = this;
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				assert.doesNotThrow(function() {
					me.resMock.render('testview');
				});
				done();
			});
		});

		it('should wrap res.render() to set features object automatically', function(done) {
			var me = this;
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				var features = {features : { fClosed: true }};
				var featuresString = JSON.stringify(features);

				me.reqMock.fflip.features = features;
				me.resMock.render('testview', {});
				assert(me.renderOriginal.calledOnce);

				assert(me.renderOriginal.calledWith('testview', {
					Features: features,
					FeaturesJSON: featuresString
				}));
				done();
			});
		});

		it('req.fflip.setFeatures() should call userFeatures() with cookie flags', function(done) {
			var me = this;
			var spy = sandbox.spy(fflip, 'userFeatures');
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				me.reqMock.fflip.setForUser(userXYZ);
				assert(fflip.userFeatures.calledOnce);
				assert(fflip.userFeatures.calledWith(userXYZ, {fClosed: false}));
				spy.restore();
				done();
			});
		});

		it('req.fflip.has() should get the correct features', function(done) {
			var me = this;
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				me.reqMock.fflip.setForUser(userXYZ);
				assert.strictEqual(me.reqMock.fflip.has('fOpen'), true);
				assert.strictEqual(me.reqMock.fflip.has('fClosed'), false);
				assert.strictEqual(me.reqMock.fflip.has('notafeature'), false);
				done();
			});
		});

		it('req.fflip.has() should throw when called before features have been set', function() {
			var me = this;
			assert.throws(function() {
				fflip.expressMiddleware(this.reqMock, this.resMock, function() {
					me.reqMock.fflip.has('fOpen');
				});
			});
		});

		it('req.fflip.featuers should be an empty object if setFeatures() has not been called', function(done) {
			var me = this;
			var consoleErrorStub = sandbox.stub(console, 'error'); // Supress Error Output
			fflip.expressMiddleware(this.reqMock, this.resMock, function() {
				assert.ok(isObjectEmpty(me.reqMock.fflip.features));
				done();
				consoleErrorStub.restore();
			});
		});

		it('should mount express middleware into provided app', function() {
			fflip.express(this.appMock);
			assert.ok(this.appMock.use.calledWith(fflip.expressMiddleware));
		});

		it('should add GET route for manual feature flipping into provided app', function() {
			fflip.express(this.appMock);
			assert.ok(this.appMock.get.calledWith('/fflip/:name/:action', fflip.expressRoute));
		});

	});

	describe('express route', function(){

		beforeEach(function() {
			this.reqMock = {
				params: {
					name: 'fClosed',
					action: '1'
				},
				cookies: {}
			};
			this.resMock = {
				json: sandbox.spy(),
				cookie: sandbox.spy()
			};
		});

		it('should propogate a 404 error if feature does not exist', function(done) {
			this.reqMock.params.name = 'doesnotexist';
			fflip.expressRoute(this.reqMock, this.resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 404);
				done();
			});
		});

		it('should propogate a 500 error if cookies are not enabled', function(done) {
			this.reqMock.cookies = null;
			fflip.expressRoute(this.reqMock, this.resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 500);
				done();
			});
		});

		it('should set the right cookie flags', function() {
			fflip.expressRoute(this.reqMock, this.resMock);
			assert(this.resMock.cookie.calledWithMatch('fflip', {fClosed: true}, { maxAge: 900000 }));
		});

		it('should set the right cookie flags when maxCookieAge is set', function() {
			var oneMonthMs = 31 * 86400 * 1000;
			var oldMaxCookieAge = fflip.maxCookieAge;
			fflip.maxCookieAge = oneMonthMs;
			fflip.expressRoute(this.reqMock, this.resMock);
			fflip.maxCookieAge = oldMaxCookieAge;

			assert(this.resMock.cookie.calledWithMatch('fflip', {fClosed: true}, { maxAge: oneMonthMs }));
		});

		it('should send back 200 json response on successful call', function() {
			fflip.expressRoute(this.reqMock, this.resMock);
			assert(this.resMock.json.calledWith(200));
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
		//   self.expressRoute(this.reqMock, this.resMock);
		//   assert(res.cookie.calledWith('fflip'));
		// });

	});

});
