<a href="https://www.npmjs.com/package/fflip">
  <img align="right" src="https://nodei.co/npm/fflip.png?compact=true" />
</a>
# <img src="http://fredkschott.com/img/fflipIcon2.png" /> fflip

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users based on their user id, join date, membership status, and whatever else you can think of. __fflip's__ goal is to be the most powerful and extensible feature flipping/toggling module out there.

- Describes __custom criteria and features__ using easy-to-read JSON
- Delivers features down to the client for __client-side feature flipping__
- Includes __Express Middleware__ for additional features like __feature flipping via cookie__
- __System-Agnostic:__ Built to support any database, user representation or web framework you can throw at it

```
npm install fflip --save
```


## Getting Started

Below is a simple example that uses __fflip__ to deliver a closed beta to a fraction of users:

```javascript
// Include fflip
var fflip = require('fflip');

fflip.config({
  criteria: ExampleCriteria, // defined below
  features: ExampleFeatures  // defined below
});

// Get all of a user's enabled features...
someFreeUser.features = fflip.userFeatures(someFreeUser);
if(someFreeUser.features.closedBeta === true) {
  console.log('Welcome to the Closed Beta!');
}

// ... or just check this single feature.
if (fflip.userHasFeature(someFreeUser, 'closedBeta') === true) {
  console.log('Welcome to the Closed Beta!');
}
```


### Criteria

**Criteria** are the rules that define access to different features. Each criteria takes a user object and some data as arguments, and returns true/false if the user matches that criteria. You will use these criteria to restrict/allow features for different subsets of your userbase.

```javascript
var ExampleCriteria = [
  {
    id: 'isPaidUser', // required
    check: function(user, isPaid) { // required
      return user.isPaid == isPaid;
    }
  },
  {
    id: 'percentageOfUsers',
    check: function(user, percent) {
      return (user.id % 100 < percent * 100);
    }
  },
  {
    id: 'allowUserIDs',
    check: function(user, allowedIDs) {
      return allowedIDs.indexOf(user.id) > -1;
    }
  }
];
```


### Features

**Features** represent some special behaviors in your application. They also define a set of criteria to test users against for each feature. When you ask fflip if a feature is enabled for some user, it will check that user against each rule/criteria, and return "true" if the user passes.

Features are described in the following way:

```javascript
var ExampleFeatures = [
  {
    id: 'closedBeta', // required
    // if `criteria` is in an object, ALL criteria in that set must evaluate to true to enable for user
    criteria: {isPaidUser: true, percentageOfUsers: 0.50}
  },
  {
    id: 'newFeatureRollout',
    // if `criteria` is in an array, ANY ONE set of criteria must evaluate to true to enable for user
    criteria: [{isPaidUser: true}, {percentageOfUsers: 0.50}]
  },
  {
    id: 'experimentalFeature',
    name: 'An Experimental Feature', // user-defined properties are optional but can be used to add important metadata
    description: 'Experimental feature still in development, useful for internal development', // user-defined
    owner: 'Fred K. Schott <fkschott@gmail.com>', // user-defined
    enabled: false, // sets the feature on or off for all users, required unless `criteria` is present instead
  },
]
```

The value present for each rule is passed in as the data argument to it's criteria function. This allows you to write more general, flexible, reusable rules.

Rule sets & lists can be nested and combined. It can help to think of criteria sets as a group of `AND` operators, and lists as a set of `OR` operators.


#### Veto Criteria

If you'd like to allow wider access to your feature while still preventing a specific group of users, you can use the `$veto` property. If the `$veto` property is present on a member of a criteria list (array), and that member evaluates to false, the entire list will evaluate to false regardless of it's other members.

```javascript
{
  // Enabled if user is paid OR in the lucky 50% group of other users currently using a modern browser
  criteria: [{isPaidUser: true}, {percentageOfUsers: 0.50, usingModernBrowser: true}]
  // Enabled if user is paid OR in the lucky 50% group of other users, BUT ONLY if using a modern browser
  criteria: [{isPaidUser: true}, {percentageOfUsers: 0.50}, {usingModernBrowser: true, $veto: true}]
}
```


## Usage

- `.config(options) -> void`: Configure fflip (see below)
- `.userHasFeature(user, featureName) -> boolean`: Return true/false if featureName is enabled for user
- `.userFeatures(user) -> Object`: Return object of true/false for all features for user
- `.reload() -> void`: Force a reload (if loading features dynamically)
- `.express(app) -> void`: Connect with an Express app or router (see below)


### Configuration

Configure fflip using any of the following options:

```javascript
fflip.config({
  criteria: {}, // Criteria Array
  features: {}, // Features Array | Function (see below)
  reload: 30,   // Interval for refreshing features, in seconds
});
```


### Loading Features Dynamically

fflip also accepts functions for loading features. If fflip is passed a function with no arguments it will call the function and accept the return value. To load asynchronously, pass a function that sends a features object to a callback. fflip will receive the callback and set the data accordingly. In both cases, fflip will save the function and call it again every X seconds, as set by the reload parameter.

```javascript
// Load Criteria Synchronously
var getFeaturesSync = function() {
  var collection = db.collection('features');
  var featuresArr = collection.find().toArray();
  /* Process/Format `featuresArr` if needed (format described above) */
  return featuresArr;
}

// Load Features Asynchronously
var getFeaturesAsync = function(callback) {
  var collection = db.collection('features');
  collection.find().toArray(function(err, featuresArr) {
    /* Handle err
     * Process/Format `featuresArr` if needed (format described above) */
    callback(featuresArr);
  });
}

fflip.config({
  criteria: ExampleCriteriaObject,
  features: getFeaturesAsync, // or: getFeaturesSync
  reload: 60 // update available features every 60 seconds
});
```


## Express Integration

fflip provides two easy integrations with the popular web framework [Express](http://expressjs.com/).

#### fflip.expressMiddleware()

```javascript
app.use(fflip.expressMiddleware);
```

**req.fflip:** A special fflip request object is attached to the request object, and includes the following functionality:

```
req.fflip = {
  setForUser(user): Given a user, attaches the features object to the request (at req.fflip.features). Make sure you do this before calling has()!
  has(featureName): Given a feature name, returns the feature boolean, undefined if feature doesn't exist. Throws an error if setForUser() hasn't been called
}
```

**Use fflip in your templates:** Once `setForUser()` has been called, fflip will include a `Features` template variable that contains your user's enabled features. Here is an example of how to use it with Handlebars: `{{#if Features.closedBeta}} Welcome to the Beta! {{/if}}`

**Use fflip on the client:** Once `setForUser()` has been called, fflip will also include a `FeaturesJSON` template variable that is the JSON string of your user's enabled features. To deliver this down to the client, just make sure your template something like this: `<script>var Features = {{ FeaturesJSON }}; </script>`.


#### fflip.expressRoute()

```javascript
// Feel free to use any route you'd like, as long as `name` & `action` exist as route parameters.
app.get('/custom_path/:name/:action', fflip.expressRoute);
```

**A route for manually flipping on/off features:** If you have cookies enabled, you can visit this route to manually override a feature to always return true/false for your own session. Just replace ':name' with the Feature name and ':action' with 1 to enable, 0 to disable, or -1 to reset (remove the cookie override). This override is stored in the user's cookie under the name `fflip`, which is then read by `fflip.expressMiddleware()` and `req.fflip` automatically.

#### fflip.express()

Sets up the express middleware and route automatically. Equivilent to running:

```javascript
app.use(fflip.expressMiddleware);
app.get('/custom_path/:name/:action', fflip.expressRoute);
```


## Special Thanks

Original logo designed by <a href="http://thenounproject.com/Luboš Volkov" target="_blank">Luboš Volkov</a>
