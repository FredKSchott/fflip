![icon](fflipIcon.png) fflip
============================

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users, based on thier user id, join date, paid status, and whatever else you can think of. __fflip's__ goal is to be the most extendable and customizable feature flipping/toggling module out there.

- Create a list of criteria to test your users against
- Describe features as a list of criteria, using easy-to-read json
- Write it all to file, or load it Syncronous/Asyncronous from a database
- \*Everything\*-Agnostic: Supports any database, user representation or framework you can throw at it 

Install with:
```
npm install fflip
```

##Getting Started
###Criteria
Criteria are the rules that features can test users against. Each rule takes a user and a data argument to test against, and returns true/false if the user matches that criteria. The data argument can be any type, as long as you handle it correctly in the function you describe.
```javascript
var ExampleCriteria = {    
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
Features are sets of criteria to test users against. A user will have a featured enabled if they match all listed criteria, otherwise the feature is disabled. Features are described as follows:
```javascript
var ExampleFeatures = {
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

###Basic Usage
```javascript
// Include fflip
var fflip = require('fflip');

// Configure using variables defined above
fflip.config({
  criteria: ExampleCriteria,
  features: ExampleFeatures
});

// Define a Test User
var freeUser = {
  id: 80,
  isPaid: false,
  /* ... */
};

// Get a User's Enabled Features
var Features = fflip.featuresForUser(freeUser);
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}
```

##Configuration
```javascript
fflip.config({
  criteria: {}, // Object (see above) or Function (see below)
  features: {}, // Object or Function
  reload: 30,   // Time between refreshing features/criteria, in seconds
});
```

##Advanced Usage

###Extending Your User Object
```javascript
// Add a hasFeature() method to your User
var paidUser = {
  id: 30,
  isPaid: false,
  hasFeature: function(feature) { return fflip.userHasFeature(paidUser, feature); },
  /* ... */
};

// Test Specific User Features
if(paidUser.hasFeature('newFeatureRollout')) {
  /* Do Some newFeauture Behavior... */
}
```

###Features & Criteria Functions
__fflip__ also accepts functions for loading criteria and features. If __fflip__ is passed a funciton with no arguments it will call the function and accept the return value. To load asyncronously, pass a function that sends a features/criteria data object to a callback. __fflip__ will recieve the callback and set the object accordingly. Set the reload option to refresh the data every X seconds by calling these functions.
```javascript
// Load Features Syncronously
var getCriteriaSync = function() {
  var collection = db.collection('criteria');
  var criteriaArr = collection.find().toArray();
  /* Proccess criteriaArr -> criteriaObj (format described above) */
  return criteriaObj;
}

// Load Features Asyncronously
var getFeaturesAsync = function(fflip_callback) {
  var collection = db.collection('features');
  collection.find().toArray(function(err, featuresArr) {
    /* Handle err
     * Proccess featuresArr -> featuresObj (format described above) */
    fflip_callback(featuresObj);
  });      
}

fflip.config({
  criteria: getCriteriaSync,
  features: getFeaturesAsync,
  reload: 60 /* Call each function again and update features every 60 secondss */
});
```

##Special Thanks
<a href="http://thenounproject.com/noun/switch/#icon-No3361" target="_blank">Switch</a> designed by <a href="http://thenounproject.com/schillidog" target="_blank">Rob Schill</a> from The Noun Project
