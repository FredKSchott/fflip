[![Build Status](https://travis-ci.org/FredKSchott/fflip.png)](https://travis-ci.org/FredKSchott/fflip) 

<img src="http://fredkschott.com/images/fflipIcon2.png" /> fflip
============================ 
__Follow [@FredKSchott](http://www.twitter.com/fredkschott) for development news and updates!__

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users based on thier user id, join date, membership status, and whatever else you can think of. __fflip's__ goal is to be the most extendable and customizable feature flipping/toggling module out there.

- Describes __custom criteria and features__ using easy-to-read JSON
- Delivers features down to the client for additional __client-side feature flipping__
- Includes __Express Middleware__ for easy integration with Express applications  
- __Everything-Agnostic:__ Supports any database, user representation or framework you can throw at it

```
npm install fflip --save
```

##Getting Started
Below is a simple example that uses __fflip__ to deliver a closed beta to a fraction of users:
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
void   config(options)                   // Configure fflip (see below)
Object featuresForUser(user)             // Return object of true/false for all features for user
Bool   userHasFeature(user, featureName) // Return true/false if featureName is enabled for user
void   reload()                          // Force a reload of criteria/features
void   __express(app)                    // Connect with an Express app (see below)
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
__fflip__ also accepts functions for loading criteria and features. If __fflip__ is passed a funciton with no arguments it will call the function and accept the return value. To load asyncronously, pass a function that sends a features/criteria data object to a callback. __fflip__ will recieve the callback and set the data accordingly. In both cases, __fflip__ will save these functions and call them again every X seconds, as set by the reload parameter.
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


##Express Integration
__fflip__ provides easy integration with the popular web framework [Express](https://github.com/visionmedia/express). Just call ``fflip.__express(app)`` wherever you set up your server to enable the following:

####__A route for manually flipping on/off features__  
If you have cookies enabled, you can visit ``/fflip/:name/:action`` to manually override a feature to always return true/false for your own session. Just replace ':name' with the Feature name and ':action' with 1 to enable, 0 to disable, or -1 to reset (remove the cookie override). This override is stored in the user's cookie.

####req.fflip
A __fflip__ object is attached to the request, and includes the following funciontality:
```
req.fflip = {
  flags: Any override flags set by the fflip cookie
  features: A user's fflip features object. Undefined until setFeatures() is called.
  setFeatures(user): Given a user, attaches the features object to the request (at req.fflip.features)
  hasFeature(featureName): Given a feature name, returns the feature boolean, or null if setFeatures() has't been called
}
```
To avoid polluting the request object, All fflip functionality is contained within req.fflip. But (If your implementation allows it) you can add aliases directly onto the request object.

####Automatically deliver Features to the client  
The __fflip__ Express middleware wraps res.render() to always the req.fflip.features object as a  ``Features`` template variable. To deliver this down to the client, just make sure your template contains the code ``<script>var Features = <%= Features %></script>``.


##Special Thanks
Original logo designed by <a href="http://thenounproject.com/Luboš Volkov" target="_blank">Luboš Volkov</a>
