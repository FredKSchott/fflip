<a href="https://www.npmjs.com/package/fflip">
  <img align="right" src="https://nodei.co/npm/fflip.png?compact=true" />
</a>
# <img src="http://fredkschott.com/img/fflipIcon2.png" /> fflip

Working on an experimental new design? Starting a closed beta? Rolling out a new feature over the next few weeks? Fa-fa-fa-flip it! __fflip__ gives you complete control over releasing new functionality to your users based on their user id, join date, membership status, and whatever else you can think of. __fflip's__ goal is to be the most powerful and extensible feature flipping/toggling module out there.

- Create __custom criteria__ to segment users & features based on your audience.
- __View & edit feature access__ in one easy place, and not scattered around your code base.
- __System-Agnostic:__ Support any database, user representation or web framework you can throw at it.
- __Extensible:__ Supports 3rd-party plugins for your favorite libraries (like [our Express integration](https://github.com/FredKSchott/fflip-express)!)

```
npm install fflip --save
```


## Integrations

As mentioned, fflip's goal is to be flexible enough to integrate with any web framework, database, or ORM. The following integrations are known to exist:

- [fflip-express](https://github.com/FredKSchott/fflip-express): Express.js integration

If you're interested in creating an integration, don't hesitate to reach out or create an issue if some functionality is missing. And if you've created an integration, please [add it](https://github.com/FredKSchott/fflip/edit/master/README.md) to the list above!


## Getting Started

Below is a simple example that uses __fflip__ to deliver a closed beta to a fraction of users:

```javascript
// Include fflip
let fflip = require('fflip');

fflip.config({
  criteria: ExampleCriteria, // defined below
  features: ExampleFeatures  // defined below
});

// Get all of a user's enabled features...
someFreeUser.features = fflip.getFeaturesForUser(someFreeUser);
if(someFreeUser.features.closedBeta === true) {
  console.log('Welcome to the Closed Beta!');
}

// ... or just check this single feature.
if (fflip.isFeatureEnabledForUser('closedBeta', someFreeUser) === true) {
  console.log('Welcome to the Closed Beta!');
}
```


### Criteria

**Criteria** are the rules that define access to different features. Each criteria takes a user object and some data as arguments, and returns true/false if the user matches that criteria. You will use these criteria to restrict/allow features for different subsets of your userbase.

```javascript
let ExampleCriteria = [
  {
    id: 'isPaidUser',
    check: function(user, isPaid) {
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
let ExampleFeatures = [
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
    name: 'An Experimental Feature', // user-defined properties are optional but can be used to add important metadata on both criteria & features
    description: 'Experimental feature still in development, useful for internal development', // user-defined
    owner: 'Fred K. Schott <fkschott@gmail.com>', // user-defined
    enabled: false, // sets the feature on or off for all users, required if `criteria` is not present
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
- `.isFeatureEnabledForUser(featureName, user) -> boolean`: Return true/false if featureName is enabled for user
- `.getFeaturesForUser(user) -> Object`: Return object of true/false for all features for user
- `.reload() -> void`: Force a reload (if loading features dynamically)


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
let getFeaturesSync = function() {
  let collection = db.collection('features');
  let featuresArr = collection.find().toArray();
  /* Process/Format `featuresArr` if needed (format described above) */
  return featuresArr;
}

// Load Features Asynchronously
let getFeaturesAsync = function(callback) {
  let collection = db.collection('features');
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

## Special Thanks

Original logo designed by <a href="http://thenounproject.com/Luboš Volkov" target="_blank">Luboš Volkov</a>
