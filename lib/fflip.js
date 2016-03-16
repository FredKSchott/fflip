'use strict';


//--------------------------------------------------------------------------
// Requirements
//--------------------------------------------------------------------------
var FFlipRequestObject = require('./fflip-request');
var util = require('util');


//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var getFeatures,
	reloadInverval;

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
	self._criteria = processUserCriteria(configVal)
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
	self._features = processUserFeatures(configVal);
}

/**
 * The callback called by the user-defined function for reloading features.
 *
 * @param {Object} data
 * @return {void}
 * @private
 */
function getFeaturesCallback(data) {
	self._features = processUserFeatures(data) || self._features;
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
		var c_func = self._criteria[cName];
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
	_features: {},

	// Object containing all fflip criteria
	_criteria: {},

	// The reload rate for reloading features
	_reloadRate: 30*1000,

	// The max cookie age for the express integration
	maxCookieAge: 900000,

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
			self._features = processUserFeatures(getFeatures()) || self._features;
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
	userHasFeature: function(user, featureName) {
		var feature = self._features[featureName];

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
	userFeatures: function(user, flags) {
		flags = flags || {};
		var userFeatures = {};
		for (var featureName in self._features) {
			if (self._features.hasOwnProperty(featureName)) {
				if(flags[featureName] !== undefined) {
					userFeatures[featureName] = flags[featureName];
				} else {
					userFeatures[featureName] = self.userHasFeature(user, featureName);
				}
			}
		}
		return userFeatures;
	},

	/**
	 * Express middleware. Attaches helper functions to the request object
	 * and wrap the res.render to automatically include features in the
	 * template.
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Function} next
	 * @return {void}
	 */
	expressMiddleware: function(req, res, next) {

		// Attach the fflip object to the request
		req.fflip = new FFlipRequestObject(self, req.cookies.fflip);

		// Wrap res.render() to set options.features automatically
		res._render = res.render;
		res.render = function(view, options, callback) {
			options = options || {};
			options.Features = req.fflip.features;
			options.FeaturesJSON = JSON.stringify(req.fflip.features);
			res._render(view, options, callback);
		};

		// Carry On!
		next();
	},

	/**
	 * Attach routes for manual feature flipping.
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Function} next
	 * @return {void}
	 */
	expressRoute: function(req, res, next) {
		var name = req.params.name;
		var action = req.params.action;
		var actionName = '';

		// Check if feature exists.
		if(self._features[name] === undefined) {
			var notFoundError = new Error('FFlip: Feature ' + name + ' not found');
			notFoundError.fflip = true;
			notFoundError.statusCode = 404;
			return next(notFoundError);
		}

		// Check if cookies are enabled.
		if(!req.cookies) {
			var noCookiesError = new Error('FFlip: Cookies are not enabled.');
			noCookiesError.fflip = true;
			noCookiesError.statusCode = 500;
			return next(noCookiesError);
		}

		// Apply the new action.
		var flags = req.cookies.fflip || {};
		switch(action) {
			// enable
			case '1':
				flags[name] = true;
				actionName = 'enabled';
				break;
			// disable
			case '0':
				flags[name] = false;
				actionName = 'disabled';
				break;
			// remove
			case '-1':
				delete flags[name];
				actionName = 'removed';
				break;
			// other: propogate error
			default:
				var err = new Error('FFlip: Bad Input. Action (' + action + ') must be 1 (enable), 0 (disable), or -1 (remove)');
				err.fflip = true;
				err.statusCode = 400;
				return next(err);
		}

		// set new fflip cookie with new data
		res.cookie('fflip', flags, { maxAge: self.maxCookieAge });
		res.json(200, {
			feature: name,
			action: action,
			status: 200,
			message: 'fflip: Feature ' + name + ' is now ' + actionName
		});
	},

	/**
	 * Attach FFlip functionality to an express app. Includes helpers & routes.
	 *
	 * @param {Object} app An Express Application
	 * @return {void}
	 */
	express: function(app) {
		// Express Middleware
		app.use(this.expressMiddleware);
		// Manual Flipping Route
		app.get('/fflip/:name/:action', this.expressRoute);
	}

};

/** @deprecated v2.x method names have been deprecated. These mappers will be removed in future versions. */
self.express_route = util.deprecate(self.expressRoute, 'fflip.express_route: Use fflip.expressRoute instead');
self.express_middleware = util.deprecate(self.expressMiddleware, 'fflip.express_middleware: Use fflip.expressMiddleware instead');
