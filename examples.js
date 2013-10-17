//	CRITERIA
//	see criteria.js


//	FEATURES
//	see features.js


//	CODE
var fflip = require('./fflip');
fflip.config({
  criteria: require('./criteria'),
  features: require('./features'),
});
//	individually
//if(user.hasFeature('newFeature1'))
//	all
var user = {
	id: 50,
	isPaid: false
};
var Features = fflip.featuresForUser(user);
console.log(fflip.userHasFeature(user, 'newFeature2'));
console.log(Features);
console.log(Features.newFeature3);
//user.features = fflip.enabledForUser(user);
