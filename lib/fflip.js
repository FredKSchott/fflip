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

    __express: function(app) {

        // Express Middleware
        app.use(function(req, res, next) {
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

        });

        // Manual Flipping Route
        app.get('/fflip/:action/:name', function(req, res, next) {
            var name = req.params.name;
            var action = req.params.action;
            if(self._features[name] === undefined) {
                return next(new Error("Features Does Not Exist"));
            }     
            if(!req.cookies) {
                return next(new Error("No Cookies"));
            }
            var flags = req.cookies.fflip || {};
            if (action == 'enable') {
                flags[name] = true;
            } else if (action == 'disable') {
                flags[name] = false;
            } else if (action == 'remove') {
                delete flags[name];
            } else {
                return next(new Error('Bad Action: ' + action + " must be enable, disable, or remove."));
            }
            res.cookie('fflip', flags, { maxAge: 900000 });
            res.send(name + 'is now ' + action);
            console.log(flags);
            //res.redirect('/');
        });

    },

}
