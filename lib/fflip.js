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

    featuresForUser: function(user, flags) {
        flags = flags || {};
        var user_features = {};
        Object.keys(self._features).forEach(function(f_name) {
            if(flags[f_name] !== undefined) {
                user_features[f_name] = flags[f_name];
            } else {
                user_features[f_name] = self.userHasFeature(user, f_name);
            }
        });
        return user_features;
    },

    _express_middleware: function(req, res, next) {
        req.fflip = {};
        req.fflip.flags = req.cookies.fflip;
        req.fflip.features = undefined;
        req.fflip.setFeatures = function(user) {
            req.fflip.features = self.featuresForUser(user, req.fflip.flags);
        };

        // Wrap res.render() to set options.features automatically
        var _render = res.render;
        res.render = function(view, options, callback) {
            if(typeof req.fflip.features == "object") {
                options.Features = JSON.stringify(req.fflip.features);
            }
            _render.call(res, view, options, callback);
        };
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