![icon](fflipIcon.png) fflip
============================

Working on a secret new toolbar? Starting a closed Beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-fa-fa-fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users, based on thier user id, join date, paid status, and whatever else you can think of. __fflip's__ goal is to be the most extendable feature flipping/toggling module out there, with a focus on both large and small teams.

##Features
- Easily create custom criteria rules based on how your user properties
- Abstract them away, so that features can be created without even touching code
- Intuitively create and describe new features using easy-to-read json

##Installation
`npm install fflip`

##Usage
###Defining Criteria
Criteria are the rules that features can test users against. Each rule takes a user and an argument to test that user object against.
```javascript
var criteria = {
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

### Defining Features
Features are a suite of rules to test users against. Each feature is an object of key value pairs, where the key is the rule name and the value is the argument to pass to the rule.
```javascript
var features = {
  paidFeature: {
    isPaidUser: true
  },
  closedBeta: {
    allowUserIDs: [20,30,50,181],
  },
  newFeatureRollout: {
    isPaidUser: false,
    percentageOfUsers: 0.50,
  }
}
```

###Configuring fflip
```javascript
// Include fflip
var fflip = require('fflip');

// Configure using variables defined above
fflip.config({
  criteria: criteria,
  features: features
});

// Cleaner configuration via require() 
fflip.config({
  criteria: require('./criteria'),
  features: require('./features')
});
```

###Testing Features
```javascript
// Define a Test User
var freeUser = {
  id: 30,
  isPaid: false
};

// Get All of a User's Enabled Features
var Features = fflip.featuresForUser(freeUser);
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}

```

###Extending Your User Object
```javascript
// Add a hasFeature() method to your User Object
var paidUser = {
  id: 30,
  isPaid: false,
  hasFeature: function(feature) { return fflip.userHasFeature(freeUser, feature); }
};

// Test Specific User Features
console.log(freeUser.hasFeature('newFeatureRollout'));
```

##Special Thanks
<a href="http://thenounproject.com/noun/switch/#icon-No3361" target="_blank">Switch</a> designed by <a href="http://thenounproject.com/schillidog" target="_blank">Rob Schill</a> from The Noun Project
