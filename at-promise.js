;(function (factory) {
  'use strict';
  var g = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  var module = g.module;
  var define = g.define;

  // AMD
  if (typeof module !== "undefined" && typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  }
  // commonJS
  if (typeof define !== "undefined" && typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    define(function () {
      return factory();
    });
  }
  // browser
  if (g.angular) {
    factory();
  }
})(function () {
  'use strict';
  var ｇ = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  var angular = ｇ.angular;
  if (!angular) throw new Error("this module depend on the Angular and you didn't load it");
  var atPromise = angular.module('atPromise', ['ngAnimate']);

  angular.module('atPromise')
    .directive('atPromise', ['$animate', '$parse', '$timeout', '$window', '$q', function ($animate, $parse, $timeout, $window, $q) {
      return {
        multiElement: true,
        transclude: 'element',
        priority: 999,
        terminal: true,
        restrict: 'A',
        controller: ['$window', function ($window) {
          var vm = this;

          // 当前promise的状态，初始值为pending
          vm.state = 'pending';

          // jQuery or jqLite
          var jqLite = $window.$ || $window.jQuery || $window.angular.element;

          /**
           * 获取指令下，所包含的DOM合集，所有DOM均为jQuery对象
           * @param nodes
           * @returns {*}    数组
           */
          vm.getBlockNodes = function getBlockNodes(nodes) {
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
           * 判断是否为promise对象
           * 只支持$q生成的promise对象，不支持原生，或第三方
           * @param p
           * @param undefined
           * @returns {*}
           */
          vm.isPromise = function isPromise(p, undefined) {
            return p === undefined ? false :
            angular.isDefined(p) && p.then && angular.isFunction(p.then) && p.$$state && p.$$state.status === 0;
          };

          /**
           * 停止事件的广播
           * @param e        angular事件对象
           */
          vm.stopEvent = function (e) {
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
          vm.renderDOM = function (ops) {
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
          vm.unRenderDOM = function (ops) {
            if (ops.previousElements) {
              ops.previousElements.remove();
              ops.previousElements = null;
            }
            if (ops.childScope) {
              ops.childScope.$destroy();
              ops.childScope = null;
            }
            if (ops.block) {
              ops.previousElements = vm.getBlockNodes(ops.block.clone);
              ops.$animate.leave(ops.previousElements).then(function () {
                ops.previousElements = null;
              });
              ops.block = null;
            }
          };
        }],
        link: function ($scope, $element, $attr, ctrl, $transclude) {
          // TODO:让每个回调函数都能够定义上下文
          var fnReg,								// 匹配function的正则表达式
            promise,								// 传入的promise对象
            promiseWatcher,					// promise的监听函数
            context,								// 回调函数的执行上下文
            resFn,									// resolve的回调函数
            rejFn,									// reject的回调函数
            finFn;									// finally的回调函数

          var ops = {
            $transclude: $transclude,
            $animate: $animate,
            $attr: $attr,
            $element: $element,
            $window: $window,
            block: null,
            childScope: null,
            directive: 'atPromise'
          };

          /**
           * resolve 或 reject的理由
           * @type {string}
           */
          ctrl.reason = '';

          /**
           * $0    最初传入的函数字符串
           * $1    函数名
           * $2    带括号的参数
           * $3    参数集合
           * /开始  (函数名) 可选空格 ( (可选参数集合) ) 可选空格;/i
           * /^([\w_$]+)\s?(\(([^\(\)]*)\))?\s*\;*\s*$/i;
           * @type {RegExp}
           */
          fnReg = /^([\w_$]+)\s?(\(([^\(\)]*)\))?\s*\;*\s*$/i;

          promise = $parse($attr.atPromise)($scope);

          resFn = function () {
            if (!$attr.resolveCallBack) return;
            getFn($attr.resolveCallBack).apply(context, getAgm($attr.resolveCallBack));
          };
          rejFn = function () {
            if (!$attr.rejectCallBack) return;
            getFn($attr.rejectCallBack).apply(context, getAgm($attr.rejectCallBack));
          };
          finFn = function () {
            if (!$attr.finallyCallBack) return;
            getFn($attr.finallyCallBack).apply(context, getAgm($attr.finallyCallBack));
          };

          /**
           * 指令初始化
           * @returns {*} promise
           */
          var init = function () {
            var deferred = $q.defer();
            // 渲染视图
            ctrl.renderDOM(ops);
            // 初始化promise
            if (ctrl.isPromise(promise)) {
              ctrl.state = 'pending';
              $scope.$broadcast('promiseEvent');
              promise
                .then(function (reason) {
                  ctrl.reason = reason;
                  ctrl.state = 'resolve';
                }, function (reason) {
                  ctrl.reason = reason;
                  ctrl.state = 'reject';
                })
                .finally(function () {
                  $scope.$broadcast('promiseEvent', ctrl.reason);
                  ctrl.state === 'resolve' ? resFn() : rejFn();
                  finFn();
                  deferred.resolve();
                });
            } else {
              deferred.resolve();
            }
            return deferred.promise;
          };

          /**
           * 监听promise的变化
           * 如果有新的promise覆盖旧的promise
           * 则重新运行指令，根据新的promise，重新渲染视图
           */
          var promiseWatch = function () {
            promiseWatcher = $scope.$watch($attr.atPromise, function (newPromise, oldPromise) {
              if (newPromise === oldPromise || !newPromise) return;
              if (ctrl.isPromise(newPromise)) {
                ctrl.state = 'pending';
                $scope.$broadcast('promiseEvent');
                newPromise
                  .then(function (reason) {
                    ctrl.reason = reason;
                    ctrl.state = 'resolve';
                  }, function (reason) {
                    ctrl.reason = reason;
                    ctrl.state = 'reject';
                  })
                  .finally(function () {
                    debugger;
                    $scope.$broadcast('promiseEvent', ctrl.reason);
                    debugger;
                    ctrl.state === 'resolve' ? resFn() : rejFn();
                    finFn();
                  });
              }
            });
          };

          /**
           * 返回传入的回调函数的参数集合
           * @param fnStr        函数字符串
           * @returns {Array}    数组
           */
          function getAgm(fnStr) {
            var result,			// 返回出去的参数数组
              agmStr;				// 提取出来的参数字符串
            if (!fnStr) return [];
            agmStr = fnReg.exec(fnStr)[3];
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
           * 返回回调函数
           * @param fnStr        函数字符串
           * @returns {*}        function
           */
          function getFn(fnStr) {
            var result,			// 返回function
              resultStr;		// 提取出来的function字符串
            if (!fnReg.test(fnStr)) {
              console.error('TypeError: %s is not a function', fnStr);
              return angular.noop;
            }
            resultStr = fnReg.exec(fnStr)[1].replace(/\s/ig, '');
            result = $parse(resultStr)($scope);
            result = typeof result !== 'undefined' && angular.isFunction(result) ? result : angular.noop;
            return result;
          }

          /**
           * 启动指令
           */
          $timeout(function () {
            /**
             * 初始化完成后，才监听promise的变化
             */
            init()
              .then(promiseWatch, angular.noop)
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
            $transclude: $transclude,
            $animate: $animate,
            $attr: $attr,
            $element: $element,
            $window: $window,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atPending'
          };

          $scope.$on('promiseEvent', function (e) {
            e = e || {};
            ctrl.state === 'pending' ? ctrl.renderDOM(ops) : ctrl.unRenderDOM(ops);
            ctrl.stopEvent(e);
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
            $transclude: $transclude,
            $animate: $animate,
            $attr: $attr,
            $element: $element,
            $window: $window,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atReject'
          };

          $scope.$on('promiseEvent', function (e, reason) {
            e = e || {};
            if (ctrl.state === 'reject') {
              if ($attr.atReject !== undefined && $attr.atReject !== '') {
                reason === $parse($attr.atReject)($scope) ? ctrl.renderDOM(ops) : ctrl.unRenderDOM(ops);
              } else {
                ctrl.renderDOM(ops);
              }
            }
            else {
              ctrl.unRenderDOM(ops);
            }
            ctrl.stopEvent(e);
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
            $transclude: $transclude,
            $animate: $animate,
            $attr: $attr,
            $element: $element,
            $window: $window,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atResolve'
          };

          $scope.$on('promiseEvent', function (e, reason) {
            e = e || {};
            if (ctrl.state === 'resolve') {
              if ($attr.atResolve !== undefined && $attr.atResolve !== '') {
                reason === $parse($attr.atResolve)($scope) ? ctrl.renderDOM(ops) : ctrl.unRenderDOM(ops);
              } else {
                ctrl.renderDOM(ops);
              }
            }
            else {
              ctrl.unRenderDOM(ops);
            }
            ctrl.stopEvent(e);
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
            $transclude: $transclude,
            $animate: $animate,
            $attr: $attr,
            $element: $element,
            $window: $window,
            block: null,
            childScope: null,
            previousElements: null,
            directive: 'atFinally'
          };

          $scope.$on('promiseEvent', function (e, reason) {
            e = e || {};
            if (ctrl.state !== 'pending') {
              if ($attr.atFinally !== undefined && $attr.atFinally !== '') {
                reason === $parse($attr.atFinally)($scope) ? ctrl.renderDOM(ops) : ctrl.unRenderDOM(ops);
              } else {
                ctrl.renderDOM(ops);
              }
            } else {
              ctrl.unRenderDOM(ops);
            }
            ctrl.stopEvent(e);
          });

        }
      };
    }]);
  return atPromise;
});