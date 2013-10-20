![icon](fflipIcon.png) fflip
============================

Working on a secret new toolbar? Starting a closed Beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users, based on thier user id, join date, paid status, and whatever else you can think of. __fflip's__ goal is to be the most extendable feature flipping/toggling module out there, with a focus on both large and small teams.

- Create a list of criteria for features to test user against, based on whatever user properties you have
- Abstract them away, describe features verbally using easy-to-read json
- Store your data in a file, or grab it from a database. Supports Syncronous & Asyncronous loading of new features & criteria.

Install with:
```
npm install fflip
```

##Getting Started
###Criteria
Criteria are the rules that features can test users against. Each rule takes a user and an data argument to test the user against, and returns true/false if the user matches that criteria. The data argument can be any type, as long as you handle it correctly in the function you describe.
```javascript
var Criteria = {    
  isPaidUser: function(user, isPaid) {
    return user.isPaid == isPaid;
  },
  percentageOfUsers: function(user, percent) {
    return (user.id % 100 < percent * 100);
  },
  allowUserIDs: function(user, idArr) {
    for(var id in idArr) {
      if(user.id == idArr[id]) return true;
    }
    return false;
  }
}
```

###Features
Features are sets of criteria to test users against. A user has a featured enabled if they match all listed criteria, otherwise the feature is disabled. Features are described as follows:
```javascript
var Features = {
  paidFeature: {
    isPaidUser: true
  },
  closedBeta: {
    allowUserIDs: [20,30,80,181],
  },
  newFeatureRollout: {
    isPaidUser: false,
    percentageOfUsers: 0.50,
  }
}
```

##Usage
Below is a simple example:
```javascript
// Include fflip
var fflip = require('fflip');

// Configure using variables defined above
fflip.config({
  criteria: Criteria,
  features: Features
});

// Define a Test User
var freeUser = {
  id: 80,
  isPaid: false,
  /* ... */
};

// Get All of a User's Enabled Features
var Features = fflip.featuresForUser(freeUser);
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}
```

###Extending Your User Object
```javascript
// Add a hasFeature() method to your User
var paidUser = {
  id: 30,
  isPaid: false,
  hasFeature: function(feature) { return fflip.userHasFeature(freeUser, feature); },
  /* ... */
};

// Test Specific User Features
console.log(freeUser.hasFeature('newFeatureRollout'));
```

###Loading Features Dynamically
```javascript
// Load Features Syncronously
var getFeatures = function() {
  //define mongodb client
  //load from mongodb client
  return X.call(query);
}

// Load Features Asyncronously
var getFeaturesAsync = function(callback) {
  //define mongodb client
  //load from mongodb client
  client.loadFromDB(query, callback);
}
```

##Special Thanks
<a href="http://thenounproject.com/noun/switch/#icon-No3361" target="_blank">Switch</a> designed by <a href="http://thenounproject.com/schillidog" target="_blank">Rob Schill</a> from The Noun Project
