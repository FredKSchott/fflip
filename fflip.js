/**
 * @fileoverview Description of controller
 * @author ldap name
 */

//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var features = require('./features'),
    criteria = require('./criteria');


//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------
var self = module.exports = {
    /**
     * Description of function.
     * @param user
     */
    featuresForUser: function(user) {
        //map across features
        var user_features = {};
        Object.keys(features).forEach(function(f_name) {
            user_features[f_name] = self.userHasFeature(user, f_name);
        });
        console.log(user_features);
        return user_features;
    },
    userHasFeature: function(user, f_name) {
        var criterias = features[f_name];
        var f_enabled = true;
        Object.keys(criterias).forEach(function(ckey) {
            if(f_enabled) {
                var c_name = ckey;
                var c_data = criterias[ckey];
                var c_func = criteria[c_name];
                f_enabled  = c_func(user, c_data);
            }
        });
        return f_enabled;
    }
}