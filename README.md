<img src="http://fredkschott.com/images/fflipIcon2.png" /> fflip
============================

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users based on thier user id, join date, membership status, and whatever else you can think of. __fflip's__ goal is to be the most extendable and customizable feature flipping/toggling module out there.

- Describe __custom criteria and features__ using easy-to-read JSON
- Supports __Syncronous/Asyncronous loading__ of features and criteria
- Deliver a features object to the client for __client-side feature flipping__
- __\*Everything\*-Agnostic:__ Supports any database, user representation or framework you can throw at it

```
npm install fflip --save
```

##Getting Started
Below is a simple example of using __fflip__ to deliver a closed beta to a fraction of users:
```javascript
// Include fflip
var fflip = require('fflip');

fflip.config({
  criteria: ExampleCriteriaObject, // defined below
  features: ExampleFeaturesObject  // defined below
});

// Get a User's Enabled Features
var Features = fflip.featuresForUser(someFreeUser);
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}
```

###Criteria
Criteria are the rules that features can test users against. Each rule takes a user and a data argument to test against, and returns true/false if the user matches that criteria. The data argument can be any type, as long as you handle it correctly in the function you describe.
```javascript
var ExampleCriteriaObject = {
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
Features are sets of criteria to test users against. The value associated with the criteria is passed in as the data argument of the criteria function. A user will have a featured enabled if they match all listed criteria, otherwise the feature is disabled. Features are described as follows:
```javascript
var ExampleFeaturesObject = {
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
```
Object featuresForUser(user)             // Return object of true/false for all features for user
Bool   userHasFeature(user, featureName) // Return true/false if featureName is enabled for user
void   config(options)                   // Configure fflip (see below)
void   reload()                          // Force a reload of criteria/features
```

Configure __fflip__ using any of the following options:
```javascript
fflip.config({
  criteria: {}, // Object (see above) or Function (see below)
  features: {}, // Object or Function
  reload: 30,   // Time between refreshing features/criteria, in seconds
});
```

###Loading Features & Criteria Dynamically
__fflip__ also accepts functions for loading criteria and features. If __fflip__ is passed a funciton with no arguments it will call the function and accept the return value. To load asyncronously, pass a function that sends a features/criteria data object to a callback. __fflip__ will recieve the callback and set the data accordingly. Set the reload option to call these functions and refresh the data every X seconds.
```javascript
// Load Criteria Syncronously
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
Original logo designed by <a href="http://thenounproject.com/Luboš Volkov" target="_blank">Luboš Volkov</a>
