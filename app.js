/*
	FFLIP
	REQUIREMENTS
	- Evaluate to true/false for different users
	- easily integrate with most popular/any user modal systems
	- Easily extend property filters
*/

//	CRITERIA
//	see criteria.js


//	FEATURES
//	see features.js


//	CODE
var fflip = require('./fflip');
//	individually
//if(user.feature('newFeature1'))
//	all
var user = {
	id: 50,
	paid: false
};
console.log(fflip.userHasFeature(user, 'newFeature2'));
var features = fflip.featuresForUser(user);
//user.features = fflip.enabledForUser(user);
