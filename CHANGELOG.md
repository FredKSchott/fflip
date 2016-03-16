# Changelog

## v3.0

v3.0 brings some major changes to make fflip even more powerful. To help ease the transition, v3.x will strive to be backwards compatible with the v2.x interface and expected behavior. That means no breaking changes are expected in this release, even though we're using the 3.0 version number.

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
