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
 * Set the criteria to the given object.
 *
 * @param {Object} configVal
 * @return {void}
 * @private
 */
function setCriteria(configVal) {
	self._criteria = configVal;
}

/**
 * Set the features.
 *
 * @param {Object} configVal
 * @return {void}
 * @private
 */
function setFeatures(configVal) {
	if(typeof configVal == 'function') {
		getFeatures = configVal;
		updateFeatures();
	} else {
		getFeatures = undefined;
	}
	if(typeof configVal == 'object') {
		self._features = configVal;
	}
}

/**
 * Update the features by reloading them, if possible.
 *
 * @return {void}
 * @private
 */
function updateFeatures() {
	if(!getFeatures) {
		return;
	}
	if(getFeatures.length === 0) {
		self._features = getFeatures() || self._features;
		return;
	}
	if(getFeatures.length === 1) {
		getFeatures(getFeaturesCallback);
		return;
	}
	throw new Error('FFlip: params.features function signature is invalid. Must accept zero arguments or one callback.');
}

/**
 * The callback called by the user-defined function for reloading features.
 *
 * @param {Object} data
 * @return {void}
 * @private
 */
function getFeaturesCallback(data) {
	self._features = data || self._features;
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


//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------

var self = module.exports = {

	// Object containing all fflip features
	_features: {},

	// Object containing all fflip criteria
	_criteria: {},

	// The reload rate for reloading the features
	_reloadRate: 30*1000,

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
		updateFeatures();
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
		var feature = self._features[featureName];
		if(typeof feature != 'object') {
			return null;
		}
		var featureCriteria = feature.criteria || {};
		var criteriaArray = Object.keys(featureCriteria);
		var isEnabled = true;
		if(criteriaArray.length == 0) {
			return false;
		}
		criteriaArray.forEach(function(cKey) {
			if(isEnabled) {
				var c_data = featureCriteria[cKey];
				var c_func = self._criteria[cKey];
				isEnabled = c_func(user, c_data);
			}
		});
		return isEnabled;
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
		for (var featureName in self._features) {
		  if (self._features.hasOwnProperty(featureName)) {
				if(flags[featureName] !== undefined) {
					userFeatures[featureName] = flags[featureName];
				} else {
					userFeatures[featureName] = self.isFeatureEnabledForUser(featureName, user);
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
			var err = new Error('FFlip: Feature ' + name + ' not found');
			err.fflip = true;
			err.statusCode = 404;
			return next(err);
		}

		// Check if cookies are enabled.
		if(!req.cookies) {
			var err = new Error('FFlip: Cookies are not enabled.');
			err.fflip = true;
			err.statusCode = 500;
			return next(err);
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
	},

};

/** @deprecated v2.x method names have been deprecated. These mappers will be removed in future versions. */
self.express_route = util.deprecate(self.expressRoute, 'fflip.express_route: Use fflip.expressRoute instead');
self.express_middleware = util.deprecate(self.expressMiddleware, 'fflip.express_middleware: Use fflip.expressMiddleware instead');
self.userFeatures = util.deprecate(self.getFeaturesForUser, 'fflip.userFeatures: Use fflip.getFeaturesForUser instead');
self.userHasFeature = util.deprecate(function(user, featureName) {
	return self.isFeatureEnabledForUser(featureName, user);
}, 'fflip.userHasFeature(user, featureName): Use fflip.isFeatureEnabledForUser(featureName, user) instead');
