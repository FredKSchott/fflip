'use strict';
//--------------------------------------------------------------------------
// Private
//--------------------------------------------------------------------------


var getFeatures,
    getCriteria,
    reloadInverval;

function setCriteria(configVal) {
    self._criteria = configVal;
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
        updateFeatures();
    },

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

    _express_middleware: function(req, res, next) {

        // Attach the fflip object to the request
        req.fflip = {
            _isSet: false,
            features: {}
        };
        if(req.cookies) {
            req.fflip.flags = req.cookies.fflip;
        } else {
            req.fflip.flags = {};
        }
        req.fflip.setForUser = function(user) {
            req.fflip.features = self.userFeatures(user, req.fflip.flags);
            req.fflip._isSet = true;
        };
        req.fflip.has = function(featureName) {
            if(!req.fflip._isSet) {
                console.error('FFlip: features not set - call setForUser() before checking for features (and consider adding middleware to always set features)');
                return null;
            }
            return req.fflip.features[featureName];
        };

        // Wrap res.render() to set options.features automatically
        res._render = res.render;
        res.render = function(view, options, callback) {
            if(typeof req.fflip.features == "object") {
                options.Features = req.fflip.features;
                options.FeaturesJSON = JSON.stringify(req.fflip.features);
            }
            res._render(view, options, callback);
        };

        // Carry On!
        next();
    },

    _express_route: function(req, res, next) {
        var name = req.params.name;
        var action = req.params.action;
        var actionName = '';
        if(self._features[name] === undefined) {
            res.json(404, {
                status: 404,
                message: "Feature " + name + " not found"
            });
            return;
        }
        if(!req.cookies) {
            res.json(500, {
                status: 500,
                message: "Cookies aren't enabled"
            });
            return;
        }
        var flags = req.cookies.fflip || {};
        if (action == '1') {
            flags[name] = true;
            actionName = 'enabled';
        } else if (action == '0') {
            flags[name] = false;
            actionName = 'disabled';
        } else if (action == '-1') {
            delete flags[name];
            actionName = 'removed';
        } else {
            res.json(400, {
                status: 400,
                message: 'Bad Action: ' + action + " must be 1 (enable), 0 (disable), or -1 (remove)"
            });
            return;
        }
        res.cookie('fflip', flags, { maxAge: 900000 });
        res.json(200, {
            feature: name,
            action: action,
            status: 200,
            message: 'fflip: Feature ' + name + ' is now ' + actionName
        });
    },

    __express: function(app) {

        // Express Middleware
        app.use(self._express_middleware);

        // Manual Flipping Route
        app.get('/fflip/:name/:action', self._express_route);
    },

};