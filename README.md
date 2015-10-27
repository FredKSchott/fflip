<a href="https://www.npmjs.com/package/fflip">
  <img align="right" src="https://nodei.co/npm/fflip.png?compact=true" />
</a>
# <img src="http://fredkschott.com/images/fflipIcon2.png" /> fflip

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users based on their user id, join date, membership status, and whatever else you can think of. __fflip's__ goal is to be the most powerful and extensible feature flipping/toggling module on. the. planet.

- Describes __custom criteria and features__ using easy-to-read JSON
- Delivers features down to the client for additional __client-side feature flipping__
- Includes __Express Middleware__ for additional features like __feature flipping via cookie__
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

// Get all of a user's enabled features
var Features = fflip.userFeatures(someFreeUser);
if(Features.closedBeta) {
  console.log('Welcome to the Closed Beta!');
}
// Or, just get a single one
if (fflip.userHasFeature(someFreeUser, 'closedBeta')) {
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
    return idArr.indexOf(user.id) > -1;
  }
}
```

###Features
Features contain sets of criteria to test users against. The value associated with the criteria is passed in as the data argument of the criteria function. A user will have a featured enabled if they match all listed criteria, otherwise the feature is disabled. Features can include other optional properties for context. Features are described as follows:
```javascript
var ExampleFeaturesObject = {
  paidFeature: {
    criteria: {
      isPaidUser: true
    }
  },
  closedBeta: {
    name: "A Closed Beta",
    criteria: {
      allowUserIDs: [20,30,80,181]
    }
  },
  newFeatureRollout: {
    name: "A New Feature Rollout",
    description: "Rollout of that new feature over the next month",
    owner: "FredKSchott", // Remember: These are all optional, only criteria is required 
    criteria: {
      isPaidUser: false,
      percentageOfUsers: 0.50
    }
  }
}
```

##Usage
```
void   config(options)                   // Configure fflip (see below)
Object userFeatures(user)                // Return object of true/false for all features for user
Bool   userHasFeature(user, featureName) // Return true/false if featureName is enabled for user
void   reload()                          // Force a reload (if loading features dynamically)
void   express(app)                      // Connect with an Express app or router (see below)
```

Configure __fflip__ using any of the following options:
```javascript
fflip.config({
  criteria: {}, // Criteria Object
  features: {}, // Features Object | Function (see below)
  reload: 30,   // Interval for refreshing features, in seconds
});
```

###Loading Features Dynamically
__fflip__ also accepts functions for loading features. If __fflip__ is passed a function with no arguments it will call the function and accept the return value. To load asynchronously, pass a function that sends a features object to a callback. __fflip__ will receive the callback and set the data accordingly. In both cases, __fflip__ will save the function and call it again every X seconds, as set by the reload parameter.
```javascript
// Load Criteria Synchronously
var getFeaturesSync = function() {
  var collection = db.collection('features');
  var featuresArr = collection.find().toArray();
  /* Process featuresArr -> featuresObj (format described above) */
  return featuresObj;
}

// Load Features Asynchronously
var getFeaturesAsync = function(fflip_callback) {
  var collection = db.collection('features');
  collection.find().toArray(function(err, featuresArr) {
    /* Handle err
     * Process featuresArr -> featuresObj (format described above) */
    fflip_callback(featuresObj);
  });
}

fflip.config({
  criteria: ExampleCriteriaObject,
  features: getFeaturesAsync, // or: getFeaturesSync
  reload: 60 // update available features every 60 seconds
});
```


##Express Integration
__fflip__ provides easy integration with the popular web framework [Express](https://github.com/visionmedia/express).  
Just call ``fflip.express()`` with your Express application or Express 4.0 router to enable the following:


####A route for manually flipping on/off features
If you have cookies enabled, you can visit ``/fflip/:name/:action`` to manually override a feature to always return true/false for your own session. Just replace ':name' with the Feature name and ':action' with 1 to enable, 0 to disable, or -1 to reset (remove the cookie override). This override is stored as in the user's cookie under the name `fflip`.

####req.fflip
A __fflip__ object is attached to the request, and includes the following functionality:
```
req.fflip = {
  setForUser(user): Given a user, attaches the features object to the request (at req.fflip.features). Make sure you do this before calling has()!
  has(featureName): Given a feature name, returns the feature boolean, undefined if feature doesn't exist. Throws an error if setForUser() hasn't been called
}
```

####Use fflip in your templates
*NOTE: This will only be populated if you call `req.fflip.setForUser` beforehand.*  
The __fflip__ Express middleware includes a `Features` template variable that contains your user's enabled features. Here is an example of how to use it with Handlebars: `{{#if Features.closedBeta}} Welcome to the Beta! {{/if}}`

####Use fflip on the client  
*NOTE: This will only be populated if you call `req.fflip.setForUser` beforehand.*  
The __fflip__ Express middleware also includes a `FeaturesJSON` template variable that is the JSON string of your user's enabled features. To deliver this down to the client, just make sure your template something like this: ``<script>var Features = {{ FeaturesJSON }}; </script>``. 

####Low-level integration
If you need a finer-grained Express integration, such as changing the URL for manual overrides, adding security middleware, or applying middleware on a subset of routes, you can use ``express_middleware`` and ``express_route`` directly.
```
app.use(fflip.express_middleware);
app.get('/custom_path/:name/:action', fflip.express_route);
```

##Special Thanks
Original logo designed by <a href="http://thenounproject.com/Luboš Volkov" target="_blank">Luboš Volkov</a>
