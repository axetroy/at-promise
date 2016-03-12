# Angular的promise指令

# 指令
* at-promise
 * 属性
 * resolve-call-back
 * reject-call-back
 * finally-call-back
* at-pending
* at-resolve
* at-reject
* at-finally

# 依赖

依赖于`angular`和`ngAnimate`

#安装并启动

bower:

```bash
bower install at-promise --save
```

引入模块`ngAnimate`和`atPromise`

```js
angular
	.module('angularTestApp', [
		'ngAnimate',
		'atPromise'
	])
```

#详解

* at-promise

主要指令，所有指令必须包含在这个这令下面
    
所有回调函数，是在promise响应后，并且渲染试图之后调用

可以传入``callBack``或``callBack()``这样的形式，可以传入参数，参数为angular表达式
    
如``callBack(name,age)``，name和age分别是挂载在$scope下的变量，传入字符串则是``callBack('axetroy','22')``

```js
angular.module('angularTestApp')
	.controller('AboutCtrl', function ($scope, $q) {
		$scope.pro = $q.defer();
		$scope.test = 'test scope resolve';
		$scope.resolve = function(word){
			console.info(word);
		};
		$scope.reject = function(word){
			console.info(word);
		};
		$scope.finally = function(word){
			console.info(word);
		};
	});
```

```html
<div at-promise="pro.promise"
   resolve-call-back="resolve(test)"                
   reject-call-back="reject('you has been reject')"
   finally-call-back="finally('the promise has done')">
</div>
```

``resolve``时运行``resolve(test)``：``test scope resolve``

``reject``时运行``reject('you has been reject')``：``you has been reject``

``finally``时运行``finally('the promise has done')``：``the promise has done``

* at-pending

当promise未进入resolve或reject时候，就渲染`at-pending`内的视图，直到resolve或reject

```html
<div at-promise="pro.promise">
  <!-- 这里会被渲染，直到promise相应 -->
  <div at-pending>
    <p>loading...</p>
  </div>
</div>
 ```
* at-resolve

当promise进入resolve时，渲染视图

```js
angular.module('angularTestApp')
	.controller('AboutCtrl', function ($scope, $q, $timeout) {
	  $scope.pro = $q.defer();
    // 模拟http操作
    $timeout(function(){
      $scope.pro.resolve();
    },2000);
	});
```

```html
<div at-promise="pro.promise">
 <!-- 这里会被渲染出来 -->
  <div at-resolve>
    <p>resolve</p>
  </div>
</div>
```

如果需要按条件渲染，则``at-resolve=‘条件’``，例如：

```js
angular.module('angularTestApp')
	.controller('AboutCtrl', function ($scope, $q, $timeout) {
	  // 没有理由的promis
	  $scope.pro = $q.defer();
    // 模拟http操作
    $timeout(function(){
      // 带了resolve的理由，‘ok’
      $scope.pro.resolve('ok');
    },2000);
	});
```

```html
<div at-promise="pro.promise">
  <!-- 不带理由，所以视图不渲染 -->
  <div at-resolve>
    <p>resolve no reason</p>
  </div>
  <!-- 带了理由'noOK'，但是与'ok'不符合，所以不渲染 -->
  <div at-resolve="'noOK'">
    <p>resolve don't match the reason</p>
  </div>
  <!-- 带了理由'ok'，但是与'ok'符合，渲染 -->
  <div at-resolve="'ok'">
    <p>resolve reason is ok </p>
  </div>
</div>
```

* at-reject

当promise进入resolve时，渲染视图，同样具备``reject``的理由，方法与``resolve``一致

```js
angular.module('angularTestApp')
	.controller('AboutCtrl', function ($scope, $q, $timeout) {
	  $scope.pro = $q.defer();
    // 模拟http操作
    $timeout(function(){
      $scope.pro.reject();
    },2000);
	});
```

```html
<div at-promise="pro.promise">
  <!-- 这里会被渲染 -->
  <div at-reject>
    <p>reject</p>
  </div>
</div>
```
* at-finally

不过最终结果是resolve还是reject，都会被渲染

```js
angular.module('angularTestApp')
	.controller('AboutCtrl', function ($scope, $q, $timeout) {
	  $scope.pro = $q.defer();
    // 模拟http操作
    $timeout(function(){
      $scope.pro.reject();
    },2000);
	});
```

```html
<div at-promise="pro.promise">
  <!-- 虽然是reject，但是一样被渲染出来 -->
  <div at-finally>
    finally
  </div>
</div>
```
