//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------
var getFeatures,
    getCriteria,
    reloadInverval;

function setCriteria(configVal) {
    if(typeof configVal == 'function') {
        getCriteria = configVal;
        updateCriteria();
    } else {
        getCriteria = undefined;
    }
    if(typeof configVal == 'object') {
        self._criteria = configVal;
    }
}

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

function updateCriteria() {
    if(!getCriteria) {
        return;
    } else if(getCriteria.length === 0) {
        self._criteria = getCriteria() || self._criteria;
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
        self._features = getFeatures() || self._features;
        return;
    } else if(getFeatures.length === 1) {
        getFeatures(getFeaturesCallback);
        return;
    } else if(getFeatures.length > 1) {
        throw new Error('Too Many Arguments!');
    }
}

function getFeaturesCallback(data) {
    self._features = data || self._features;
}
function getCriteriaCallback(data) {
    self._features = data || self._features;
}

//--------------------------------------------------------------------------
// Public
//--------------------------------------------------------------------------
var self = module.exports = {

    _features: {},

    _criteria: {},

    _reloadRate: 30*1000,

    config: function(params) {
        // Set Criteria & Features
        setCriteria(params.criteria);
        setFeatures(params.features);

        // Refresh Rate
        self._reloadRate = params.reload*1000 || self._reloadRate;
        clearInterval(reloadInverval);
        if(getCriteria || getFeatures)
            reloadInverval = setInterval(self.reload, self._reloadRate);
    },

    reload: function() {
        updateCriteria();
        updateFeatures();
    },

    userHasFeature: function(user, f_name) {
        var featureCriteria = self._features[f_name];
        if(typeof featureCriteria == 'undefined') {
            return null;
        }
        if(Object.keys(featureCriteria).length === 0) {
            return false;
        }
        var isEnabled = true;
        Object.keys(featureCriteria).forEach(function(ckey) {
            if(isEnabled) {
                var c_name = ckey;
                var c_data = featureCriteria[ckey];
                var c_func = self._criteria[c_name];
                isEnabled  = c_func(user, c_data);
            }
        });
        return isEnabled;
    },

    featuresForUser: function(user) {
        var user_features = {};
        Object.keys(self._features).forEach(function(f_name) {
            user_features[f_name] = self.userHasFeature(user, f_name);
        });
        return user_features;
    }
};