;(function (factory) {
  'use strict';
  var g = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this;
  var module = g.module;
  var define = g.define;
  var angular = g.angular;

  if (typeof module !== "undefined" && typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory(angular);
  }
  if (typeof define !== "undefined" && typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    define(function () {
      return factory(angular);
    });
  }
  if (angular) {
    factory(angular);
  }
})(function (angular) {
  'use strict';
  if (!angular) throw new Error("this module depend on the Angular and you didn't load it");
  var atPromise = angular.module('atPromise', ['ngAnimate']);

  /**
   * 匹配函数的正则表达式
   * $0    最初传入的函数字符串
   * $1    函数名
   * $2    带括号的参数
   * $3    参数集合
   * /开始  (函数名) 可选空格 ( (可选参数集合) ) 可选空格;/i
   * /^([\w_$]+)\s?(\(([^\(\)]*)\))?\s*\;*\s*$/i;
   * @type {RegExp}
   */
  var MATCH_FUNCTION_REG = /^([\w\_\$\.]+)\s?(\(([^\(\)]*)\))?\s*\;*\s*$/i;

  /**
   * 匹配表达式的正则表达式
   * 如：
   * name = 123;
   * name = true ? 'hello' : 'hi';
   * @type {RegExp}
   */
  var EXPRESSION_REG = /^\s*([\w_$]+)\s?\=/im;

  // jQuery or jqLite
  var jqLite = angular.element || window.$ || window.jQuery;

  /**
   * 获取指令下，所包含的DOM合集，所有DOM均为jQuery对象
   * @param nodes
   * @returns {*}    数组
   */
  var getBlockNodes = function (nodes) {
    var node = nodes[0];
    var endNode = nodes[nodes.length - 1];
    var blockNodes;

    for (var i = 1; node !== endNode && (node = node.nextSibling); i++) {
      if (blockNodes || nodes[i] !== node) {
        if (!blockNodes) {
          blockNodes = jqLite(slice.call(nodes, 0, i));
        }
        blockNodes.push(node);
      }
    }

    return blockNodes || nodes;
  };

  /**
   * 可以用来匹配传入的回调函数或表达式
   * @param value
   * @returns {boolean}
   */
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

  /**
   * 判断是否为promise对象
   * 只支持$q生成的promise对象，不支持原生，或第三方
   * @param p
   * @param undefined
   * @returns {*}
   */
  var isPromise = function (p, undefined) {
    return p === undefined || !p ? false : !!(angular.isDefined(p) && p.then && angular.isFunction(p.then));
  };

  /**
   * 停止事件的广播
   * @param e        angular事件对象
   */
  var stopEvent = function (e) {
    angular.isFunction(e.preventDefault) && e.preventDefault();
    angular.isFunction(e.stopPropagation) && e.stopPropagation();
  };

  /**
   * 渲染DOM节点
   * ops:
   * {
           *    $transclude
           *    $animate
           *    $attr
           *    $element
           *    $window
           *    block
           *    childScope
           * }
   * @param ops
   */
  var renderDOM = function (ops) {
    if (!ops.childScope) {
      ops.$transclude(function (clone, newScope) {
        ops.childScope = newScope;
        clone[clone.length++] = ops.$window.document.createComment(' end ' + ops.directive + ': ' + ops.$attr[ops.directive] + ' ');
        ops.block = {
          clone: clone
        };
        ops.$animate.enter(clone, ops.$element.parent(), ops.$element);
      });
    }
  };

  /**
   * 移除DOM节点
   * @param ops
   */
  var unRenderDOM = function (ops) {
    if (ops.previousElements) {
      ops.previousElements.remove();
      ops.previousElements = null;
    }
    if (ops.childScope) {
      ops.childScope.$destroy();
      ops.childScope = null;
    }
    if (ops.block) {
      ops.previousElements = getBlockNodes(ops.block.clone);
      ops.$animate.leave(ops.previousElements).then(function () {
        ops.previousElements = null;
      });
      ops.block = null;
    }
  };

  /**
   * 生成各指令的回调函数
   */
  var generator = function (ops) {
    var fn, agm, context;
    var name = '';
    if (ops.directive === 'atPromise') {
      // promise 指令的回调函数
      name = ops.$attr[ops.ctrl.state + 'CallBack'];
    } else {
      // resolve reject finally 的回调函数
      name = ops.$attr.callBack;
    }

    if (isEmpty(ops.$attr.callBack)) return;

    fn = ops.ctrl.parseFnName(name)(ops.$scope);
    agm = ops.ctrl.parseFnAgm(name)(ops.$scope);
    fn.apply(context, agm);
  };

  angular.module('atPromise')
    .directive('atPromise', ['$animate', '$parse', '$timeout', '$window', function ($animate, $parse, $timeout, $window) {
      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        controller: function () {
          var vm = this;

          /**
           * 当前promise的状态
           * 初始值为pending
           * @type {string}
           */
          vm.state = 'pending';

          /**
           * resolve 或 reject的理由
           * @type {string}
           */
          vm.reason = '';

          /**
           * 解析 函数名 或 表达式
           *      doSome()    test = 'hello world'
           * @param fnStr
           * @returns {Function}
           */
          vm.parseFnName = function (fnStr) {
            return function ($scope) {
              var result,			// 返回function
                resultStr;		// 提取出来的function字符串
              if (!fnStr || /^[\s\;]*$/im.test(fnStr)) return angular.noop;

              /**
               * 传入function
               * 如： doSome('axe',22);
               */
              if (MATCH_FUNCTION_REG.test(fnStr)) {
                resultStr = MATCH_FUNCTION_REG.exec(fnStr)[1].replace(/\s/ig, '');
                result = $parse(resultStr)($scope);
                result = typeof result !== 'undefined' && angular.isFunction(result) ? result : angular.noop;
                return result;
              }
              /**
               * 传入表达式
               * 如：
               * name = 123;
               * name = true ? 'hello' : 'hi';
               */
              else if (EXPRESSION_REG.test(fnStr)) {
                return function () {
                  $scope.$eval(fnStr);
                }
              }
              /**
               * 既不是表达式，也不是函数
               */
              else {
                console.error('TypeError: %s is not a function or an expression', fnStr);
                return angular.noop;
              }
            }
          };

          /**
           * 解析函数参数
           * @param fnStr           function or expression string
           * @param undefined       init undefined
           * @returns {Function}
           */
          vm.parseFnAgm = function (fnStr, undefined) {
            return function ($scope) {
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
                  /**
                   * 传入的参数，不支持数组，json格式的对象
                   * TODO：支持数组与对象
                   * @type {Array|*}
                   */
                  agmStr = agmStr.split(',');
                } else {
                  return [];
                }
                result = [];
                angular.forEach(agmStr, function (v, i) {
                  result[i] = $parse(v.trim())($scope) || undefined;
                });
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
            }
          };

        },
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          /**
           * promise的监听函数
           * type:function
           */
          var promiseWatcher;

          /**
           * 传入的promise对象
           * type:promise
           */
          var promise = $parse($attr.atPromise)($scope);

          var ops = {
            $scope: $scope,
            $element: $element,
            $attr: $attr,
            $transclude: $transclude,
            $animate: $animate,
            $window: $window,
            $parse: $parse,
            block: null,
            childScope: null,
            directive: 'atPromise'
          };


          /**
           * 根据状态,返回回调函数
           * @param state
           */
          var callBack = function (state) {
            var fn, agm, context = null;
            if (isEmpty($attr[state + 'CallBack'])) return;
            fn = ctrl.parseFnName($attr[state + 'CallBack'])($scope);
            agm = ctrl.parseFnAgm($attr[state + 'CallBack'])($scope);
            fn.apply(context, agm);
          };

          var loadPromise = function (promise) {
            if (isPromise(promise)) {
              // init data
              ctrl.reason = '';
              ctrl.state = 'pending';
              $scope.$broadcast('newPromise');
              promise
                .then(function (reason) {
                  ctrl.reason = reason;
                  ctrl.state = 'resolve';
                }, function (reason) {
                  ctrl.reason = reason;
                  ctrl.state = 'reject';
                })
                .finally(function () {
                  /**
                   * 为空则表示不进入resolve或reject,该promise其实已响应过了
                   */
                  if (!ctrl.reason) {
                    // resolve
                    if (promise.$$state && promise.$$state.status !== undefined && promise.$$state.status === 1) {
                      ctrl.state = 'resolve';
                    }
                    // reject
                    else {
                      ctrl.state = 'reject';
                    }
                    ctrl.reason = promise.$$state.value;
                  }

                  /**
                   * 向下广播resolve或reject事件
                   */
                  $scope.$broadcast(ctrl.state + 'Promise');

                  /**
                   * resolve或reject的回调
                   */
                  callBack(ctrl.state);

                  /**
                   * 向下广播finally事件
                   */
                  $scope.$broadcast('donePromise');

                  /**
                   * finally的回调
                   */
                  callBack('finally');
                });
            }
          };

          /**
           * 指令初始化
           * @returns {*} promise
           */
          var init = function () {
            // 渲染视图
            renderDOM(ops);
            // 初始化promise
            loadPromise(promise);
          };

          /**
           * 监听promise的变化
           * 如果有新的promise覆盖旧的promise
           * 则重新运行指令，根据新的promise，重新渲染视图
           */
          var promiseWatchFn = function () {
            promiseWatcher = $scope.$watch($attr.atPromise, function (newPromise, oldPromise) {
              if (newPromise === oldPromise || !newPromise) return;
              if (isPromise(newPromise)) {
                loadPromise(newPromise);
              }
            });
          };

          /**
           * 启动指令
           */
          $timeout(function () {
            init();
            promiseWatchFn();
          }, 0);

          /**
           * 销毁指令时，则销毁监听函数
           */
          $scope.$on('$destroy', function () {
            promiseWatcher && angular.isFunction(promiseWatcher) && promiseWatcher();
          });
        }
      };
    }])
    .directive('atPending', ['$animate', '$window', function ($animate, $window) {
      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        require: '^?atPromise',
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          if (!ctrl) return;
          var ops = {
            $scope: $scope,
            $element: $element,
            $attr: $attr,
            ctrl: ctrl,
            $transclude: $transclude,
            $animate: $animate,
            $window: $window,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atPending'
          };

          $scope.$on('newPromise', function (e) {
            renderDOM(ops);
            stopEvent(e);
          });

          $scope.$on('donePromise', function (e) {
            unRenderDOM(ops);
            stopEvent(e);
          });

        }
      };
    }])
    .directive('atReject', ['$animate', '$window', '$parse', function ($animate, $window, $parse) {

      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        require: '^?atPromise',
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          if (!ctrl) return;

          var ops = {
            $scope: $scope,
            $element: $element,
            $attr: $attr,
            ctrl: ctrl,
            $transclude: $transclude,
            $animate: $animate,
            $window: $window,
            $parse: $parse,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atReject'
          };

          $scope.$on('newPromise', function (e) {
            unRenderDOM(ops);
            stopEvent(e);
          });

          $scope.$on('rejectPromise', function (e) {
            if (!isEmpty($attr.atReject)) {
              // at-resolve === reason
              if (!isEmpty(ctrl.reason) && ctrl.reason === $parse($attr.atReject)($scope)) {
                renderDOM(ops);
                generator(ops);
              }
            }
            else {
              renderDOM(ops);
              generator(ops);
            }
            stopEvent(e);
          });

        }
      };
    }])
    .directive('atResolve', ['$animate', '$window', '$parse', function ($animate, $window, $parse) {
      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        require: '^?atPromise',
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          if (!ctrl) return;

          var ops = {
            $scope: $scope,
            $element: $element,
            $attr: $attr,
            ctrl: ctrl,
            $transclude: $transclude,
            $animate: $animate,
            $window: $window,
            $parse: $parse,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atResolve',
            watcher: null
          };

          $scope.$on('newPromise', function (e) {
            unRenderDOM(ops);
            stopEvent(e);
          });

          $scope.$on('resolvePromise', function (e) {
            if (!isEmpty($attr.atResolve)) {
              // at-promise === reason
              if (!isEmpty(ctrl.reason) && ctrl.reason === $parse($attr.atResolve)($scope)) {
                renderDOM(ops);
                generator(ops);
              }
            }
            else {
              renderDOM(ops);
              generator(ops);
            }
            stopEvent(e);
          });
        }
      };
    }])
    .directive('atFinally', ['$animate', '$window', '$parse', function ($animate, $window, $parse) {
      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        require: '^?atPromise',
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          if (!ctrl) return;
          var ops = {
            $scope: $scope,
            $element: $element,
            $attr: $attr,
            ctrl: ctrl,
            $transclude: $transclude,
            $animate: $animate,
            $window: $window,
            $parse: $parse,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atFinally'
          };

          //var callBackFn, callBackFnAgm, context,
          //  fn = function () {
          //    callBackFn = ctrl.parseFnName($attr.callBack)($scope);
          //    callBackFnAgm = ctrl.parseFnAgm($attr.callBack)($scope);
          //    callBackFn.apply(context, callBackFnAgm);
          //  };

          $scope.$on('newPromise', function (e) {
            unRenderDOM(ops);
            stopEvent(e);
          });

          $scope.$on('donePromise', function (e) {
            if (!isEmpty($attr.atFinally)) {
              if (!isEmpty(ctrl.reason) && ctrl.reason === $parse($attr.atFinally)($scope)) {
                renderDOM(ops);
                generator(ops);
                //fn();
              }
            }
            else {
              renderDOM(ops);
              generator(ops);
              //fn();
            }
            stopEvent(e);
          });

        }
      };
    }]);
  return atPromise;
});