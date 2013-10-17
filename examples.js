// Include fflip
var fflip = require('./fflip');

// Configure Some Criteria
fflip.config({
  criteria: {
    allowUserIDs: function(user, idArr) {
      for(var id in idArr) {
        if(user.id == idArr[id]) return true;
      }
      return false;
    },
    percentageOfUsers: function(user, percent) {
      return (user.id % 100 < percent * 100);
    },
    isPaidUser: function(user, isPaid) {
      return user.isPaid == isPaid;
    }
  }
});

// Add Some Features
fflip.config({
  features: {
    paidFeature: {
      isPaidUser: true
    },
    closedBeta: {
      allowUserIDs: [20,30,50,181],
    },
    newFeatureRollout: {
      isPaidUser: false,
      percentageOfUsers: 0.50,
    },
  }
});

// Define a Test User
var freeUser = {
  id: 30,
  isPaid: false,
  hasFeature: function(feature) { return fflip.userHasFeature(freeUser, feature); }
};

// Get All of a User's Enabled Features
var Features = fflip.featuresForUser(freeUser);

// Example Use
console.log(Features);
console.log(freeUser.hasFeature('newFeatureRollout'));
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}
