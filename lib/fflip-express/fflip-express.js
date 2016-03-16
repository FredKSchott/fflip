'use strict';


//--------------------------------------------------------------------------
// Requirements
//--------------------------------------------------------------------------
var FFlipRequestObject = require('./fflip-request');


//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------


//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------

module.exports = FFlipExpressIntegration;
function FFlipExpressIntegration(fflip, options) {

	options = options || {};
	this.options = {
		cookieName: options.cookieName || 'fflip',
		routeParamForName: options.routeParamForName || 'name',
		routeParamForAction: options.routeParamForAction || 'action',
		cookieMaxAge: options.cookieMaxAge || 900000
	};

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
	this.middleware = function(req, res, next) {

		// Attach the fflip object to the request
		req.fflip = new FFlipRequestObject(fflip, req.cookies[this.options.cookieName]);

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
	};

	/**
	 * Attach routes for manual feature flipping.
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Function} next
	 * @return {void}
	 */
	this.manualRoute = function(req, res, next) {
		var name = req.params[this.options.routeParamForName];
		var action = req.params[this.options.routeParamForAction];
		var actionName = '';

		// Check if feature exists.
		if(fflip.features[name] === undefined) {
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
		var flags = req.cookies[this.options.cookieName] || {};
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
		res.cookie(this.options.cookieName, flags, { maxAge: this.options.cookieMaxAge });
		res.json(200, {
			feature: name,
			action: action,
			status: 200,
			message: 'fflip: Feature ' + name + ' is now ' + actionName
		});
	};
}

/**
 * Attach all FFlip functionality to an express app. Includes helpers & routes.
 *
 * @param {Object} app An Express Application
 * @return {void}
 */
FFlipExpressIntegration.prototype.connectAll = function(app) {
	// Express Middleware
	app.use(this.middleware);
	// Manual Flipping Route (default route: '/fflip/:name/:action')
	app.get('/fflip/:' + this.options.routeParamForName + '/:' + this.options.routeParamForAction, this.manualRoute);
};
