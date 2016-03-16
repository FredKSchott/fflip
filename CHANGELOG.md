# Changelog

## v4.0

v4.0 brings some new changes to make fflip even more flexible. 

#### New: Plugin Support

FFlip has always promised to support every database & web framework. But up to this point, integrating FFlip with your web framework of choice hasn't been easy. Support for Express did come bundled, but it also took advantage of some private logic to work properly.

Starting with v4.0, FFlip will support a more open plugin architecture for integrations. The library interface will be more stable, and all previously private properties have been made public. We'll keep integrations open-ended for now, so how you build yours will be up to you. You can check out the new fflip-express for some inspiration and to see what's possible. We'll also try to keep a list of available plugins here.


#### Express Support Pulled Out

Given our new dedication to plugins, express support has been pulled out of the main library and into fflip-express. As such, the following methods & properties are now longer available:

- `fflip.expressMiddleware()` (Will throw error when used)
- `fflip.expressRoute()` (Will throw error when used)
- `fflip.express()` (Will throw error when used)
- `fflip.maxCookieAge` is no longer available / will do nothing if set directly

Check out fflip-express readme for instructions on integrating with the new express plugin. At the time of writing all logic is still the same, so moving to the new librard should only require a couple small code changes.


#### Updated Interface

The following methods have new signatures:

- `fflip.userHasFeature(user, featureName)` -> `fflip.isFeatureEnabledForUser(featureName, user)`
- `fflip.userFeatures(user)` -> `fflip.getFeaturesForUser(user)`

The following private properties have been made public:

- `fflip._features` -> `fflip.features`
- `fflip._criteria` -> `fflip.criteria`


## v3.0

v3.0 brings some major changes to make fflip feature & criteria logic even more powerful. To help ease the transition, v3.x will strive to be backwards compatible with the v2.x interface and expected behavior. That means no breaking changes are expected in this release, even though we're using the 3.0 version number.

#### Updated Interface

The following methods have new signatures:

- `fflip.express_middleware()` -> `fflip.expressMiddleware()`
- `fflip.express_route()` -> `fflip.expressRoute()`

#### New Criteria & Features Format

- All criteria & features should now be provided as arrays instead of objects.

View the README for a more in depth explanation of this new format.

#### New, More Powerful Feature Logic

- **Feature criteria now supports matching multiple groups of users**: If a list of criteria exists for a feature, any one criteria may be met to evaluate to true for a given user.
- **Feature criteria now support "vetos"**: If that vetoing criteria evaluates to false, it's entire parent array will also evaluate to false regardless of other criteria met.

View the README for a more in depth explanation of this new behavior.
