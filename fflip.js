/**
 * @fileoverview Description of controller
 * @author ldap name
 */


//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var features = {},
    criteria = {},
    getFeatures,
    getCriteria,
    refreshRate = false,
    refreshIntrval;

function setCriteria(params) {
    if(params.criteria instanceof Function) {
        getCriteria = params.criteria;
    } else {
        getCriteria = undefined;
    }
    updateCriteria();
}

function setFeatures(params) {
    if(params.features instanceof Function) {
        getFeatures = params.features;
    } else {
        getFeatures = undefined;
    }
    updateFeatures();
}

function updateCriteria() {
    if(!getCriteria) {
        return;
    } else if(getCriteria.length === 0) {
        criteria = getCriteria() || criteria;
        return;
    } else if(getCriteria.length === 1) {
        getCriteria(getCriteriaCallback);
        return;
    } else if(getCriteria.length > 1) {
        throw new Error('Too Many Arguments!');
    }
}

function updateFeatures() {
    if(!getFeatures) {
        return;
    } else if(getFeatures.length === 0) {
        features = getFeatures() || features;
        return;
    } else if(getFeatures.length === 1) {
        getFeatures(getFeaturesCallback);
        return;
    } else if(getFeatures.length > 1) {
        throw new Error('Too Many Arguments!');
    }
}

function getFeaturesCallback(data) {
    features = data || features;
}
function getCriteriaCallback(data) {
    features = data || features;
}

//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------
var self = module.exports = {
    config: function(params) {
        // Set Criteria & Features
        setCriteria(params);
        setFeatures(params);

        // Refresh Rate
        refreshRate = params.reload*1000 || refreshRate;
        if(refreshRate)
            refreshIntrval = setInterval(self.reload, refreshRate);
        else
            clearInterval(refreshIntrval);
    },

    reload: function() {
        console.log('reload');
        updateCriteria();
        updateFeatures();
    },

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