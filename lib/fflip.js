/**
 * @fileoverview FFlip - Feature Flipping Moduel
 */
'use strict';


//--------------------------------------------------------------------------
// Requirements
//--------------------------------------------------------------------------
var FFlipRequestObject = require('./fflip-request');


//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var getFeatures,
	reloadInverval;

/**
 * Set the criteria to the given object.
 * @param {Object} configVal
 * @return {void}
 * @private
 */
function setCriteria(configVal) {
	self._criteria = configVal;
}

/**
 * Set the features.
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

	/**
	 * Configure fflip.
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
	 * @return {void}
	 */
	reload: function() {
		updateFeatures();
	},

	/**
	 * Check if a user has some given feature, and returns a boolean. 
	 * Returns null if the feature does not exist.
	 * @param {Object} user The User object that criterial will check against.
	 * @param {string} featureName The name of the feature to check for.
	 * @return {Boolean|null}
	 */
	userHasFeature: function(user, featureName) {
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
	 * @param {Object} user The User object that criterial will check against.
	 * @param {Object} flags A collection of overrides 
	 *        [@deprecated this flag will be removed soon]
	 * @return {Object} The collection of all features and their availability.
	 */
	userFeatures: function(user, flags) {
		flags = flags || {};
		var user_features = {};
		Object.keys(self._features).forEach(function(featureName) {
			if(flags[featureName] !== undefined) {
				user_features[featureName] = flags[featureName];
			} else {
				user_features[featureName] = self.userHasFeature(user, featureName);
			}
		});
		return user_features;
	},

	/**
	 * Express middleware. Attaches helper functions to the request object
	 * and wrap the res.render to automatically include features in the
	 * template.
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Function} next
	 * @return {void}
	 * @private
	 */
	_express_middleware: function(req, res, next) {

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
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Function} next
	 * @return {void}
	 * @private
	 */
	_express_route: function(req, res, next) {
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
			case '1':
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
		res.cookie('fflip', flags, { maxAge: 900000 });
		res.json(200, {
			feature: name,
			action: action,
			status: 200,
			message: 'fflip: Feature ' + name + ' is now ' + actionName
		});
	},

	/**
	 * Attach FFlip functionality to an express app. Includes helpers & routes.
	 * @param {Object} app An Express Application
	 * @return {void}
	 */
	express: function(app) {
		// Express Middleware
		app.use(_express_middleware);
		// Manual Flipping Route
		app.get('/fflip/:name/:action', _express_route);
	},

};