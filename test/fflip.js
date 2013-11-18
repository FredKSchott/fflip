var assert = require('assert');
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
      var featuresXYZ = fflip.featuresForUser(userXYZ);
      assert.equal(featuresABC.fEmpty, false);
      assert.equal(featuresABC.fOpen, true);
      assert.equal(featuresABC.fClosed, false);
      assert.equal(featuresABC.fEval, true);      
      assert.equal(featuresXYZ.fEmpty, false);
      assert.equal(featuresXYZ.fOpen, true);
      assert.equal(featuresXYZ.fClosed, false);
      assert.equal(featuresXYZ.fEval, false);
    });

  });


});