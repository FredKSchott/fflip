'use strict';


//--------------------------------------------------------------------------
// Requirements
//--------------------------------------------------------------------------
var util = require('util');


//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var getFeatures,
	reloadInverval;

/**
 * Used to deprecate old express methods and provide the user with information for upgrading.
 *
 * @throws {Error} Always!
 * @return {void}
 */
function expressNoLongerSupportedThrowError() {
	throw new Error('fflip: Express support is no longer bundled with fflip. See CHANGELOG for instructions on updating.');
}

/**
 * Process the `criteria` data provided by the user. Handle any bad input,
 * deprecated formatting, and other edge cases caused by user-data here.
 *
 * @param {*} userInput Expects an array of criteria. Also supports the
 * deprecated object format.
 * @return {Object} The criteria dictionary, indexed by criteria ID
 */
function processUserCriteria(userInput) {
	if (typeof userInput !== 'object') {
		throw new Error('fflip: bad data passed for `criteria`');
	}

	if (!Array.isArray(userInput)) {
		return userInput;
	}

	var returnObj = {};
	userInput.forEach(function(criteriaObject) {
		returnObj[criteriaObject.id] = criteriaObject.check;
	});
	return returnObj;
}

/**
 * Process the `features` data provided by the user. Handle any bad input,
 * deprecated formatting, and other edge cases caused by user-data here.
 *
 * @param {*} userInput Expects an array of features. Also supports the
 * deprecated object format.
 * @return {Object} The features dictionary, indexed by feature ID
 */
function processUserFeatures(userInput) {
	if (typeof userInput !== 'object') {
		throw new Error('fflip: bad data passed for `features`');
	}

	if (!Array.isArray(userInput)) {
		return userInput;
	}

	var returnObj = {};
	userInput.forEach(function(featureObject) {
		returnObj[featureObject.id] = featureObject;
	});
	return returnObj;
}

/**
 * Set the criteria to the given object.
 *
 * @param {Object} configVal
 * @return {void}
 * @private
 */
function setCriteria(configVal) {
	self.criteria = processUserCriteria(configVal)
}

/**
 * Set the features.
 *
 * @param {Object} configVal
 * @return {void}
 * @private
 */
function setFeatures(configVal) {
	if (typeof configVal === 'function') {

		if (configVal.length > 1) {
			throw new Error('FFlip: `features` function signature is invalid. Must accept zero arguments or one callback.');
		}

		getFeatures = configVal;
		self.reload();
		return;
	}

	getFeatures = undefined;
	self.features = processUserFeatures(configVal);
}

/**
 * The callback called by the user-defined function for reloading features.
 *
 * @param {Object} data
 * @return {void}
 * @private
 */
function getFeaturesCallback(data) {
	self.features = processUserFeatures(data) || self.features;
}

/**
 * Sets the reload rate for fetching new features.

 * @param {int} rate The interval to fetch new features on, in seconds
 * @return {void}
 * @private
 */
function setReload(rate) {
	// Set the new reload rate
	self._reloadRate = rate * 1000 || self._reloadRate;
	// Clear any current interval
	clearInterval(reloadInverval);
	// Set a new interval, if applicable
	if(getFeatures) {
		reloadInverval = setInterval(self.reload, self._reloadRate);
	}
}

/**
 * Evaluate a set of critera. Return true if ALL criteria is met.
 *
 * @param {Object} criteriaSet The set of criteria, where each key is a criteria ID
 *        and each value is some data to send to that criteria function.
 * @param {Object} user The expected user object to check against in each criteria function.
 * @return {boolean} Returns true if ALL criteria are met, false otherwise.
 */
function evaluateCriteriaSet(criteriaSet, user) {
	return Object.keys(criteriaSet).reduce(function(currentResult, cName) {
		if (cName === '$veto') {
			return currentResult;
		}
		var c_data = criteriaSet[cName];
		var c_func = self.criteria[cName];
		return (c_func(user, c_data) && currentResult);
	}, true);
}

/**
 * Evaluate a list of criteria. Return true if ANY one member evaluates to true, and no
 * "vetoing" members evaluate to false.

 * @param {Object} criteriaList A list of criteria sets or nested criteria lists.
 * @param {Object} user The expected user object to check against in each criteria function.
 * @return {boolean} Returns true if if ANY one member evaluates to true, and no "vetoing"
 * members evaluate to false. Returns false otherwise.
 */
function evaluateCriteriaList(criteriaList, user) {
	var isEnabled = false;

	for (var i = 0, l = criteriaList.length; i < l; i++) {
		var listMember = criteriaList[i];
		var memberResult;

		if (Array.isArray(listMember)) {
			// if array, repeat this logic on each member of array, return true if ANY return true & NO vetos return false`
			memberResult = evaluateCriteriaList(listMember, user);
		} else {
			// if object, evaluate all and return true if ALL return true
			memberResult = evaluateCriteriaSet(listMember, user);
		}

		if (listMember.$veto && !memberResult) {
			return false;
		}

		isEnabled = memberResult || isEnabled;
	}

	return isEnabled;
}


//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------

var self = module.exports = {

	// Object containing all fflip features
	features: {},

	// Object containing all fflip criteria
	criteria: {},

	// The reload rate for reloading features
	_reloadRate: 30*1000,

	/**
	 * Configure fflip.
	 *
	 * @param  {Object} params
	 * @return {void}
	 */
	config: function(params) {
		// Set Criteria & Features
		setCriteria(params.criteria);
		setFeatures(params.features);
		setReload(params.reload);
	},

	/**
	 * Reload the features, if a reload is possible.
	 *
	 * @return {void}
	 */
	reload: function() {
		if(!getFeatures) {
			return;
		}
		if(getFeatures.length === 0) {
			self.features = processUserFeatures(getFeatures()) || self.features;
			return;
		}

		getFeatures(getFeaturesCallback);
	},

	/**
	 * Check if a user has some given feature, and returns a boolean. Returns null
	 * if the feature does not exist.
	 *
	 * @param {string} featureName The name of the feature to check for.
	 * @param {Object} user The User object that criterial will check against.
	 * @return {Boolean|null}
	 */
	isFeatureEnabledForUser: function(featureName, user) {
		var feature = self.features[featureName];

		// If feature does not exist, return null
		if (typeof feature === 'undefined') {
			return null;
		}
		// If feature isn't an object, something has gone terribly wrong
		// TODO(fks) 03-10-2016: Check for this on config, not on the fly
		if (typeof feature !== 'object') {
			throw new Error('fflip: Features are formatted incorrectly.');
		}
		// If feature.enabled is set, return its boolean form
		if (typeof feature.enabled !== 'undefined') {
			return !!feature.enabled;
		}
		// If feature.criteria is some non-object, return its boolean form
		if (typeof feature.criteria !== 'object') {
			return !!feature.criteria;
		}

		var featureCriteria;
		if (Array.isArray(feature.criteria)) {
			featureCriteria = feature.criteria;
		} else {
			featureCriteria = [feature.criteria];
		}

		if(featureCriteria.length == 0) {
			return false;
		}

		return evaluateCriteriaList(featureCriteria, user);
	},

	/**
	 * Get the availability of all features for a given user.
	 *
	 * @param {Object} user The User object that criterial will check against.
	 * @param {Object} flags A collection of overrides
	 * @return {Object} The collection of all features and their availability.
	 */
	getFeaturesForUser: function(user, flags) {
		flags = flags || {};
		var userFeatures = {};
		for (var featureName in self.features) {
			if (self.features.hasOwnProperty(featureName)) {
				if(flags[featureName] !== undefined) {
					userFeatures[featureName] = flags[featureName];
				} else {
					userFeatures[featureName] = self.isFeatureEnabledForUser(featureName, user);
				}
			}
		}
		return userFeatures;
	},

	/** @deprecated As of v4.0, Express support is no longer bundled with fflip. See CHANGELOG for instructions on updating. */
	express_middleware: expressNoLongerSupportedThrowError,
	expressMiddleware: expressNoLongerSupportedThrowError,
	express_route: expressNoLongerSupportedThrowError,
	expressRoute: expressNoLongerSupportedThrowError,
	express: expressNoLongerSupportedThrowError

};

/** @deprecated v3.x method names have been deprecated. These mappers will be removed in future versions. */
self.userFeatures = util.deprecate(self.getFeaturesForUser, 'fflip.userFeatures: Use fflip.getFeaturesForUser instead');
self.userHasFeature = util.deprecate(function(user, featureName) {
	return self.isFeatureEnabledForUser(featureName, user);
}, 'fflip.userHasFeature(user, featureName): Use fflip.isFeatureEnabledForUser(featureName, user) instead');
