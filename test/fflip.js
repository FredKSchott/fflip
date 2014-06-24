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
};

var sandbox = sinon.sandbox.create();
var fflip = require('../lib/fflip');

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
describe('fflip', function(){

	afterEach(function(){
		sandbox.verifyAndRestore();
	});

	describe('config()', function(){

		it('should set features if given static feature object', function(){
			fflip._features = {};
			fflip.config(configData);
			assert.equal(configData.features, fflip._features);
		});

		it('should set features if given a syncronous loading function', function(){
			var loadSyncronously = function() {
				return configData.features;
			};
			fflip.config({features: loadSyncronously});
			assert.equal(configData.features, fflip._features);
		});

		it('should set features if given an asyncronous loading function', function(done){
			var loadAsyncronously = function(callback) {
				callback(configData.features);
				assert.equal(configData.features, fflip._features);
				done();
			};
			fflip.config({features: loadAsyncronously});
		});

		it('should set criteria if given static criteria object', function(){
			fflip._criteria = {};
			fflip.config(configData);
			assert.equal(configData.criteria, fflip._criteria);
		});

		it('should set reloadRate if given reload', function(){
			fflip._reloadRate = 0;
			fflip.config(configData);
			assert.equal(configData.reload*1000, fflip._reloadRate);
		});

	});

	describe('reload()', function(){
		beforeEach(function() {

		});

		it('should be called every X seconds where X = reloadRate', function(done) {
			this.timeout(205);
			var loadAsyncronously = function(callback) {
				callback({});
				done();
			};
			fflip.config({features: loadAsyncronously, reload: 0.2});
		});

		it('should update features', function(done){
			this.timeout(100);
			var testReady = false;
			var loadAsyncronously = function(callback) {
				callback({});
				if(testReady)
					done();
			};
			fflip.config({features: loadAsyncronously});
			testReady = true;
			fflip.reload();
		});

	});

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

		beforeEach(function() {
			fflip.config(configData);
		});

		it('should return an object of features for a user', function(){
			var featuresABC = fflip.userFeatures(userABC);
			assert.equal(featuresABC.fEmpty, false);
			assert.equal(featuresABC.fOpen, true);
			assert.equal(featuresABC.fClosed, false);
			assert.equal(featuresABC.fEval, true);
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
		});

		it('should set fflip object onto req', function(done) {
			var me = this;
			fflip._express_middleware(this.reqMock, this.resMock, function() {
				assert(me.reqMock.fflip);
				assert(me.reqMock.fflip._flags, me.reqMock.cookies.fflip);
				done();
			});
		});

		it('should allow res.render() to be called without model object', function(done) {
			var me = this;
			fflip._express_middleware(this.reqMock, this.resMock, function() {
				assert.doesNotThrow(function() {
					me.resMock.render('testview');
				});
				done();
			});
		});

		it('should wrap res.render() to set features object automatically', function(done) {
			var me = this;
			fflip._express_middleware(this.reqMock, this.resMock, function() {
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
			fflip._express_middleware(this.reqMock, this.resMock, function() {
				me.reqMock.fflip.setForUser(userXYZ);
				assert(fflip.userFeatures.calledOnce);
				assert(fflip.userFeatures.calledWith(userXYZ, {fClosed: false}));
				spy.restore();
				done();
			});
		});

		it('req.fflip.has() should get the correct features', function(done) {
			var me = this;
			fflip._express_middleware(this.reqMock, this.resMock, function() {
				me.reqMock.fflip.setForUser(userXYZ);
				assert.strictEqual(me.reqMock.fflip.has('fOpen'), true);
				assert.strictEqual(me.reqMock.fflip.has('fClosed'), false);
				assert.strictEqual(me.reqMock.fflip.has('notafeature'), undefined);
				done();
			});
		});

		it('req.fflip.has() should throw when called before features have been set', function() {
			var me = this;
			assert.throws(function() {
				fflip._express_middleware(this.reqMock, this.resMock, function() {
					me.reqMock.fflip.has('fOpen');
				});
			});
		});

		it('req.fflip.featuers should be an empty object if setFeatures() has not been called', function(done) {
			var me = this;
			var consoleErrorStub = sandbox.stub(console, 'error'); // Supress Error Output
			fflip._express_middleware(this.reqMock, this.resMock, function() {
				assert.ok(isObjectEmpty(me.reqMock.fflip.features));
				done();
				consoleErrorStub.restore();
			});
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
			var next = sandbox.stub();
			this.reqMock.params.name = 'doesnotexist';
			fflip._express_route(this.reqMock, this.resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 404);
				done();
			});
		});

		it('should propogate a 500 error if cookies are not enabled', function(done) {
			var next = sandbox.stub();
			this.reqMock.cookies = null;
			fflip._express_route(this.reqMock, this.resMock, function(err) {
				assert(err);
				assert(err.fflip);
				assert.equal(err.statusCode, 500);
				done();
			});
		});

		it('should set the right cookie flags', function() {
			fflip._express_route(this.reqMock, this.resMock);
			assert(this.resMock.cookie.calledWithMatch('fflip', {fClosed: true}, { maxAge: 900000 }));
		});

		it('should send back 200 json response on successful call', function() {
			fflip._express_route(this.reqMock, this.resMock);
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
		//   self._express_route(this.reqMock, this.resMock);
		//   assert(res.cookie.calledWith('fflip'));
		// });

	});

});