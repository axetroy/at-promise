/**
 * Created by axetroy on 16-3-14.
 */


var angular = {};

angular.isDefined = function isDefined(value) {
  return typeof value !== 'undefined';
};
angular.isFunction = function isFunction(value) {
  return typeof value === 'function';
};


var isPromise = function (p, undefined) {
  return p === undefined ? false :
    !!(angular.isDefined(p) && p.then && angular.isFunction(p.then) && p.$$state && p.$$state.status === 0);
};
module.exports = isPromise;