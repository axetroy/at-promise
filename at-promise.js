;(function (factory) {
	'use strict';
	var g = typeof window !== 'undefined' ? window : global;
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
	var angular = ｇ.angular || null;
	if (!angular) throw new Error("this module depend on the Angular and you didn't load it");
	var atPromise = angular.module('atPromise', ['ngAnimate']);

	angular.module('atPromise')
		.directive('atPromise', function ($animate, $parse, $timeout, $window, $q) {
			return {
				multiElement: true,
				transclude: 'element',
				priority: 999,
				terminal: true,
				restrict: 'A',
				controller: function ($window) {
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
				},
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope,
						promiseWatcher,					// promise的监听函数
						context,								// 回调函数的执行上下文
						resCalBack,							// resolve的回调函数
						resCalBackAgm,					// resolve函数的参数
						rejCalBack,							// reject的回调函数
						rejCalBackAgm,					// reject函数的参数
						finCalBack,							// finally的回调函数
						finCalBackAgm;					// finally函数的参数

					// 传入的promise对象
					var promise = $parse($attr.atPromise)($scope);

					resCalBack = getFn($attr.resolveCallBack) || angular.noop;
					resCalBackAgm = getArguments($attr.resolveCallBack) || [];

					rejCalBack = getFn($attr.rejectCallBack) || angular.noop;
					rejCalBackAgm = getArguments($attr.rejectCallBack) || [];

					finCalBack = getFn($attr.finallyCallBack) || angular.noop;
					finCalBackAgm = getArguments($attr.finallyCallBack) || [];

					// resolve的回调函数
					var resFn = function () {
						resCalBack.apply(context, resCalBackAgm);
					};
					var rejFn = function () {
						rejCalBack.apply(context, rejCalBackAgm);
					};
					var finFn = function () {
						finCalBack.apply(context, finCalBackAgm);
					};

					//var resolveCallBack = getFn($attr.resolveCallBack) || angular.noop;
					//var resolveFnAgm = getArguments($attr.resolveCallBack) || [];
					//
					//var rejectCallBack = getFn($attr.rejectCallBack) || angular.noop;
					//var rejectFnAgm = getArguments($attr.rejectCallBack) || [];
					//
					//var finallyCallBack = getFn($attr.finallyCallBack) || angular.noop;
					//var finallyFnAgm = getArguments($attr.finallyCallBack) || [];

					ctrl.reason = '';

					/**
					 * 指令初始化
					 * @returns {*} promise
					 */
					var init = function () {
						var deferred = $q.defer();
						// 渲染视图
						if (!childScope) {
							$transclude(function (clone, newScope) {
								childScope = newScope;
								clone[clone.length++] = $window.document.createComment(' end promise: ' + $attr.promise + ' ');
								block = {
									clone: clone
								};
								$animate.enter(clone, $element.parent(), $element);
							});
						}
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
									if (ctrl.state === 'resolve') {
										//resolveCallBack.apply(null, resolveFnAgm);
										resFn();
									} else if (ctrl.state === 'reject') {
										//rejectCallBack.apply(null, rejectFnAgm);
										rejFn();
									}
									//finallyCallBack.apply(null, finallyFnAgm);
									finFn();
									deferred.resolve();
								});
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
										$scope.$broadcast('promiseEvent', ctrl.reason);
										if (ctrl.state === 'resolve') {
											//resolveCallBack.apply(null, resolveFnAgm);
											resFn();
										} else if (ctrl.state === 'reject') {
											//rejectCallBack.apply(null, rejectFnAgm);
											rejFn();
										}
										//finallyCallBack.apply(null, finallyFnAgm);
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
					function getArguments(fnStr) {
						var result,		// 返回出去的参数数组
							agmReg,			// 提取参数的正则表达式
							agms;				// 提取出来的参数字符串
						fnStr = fnStr || '';
						if (!fnStr) return;
						result = [];
						agmReg = /\(([^\(\)]*)\)/i;
						agms = fnStr.trim().match(agmReg)[1].split(',');
						angular.forEach(agms, function (v, i) {
							result[i] = $parse(v.trim())($scope);
						});
						return result;
					}

					/**
					 * 返回回调函数
					 * @param fnStr        函数字符串
					 * @returns {*}        function || undefined
					 */
					function getFn(fnStr) {
						var result,			// 返回function
							fnReg,				// 匹配function的正则表达式
							resultStr;		// 提取出来的function字符串
						fnStr = fnStr || '';
						if (!fnStr) return;
						fnReg = /^[\w_$]+/i;
						resultStr = fnStr.trim().replace(/\s/ig, '').match(fnReg)[0];
						result = $parse(resultStr)($scope);
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
		})
		.directive('atPending', function ($animate, $window) {
			return {
				multiElement: true,
				transclude: 'element',
				priority: 999,
				terminal: true,
				restrict: 'A',
				require: '^?atPromise',
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope, previousElements;
					if (!ctrl) return;

					var removeDOM = function () {
						if (previousElements) {
							previousElements.remove();
							previousElements = null;
						}
						if (childScope) {
							childScope.$destroy();
							childScope = null;
						}
						if (block) {
							previousElements = ctrl.getBlockNodes(block.clone);
							$animate.leave(previousElements).then(function () {
								previousElements = null;
							});
							block = null;
						}
					};

					var appendDOM = function () {
						if (!childScope) {
							$transclude(function (clone, newScope) {
								childScope = newScope;
								clone[clone.length++] = $window.document.createComment(' end atPending: ' + $attr.atPending + ' ');
								block = {
									clone: clone
								};
								$animate.enter(clone, $element.parent(), $element);
							});
						}
					};

					$scope.$on('promiseEvent', function (e) {
						e = e || {};
						if (ctrl.state === 'pending') {
							appendDOM();
						} else {
							removeDOM();
						}
						ctrl.stopEvent(e);
					});

				}
			};
		})
		.directive('atReject', function ($animate, $window, $parse) {

			return {
				multiElement: true,
				transclude: 'element',
				priority: 999,
				terminal: true,
				restrict: 'A',
				require: '^?atPromise',
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope, previousElements;
					var $reason = $parse($attr.atReject)($scope);
					if (!ctrl) return;

					var removeDOM = function () {
						if (previousElements) {
							previousElements.remove();
							previousElements = null;
						}
						if (childScope) {
							childScope.$destroy();
							childScope = null;
						}
						if (block) {
							previousElements = ctrl.getBlockNodes(block.clone);
							$animate.leave(previousElements).then(function () {
								previousElements = null;
							});
							block = null;
						}
					};

					var appendDOM = function () {
						if (!childScope) {
							$transclude(function (clone, newScope) {
								childScope = newScope;
								clone[clone.length++] = $window.document.createComment(' end atReject: ' + ctrl.atReject + ' ');
								block = {
									clone: clone
								};
								$animate.enter(clone, $element.parent(), $element);
							});
						}
					};

					$scope.$on('promiseEvent', function (e, reason) {
						e = e || {};
						if (ctrl.state === 'reject') {
							if ($attr.atReject !== undefined && $attr.atReject !== '') {
								if (reason === $reason) {
									appendDOM();
								} else {
									removeDOM();
								}
							} else {
								appendDOM();
							}
						}
						else {
							removeDOM();
						}
						ctrl.stopEvent(e);
					});

				}
			};
		})
		.directive('atResolve', function ($animate, $window, $parse) {
			return {
				multiElement: true,
				transclude: 'element',
				priority: 999,
				terminal: true,
				restrict: 'A',
				require: '^?atPromise',
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope, previousElements;
					var $reason = $parse($attr.atResolve)($scope);

					if (!ctrl) return;

					var removeDOM = function () {
						if (previousElements) {
							previousElements.remove();
							previousElements = null;
						}
						if (childScope) {
							childScope.$destroy();
							childScope = null;
						}
						if (block) {
							previousElements = ctrl.getBlockNodes(block.clone);
							$animate.leave(previousElements).then(function () {
								previousElements = null;
							});
							block = null;
						}
					};

					var appendDOM = function () {
						if (!childScope) {
							$transclude(function (clone, newScope) {
								clone.addClass('hello');
								childScope = newScope;
								clone[clone.length++] = $window.document.createComment(' end atResolve: ' + $attr.atResolve + ' ');
								block = {
									clone: clone
								};
								$animate.enter(clone, $element.parent(), $element);
							});
						}
					};

					$scope.$on('promiseEvent', function (e, reason) {
						e = e || {};
						if (ctrl.state === 'resolve') {
							if ($attr.atResolve !== undefined && $attr.atResolve !== '') {
								if (reason === $reason) {
									appendDOM();
								} else {
									removeDOM();
								}
							} else {
								appendDOM();
							}
						}
						else {
							removeDOM();
						}
						ctrl.stopEvent(e);
					});

				}
			};
		})
		.directive('atFinally', function ($animate, $window) {
			return {
				multiElement: true,
				transclude: 'element',
				priority: 999,
				terminal: true,
				restrict: 'A',
				require: '^?atPromise',
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope, previousElements;
					if (!ctrl) return;

					var removeDOM = function () {
						if (previousElements) {
							previousElements.remove();
							previousElements = null;
						}
						if (childScope) {
							childScope.$destroy();
							childScope = null;
						}
						if (block) {
							previousElements = ctrl.getBlockNodes(block.clone);
							$animate.leave(previousElements).then(function () {
								previousElements = null;
							});
							block = null;
						}
					};

					var appendDOM = function () {
						if (!childScope) {
							$transclude(function (clone, newScope) {
								clone.addClass('hello');
								childScope = newScope;
								clone[clone.length++] = $window.document.createComment(' end atFinally: ' + $attr.atFinally + ' ');
								block = {
									clone: clone
								};
								$animate.enter(clone, $element.parent(), $element);
							});
						}
					};

					$scope.$on('promiseEvent', function (e) {
						e = e || {};
						ctrl.state !== 'pending' ? appendDOM() : removeDOM();
						ctrl.stopEvent(e);
					});

				}
			};
		});
	return atPromise;
});