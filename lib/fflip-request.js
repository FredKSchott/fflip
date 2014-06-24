'use strict';
module.exports = FFlipRequestObject;

 /**
  * FFlip Request Object - Express/Connect Helper
  * @param {FFlip} fflip The fflip main module
  * @param {[Object]} flags A set of feature overrides, these flags will 
  *        take precedence over the normal feature criteria.
  * @constructor
  */
function FFlipRequestObject(fflip, flags) {
	this.isSet = false;
	this._features = null;
	this._fflip = fflip;
	this._flags = flags || {};
}

/**
 * Sets the features for a given user
 * @param {Object} user A user object to test criteria against for each feature
 * @return {void}
 */
FFlipRequestObject.prototype.setForUser = function(user) {
	this._features = this._fflip.userFeatures(user, this._flags);
	this.isSet = true;
};

/**
 * Check if a user has a certain feature enabled/disabled
 * @param  {string} featureName The name of the feature to check for
 * @return {Boolean} True if feature is enabled, false otherwise
 * @throws {Error} If features have not yet been set (via setForUser())
 */
FFlipRequestObject.prototype.has = function(featureName) {
	if(!this.isSet) {
		throw new Error('FFlip: features not set - call setForUser() before checking for features (and consider adding middleware to always set features)');
	}
	return this._features[featureName];
};