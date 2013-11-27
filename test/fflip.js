var assert = require('assert'),
    sinon = require('sinon');
var request = require('supertest')('http://localhost:5555');

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
      c1: true
    },
    fClosed: {
      c1: false
    },
    fEval: {
      c2: 'abc'
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

var isObjectEmpty = function(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};



suite('fflip', function(){

  setup(function(){

  });

  suite('config()', function(){

    test('should set features if given static feature object', function(){
      fflip._features = {};
      fflip.config(configData);
      assert.equal(configData.features, fflip._features);
    });

    test('should set features if given a syncronous loading function', function(){
      var loadSyncronously = function() {
        return configData.features;
      };
      fflip.config({features: loadSyncronously});
      assert.equal(configData.features, fflip._features);
    });

    test('should set features if given an asyncronous loading function', function(done){
      var loadAsyncronously = function(callback) {
        callback(configData.features);
        assert.equal(configData.features, fflip._features);
        done();
      };
      fflip.config({features: loadAsyncronously});
    });

    test('should set criteria if given static criteria object', function(){
      fflip._criteria = {};
      fflip.config(configData);
      assert.equal(configData.criteria, fflip._criteria);
    });

    test('should set criteria if given a syncronous loading function', function(){
      var loadSyncronously = function() {
        return configData.criteria;
      };
      fflip.config({criteria: loadSyncronously});
      assert.equal(configData.criteria, fflip._criteria);
    });

    test('should set criteria if given an asyncronous loading function', function(done){
      var loadAsyncronously = function(callback) {
        callback(configData.criteria);
        assert.equal(configData.criteria, fflip._criteria);
        done();
      };
      fflip.config({criteria: loadAsyncronously});
    });

    test('should set reloadRate if given reload', function(){
      fflip._reloadRate = 0;
      fflip.config(configData);
      assert.equal(configData.reload*1000, fflip._reloadRate);
    });

  });

  suite('reload()', function(){
    setup(function() {

    });

    test('should be called every X seconds where X = reloadRate', function(done) {
      this.timeout(205);
      var count = -99;
      var loadAsyncronously = function(callback) {
        count++;
        if(count >= 2) {
          done();
        }
        callback({});
      };
      fflip.config({features: loadAsyncronously, criteria: loadAsyncronously, reload: 0.2});
      count = 0;
    });

    test('should update criteria and features', function(done){
      var count;
      var loadAsyncronously = function(callback) {
        count++;
        callback({});
      };
      fflip.config({features: loadAsyncronously, criteria: loadAsyncronously});
      count = 0;
      fflip.reload();
      setTimeout(function() {
        assert.equal(count, 2);
        done();
      }, 100);
    });

  });

  suite('userHasFeature()', function(){

    setup(function() {
      fflip.config(configData);
    });

    test('should return null if features does not exist', function(){
      assert.equal(null, fflip.userHasFeature(userABC, 'notafeature'));
    });

    test('should return false if features has no criteria', function(){
      assert.equal(false, fflip.userHasFeature(userABC, 'fEmpty'));
    });

    test('should return false if all feature critieria evaluates to false', function(){
      assert.equal(false, fflip.userHasFeature(userABC, 'fClosed'));
      assert.equal(false, fflip.userHasFeature(userXYZ, 'fEval'));
    });

    test('should return true if one feature critieria evaluates to true', function(){
      assert.equal(true, fflip.userHasFeature(userABC, 'fOpen'));
      assert.equal(true, fflip.userHasFeature(userABC, 'fEval'));
    });

  });

  suite('featuresForUser()', function(){

    setup(function() {
      fflip.config(configData);
    });

    test('should return an object of features for a user', function(){
      var featuresABC = fflip.featuresForUser(userABC);
      assert.equal(featuresABC.fEmpty, false);
      assert.equal(featuresABC.fOpen, true);
      assert.equal(featuresABC.fClosed, false);
      assert.equal(featuresABC.fEval, true);
    });

    test('should overwrite values when flags are set', function() {
      var featuresXYZ = fflip.featuresForUser(userXYZ);
      assert.equal(featuresXYZ.fEval, false);
      featuresXYZ = fflip.featuresForUser(userXYZ, {fEval: true});
      assert.equal(featuresXYZ.fEval, true);
    });

  });

  suite('express middleware', function(){

    setup(function() {
      this.reqMock = {
        cookies: {
          fflip: {
            fClosed: false
          }
        }
      };
      this.renderOriginal = sinon.spy();
      this.resMock = {
        render: this.renderOriginal
      };
    });

    test('should set fflip object onto req', function(done) {
      var me = this;
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        assert(me.reqMock.fflip);
        assert(me.reqMock.fflip.flags, me.reqMock.cookies.fflip);
        done();
      });
    });

    test('should wrap res.render() to set features object automatically', function(done) {
      var me = this;
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        me.reqMock.fflip = {features : { fClosed: true }};
        me.resMock.render('testview', {});
        assert(me.renderOriginal.calledOnce);
        var featuresString = JSON.stringify(me.reqMock.fflip.features);
        assert(me.renderOriginal.calledWith('testview', {Features: featuresString}));
        done();
      });
    });

    test('req.fflip.setFeatures() should call featuresForUser() with cookie flags', function(done) {
      var me = this;
      var spy = sinon.spy(fflip, 'featuresForUser');
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        me.reqMock.fflip.setFeatures(userXYZ);
        assert(fflip.featuresForUser.calledOnce);
        assert(fflip.featuresForUser.calledWith(userXYZ, {fClosed: false}));
        spy.restore();
        done();
      });
    });

    test('req.fflip.hasFeatures() should get the correct features', function(done) {
      var me = this;
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        me.reqMock.fflip.setFeatures(userXYZ);
        assert.strictEqual(me.reqMock.fflip.hasFeature('fOpen'), true);
        assert.strictEqual(me.reqMock.fflip.hasFeature('fClosed'), false);
        assert.strictEqual(me.reqMock.fflip.hasFeature('notafeature'), undefined);
        done();
      });
    });

    test('req.fflip.hasFeatures() should return null if features have not been set', function(done) {
      var me = this;
      var consoleErrorStub = sinon.stub(console, 'error'); // Supress Error Output
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        assert.strictEqual(me.reqMock.fflip.hasFeature('fOpen'), null);
        assert.strictEqual(me.reqMock.fflip.hasFeature('fClosed'), null);
        assert.strictEqual(me.reqMock.fflip.hasFeature('notafeature'), null);
        done();
        consoleErrorStub.restore();
      });
    });

    test('req.fflip.featuers should be an empty object if setFeatures() has not been called', function(done) {
      var me = this;
      var consoleErrorStub = sinon.stub(console, 'error'); // Supress Error Output
      fflip._express_middleware(this.reqMock, this.resMock, function() {
        assert.ok(isObjectEmpty(me.reqMock.fflip.features));
        done();
        consoleErrorStub.restore();
      });
    });

  });

  suite('express route', function(){

    setup(function() {
      this.reqMock = {
        params: {
          name: 'fClosed',
          action: '1'
        },
        cookies: {}
      };
      this.resMock = {
        json: sinon.spy(),
        cookie: sinon.spy()
      }
    });

    test('should return a 404 json object if feature does not exist', function() {
      this.reqMock.params.name = 'doesnotexist';
      fflip._express_route(this.reqMock, this.resMock);
      assert(this.resMock.json.calledWith(404));
    });

    test('should return a 500 json object if cookies are not enabled', function() {
      this.reqMock.cookies = null;
      fflip._express_route(this.reqMock, this.resMock);
      assert(this.resMock.json.calledWith(500));
    });

    test('should set the right cookie flags', function() {
      fflip._express_route(this.reqMock, this.resMock);
      assert(this.resMock.cookie.calledWithMatch('fflip', {fClosed: true}, { maxAge: 900000 }));
    });

    test('should send back 200 json response on successful call', function() {
      fflip._express_route(this.reqMock, this.resMock);
      assert(this.resMock.json.calledWith(200));
    });

    // test('should return a 404 error if feature does not exist', function(done) {
    //   request.get('/fflip/doesnotexist/1').expect(404, function(err){
    //     if(err) done(err);
    //     done();
    //   });
    // });
    
    // test('should return a 400 error if action is invalid', function() {
    //   request.get('/fflip/fOpen/5').expect(400, function(err){
    //     if(err) done(err);
    //     done();
    //   });
    // });
    
    // test('should return a 200 sucess if request was valid', function() {
    //   request.get('/fflip/fOpen/1').expect(400, function(err){
    //     if(err) done(err);
    //     done();
    //   });
    // });

    // test('should call res.cookie() on successful request', function() {
    //   self._express_route(this.reqMock, this.resMock);
    //   assert(res.cookie.calledWith('fflip'));
    // });

  });

});