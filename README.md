![icon](fflipIcon.png) fflip
============================

Working on a secret new toolbar? Starting a closed Beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-fa-fa-fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users, based on thier user id, join date, paid status, and whatever else you can think of. `fflip`'s goal is to be the most extendable feature flipping module out there, with a focus on both large and small teams.

##Features
- Easily create custom criteria rules based on how your users are represented
- Abstract them away, so that feature creators don't need to touch them
- Intuitively create and describe new features, all in easy-to-read json

##Installation
`npm install fflip`

##Usage
####Defining Criteria
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

#### Add Some Features
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

####Configuring fflip
```javascript
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

####Testing Features
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

####Extending Your User Object
```javascript
// Add a hasFeature() method to your User Object
var paidUser = {
  id: 30,
  isPaid: false,
  hasFeature: function(feature) { return fflip.userHasFeature(freeUser, feature); }
};

// Test User Features
console.log(freeUser.hasFeature('newFeatureRollout'));
```

##Special Thanks
<a href="http://thenounproject.com/noun/switch/#icon-No3361" target="_blank">Switch</a> designed by <a href="http://thenounproject.com/schillidog" target="_blank">Rob Schill</a> from The Noun Project
