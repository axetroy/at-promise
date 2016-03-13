/**
 * Created by axetroy on 16-3-13.
 */
var MATCH_FUNCTION_REG = /^([\w_$]+)\s?(\(([^\(\)]*)\))?\s*\;*\s*$/i;
var EXPRESSION_REG = /^\s*([\w_$]+)\s?\=/im;
var match = {};

match.isFunction = function (fnStr) {
  return MATCH_FUNCTION_REG.test(fnStr);
};

match.getFunctionName = function (fnStr) {
  return MATCH_FUNCTION_REG.exec(fnStr)[1].replace(/\s/ig, '')
};

match.getAgm = function (fnStr) {
  var result,			// 返回出去的参数数组
    agmStr;				// 提取出来的参数字符串

  if (!fnStr || /^[\s\;]*$/im.test(fnStr)) return [];

  /**
   * 传入function
   * 如： doSome('axe',22);
   */
  if (MATCH_FUNCTION_REG.test(fnStr)) {
    agmStr = MATCH_FUNCTION_REG.exec(fnStr)[3];
    if (agmStr) {
      agmStr = agmStr.split(',');
    } else {
      return [];
    }
    result = [];
    agmStr.forEach(function (v, i) {
      result[i] = v.trim() || undefined;
    });
    //angular.forEach(agmStr, function (v, i) {
    //  result[i] = $parse(v.trim())($scope) || undefined;
    //});
    return result || [];
  }
  /**
   * 传入表达式
   * 如：
   * name = 123;
   * name = true ? 'hello' : 'hi';
   */
  else if (EXPRESSION_REG.test(fnStr)) {
    return [];
  }
  else {
    return [];
  }
};

module.exports = match;
