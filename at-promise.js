;(function (factory) {
	'use strict';
	var g, module, define;
	g = typeof window !== 'undefined' ? window : global;
	module = g.module;
	define = g.define;
	if (typeof module !== "undefined" && typeof module === "object" && typeof module.exports === "object") {
		module.exports = factory();
	}
	if (typeof define !== "undefined" && typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
		define(function () {
			return factory();
		});
	}
	if (g.angular) {
		factory();
	}
})(function () {
	'use strict';
	var ｇ, angular, atPromise;
	ｇ = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
	angular = ｇ.angular || null;
	if (!angular) throw new Error("this module depend on the Angular and you didn't load it");
	atPromise = angular.module('atPromise', ['ngAnimate']);

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
					vm.state = 'pending';

					var jqLite = $window.$ || $window.jQuery || $window.angular.element;

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

					vm.isPromise = function isPromise(p, undefined) {
						return p === undefined ? false :
						angular.isDefined(p) && p.then && angular.isFunction(p.then) && p.$$state && p.$$state.status === 0;
					};

					vm.stopEvent = function (e) {
						angular.isFunction(e.preventDefault) && e.preventDefault();
						angular.isFunction(e.stopPropagation) && e.stopPropagation();
					};
				},
				link: function postLink($scope, $element, $attr, ctrl, $transclude) {
					var block, childScope, promiseWatcher;
					var promise = $parse($attr.atPromise)($scope);

					var resolveCallBack = getFn($attr.resolveCallBack) || angular.noop;
					var resolveFnAgm = getArguments($attr.resolveCallBack) || [];

					var rejectCallBack = getFn($attr.rejectCallBack) || angular.noop;
					var rejectFnAgm = getArguments($attr.rejectCallBack) || [];

					var finallyCallBack = getFn($attr.finallyCallBack) || angular.noop;
					var finallyFnAgm = getArguments($attr.finallyCallBack) || [];

					ctrl.promiseName = $attr.atPromise;
					ctrl.reason = '';

					var init = function () {
						var deferred = $q.defer();
						// render the view
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
						// init promise
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
										resolveCallBack.apply(null, resolveFnAgm);
									} else if (ctrl.state === 'reject') {
										rejectCallBack.apply(null, rejectFnAgm);
									}
									finallyCallBack.apply(null, finallyFnAgm);
									deferred.resolve();
								});
						}
						return deferred.promise;
					};

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
											resolveCallBack.apply(null, resolveFnAgm);
										} else if (ctrl.state === 'reject') {
											rejectCallBack.apply(null, rejectFnAgm);
										}
										finallyCallBack.apply(null, finallyFnAgm);
									});
							}
						});
					};

					function getArguments(fnStr) {
						var result = [];
						var agmReg = /\(([^\(\)]*)\)/i;
						var agms = fnStr.trim().match(agmReg)[1].split(',');
						angular.forEach(agms, function (v, i) {
							result[i] = $parse(v.trim())($scope);
						});
						return result;
					}

					function getFn(fnStr) {
						var result;
						var fnReg = /^[\w_$]+/i;
						result = fnStr.trim().replace(/\s/ig, '').match(fnReg)[0];
						return $parse(result)($scope);
					}

					// bootstrap the directive
					$timeout(function () {
						init()
							.then(promiseWatch, angular.noop)
					}, 0);

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
								clone[clone.length++] = $window.document.createComment(' end reject: ' + ctrl.promiseName + ' ');
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
								clone[clone.length++] = $window.document.createComment(' end reject: ' + ctrl.promiseName + ' ');
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
								clone[clone.length++] = $window.document.createComment(' end reject: ' + ctrl.promiseName + ' ');
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
								clone[clone.length++] = $window.document.createComment(' end reject: ' + ctrl.promiseName + ' ');
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