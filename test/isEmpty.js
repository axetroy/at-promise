/**
 * Created by axetroy on 16-3-14.
 */

var angular = {};

angular.isString = function isString(value) {
  return typeof value === 'string';
};

angular.isArray = Array.isArray;

angular.isObject = function isObject(value) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === 'object';
};

var isEmpty = function (value) {
  var result;
  if (angular.isString(value)) {
    result = !value ? true : /^[\s\;]*$/im.test(value);
  }
  else if (angular.isArray(value)) {
    result = value.length ? false : true;
  }
  else if (value && angular.isObject(value)) {
    result = Object.keys(value).length ? false : true;
  }
  else {
    result = false;
  }
  return !!result;
};
module.exports = isEmpty;