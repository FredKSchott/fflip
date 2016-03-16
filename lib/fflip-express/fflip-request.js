'use strict';

 /**
  * FFlip Request Object - Express/Connect Helper
  *
  * @param {FFlip} fflip The fflip main module
  * @param {[Object]} flags A set of feature overrides, these flags will
  *        take precedence over the normal feature criteria.
  * @constructor
  */
module.exports = FFlipRequestObject;
function FFlipRequestObject(fflip, flags) {
	this._fflip = fflip;
	this._flags = flags || {};
	this.features = {};
	this.isSet = false;
}

/**
 * Sets the features for a given user
  *
 * @param {Object} user A user object to test criteria against for each feature
 * @return {void}
 */
FFlipRequestObject.prototype.setForUser = function(user) {
	this.features = this._fflip.getFeaturesForUser(user, this._flags);
	this.isSet = true;
};

/**
 * Check if a user has a certain feature enabled/disabled
  *
 * @param  {string} featureName The name of the feature to check for
 * @return {Boolean} True if feature is enabled, false otherwise
 * @throws {Error} If features have not yet been set (via setForUser())
 */
FFlipRequestObject.prototype.has = function(featureName) {
	return this.isSet ? !!this.features[featureName] : null;
};