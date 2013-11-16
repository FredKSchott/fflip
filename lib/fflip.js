//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var features = {},
    criteria = {},
    getFeatures,
    getCriteria,
    refreshRate = 30*1000,
    refreshInterval;

function setCriteria(configVal) {
    if(typeof configVal == 'function') {
        getCriteria = configVal;
    } else {
        criteria = configVal || criteria;
        getCriteria = undefined;
    }
    updateCriteria();
}

function setFeatures(configVal) {
    if(typeof configVal == 'function') {
        getFeatures = configVal;
    } else {
        features = configVal || features;
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
        setCriteria(params.criteria);
        setFeatures(params.features);

        // Refresh Rate
        refreshRate = params.reload*1000 || refreshRate;
        clearInterval(refreshInterval);
        if(getCriteria || getFeatures)
            refreshInterval = setInterval(self.reload, refreshRate);
    },

    reload: function() {
        updateCriteria();
        updateFeatures();
    },

    featuresForUser: function(user) {
        var user_features = {};
        Object.keys(features).forEach(function(f_name) {
            user_features[f_name] = self.userHasFeature(user, f_name);
        });
        return user_features;
    },

    userHasFeature: function(user, f_name) {
        var featureCriteria = features[f_name];
        var isEnabled = true;
        Object.keys(featureCriteria).forEach(function(ckey) {
            if(isEnabled) {
                var c_name = ckey;
                var c_data = featureCriteria[ckey];
                var c_func = criteria[c_name];
                isEnabled  = c_func(user, c_data);
            }
        });
        return isEnabled;
    }
}