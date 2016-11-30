# Angular的promise指令

根据promise的结果，渲染不同的视图

当promise更新时(新的promise覆盖旧的promise)，指令会重新根据新的promise渲染视图。

# 已废弃

新的promise指令

[https://github.com/axetroy/ng-promise](https://github.com/axetroy/ng-promise)

# 应用场景

* http请求数据有结果之后(无论是reject或resolve)，才显示模板，不再是使用ng-if或ng-show，还有闪一下的毛病
* 根据resolve或reject，显示不同的模板提示用户
```html
  <div at-promise="pro.promise">
    <div at-resolve>
      <!--成功之后要显示的内容-->
    </div>
    <div at-reject>
      <p>哎呀，数据加载出错了。请刷新重试</p>
    </div>
  </div>
 ```
* 出错了，还可以重新刷新
```js
angular.module('angularTestApp')
  .controller('AboutCtrl', function ($scope, $q) {
    $scope.pro = $q.defer();
    // some aync action
    //...
    
    $scope.refreshPromise = function(){
      // cover with a new promise
      $scope.pro = $q.defer();
      // some aync action,make the new promise to resolve or reject
      //...
    }
  });
```
```html
  <div at-promise="pro.promise">
    <div at-resolve>
      <!--成功之后要显示的内容-->
    </div>
    <div at-reject>
      <p>哎呀，数据加载出错了。请刷新重试</p>
      <input type="button" value="重新刷新" ng-click="refreshPromise()"/>
    </div>
  </div>
```

* 根据不同的结果，显示不同的模板内容

比如下面这个例子，获取评论列表，如果有评论（成功获取到数据），则resolve('has data')，如果为空数据，则resolve('no data')，如果是服务器响应失败，或者某种原因获取失败，则reject，分别显示3种不同的模块

当然不局限与此，关键是怎么使用reason(理由)，不同的reason可以显示不同模块

```js
angular.module('angularTestApp')
  .controller('AboutCtrl', function ($scope, $q，$timeout,$http) {
    $scope.pro = $q.defer();
    
    // 模拟HTTP操作
    $timeout(function(){
      $http.get('/comments/...').$promise
       .then(function(resp){
          if(resp.data){
            // 带了个理由resolve，reason：‘has data’;
            $scope.pro.resolve('has data');
          }else{
            // 带了个理由resolve，reason:'no data';
            $scope.pro.resolve('no data');
          }
       },function(error){
        // 不带理由的reject
        $scope.pro.reject();
       });
    },2000);
    
    $scope.refreshPromise = function(){
      // cover with a new promise
      $scope.pro = $q.defer();
      // some aync action,make the new promise to resolve or reject
      //...
    }
  });
```

```html
  <div at-promise="pro.promise">
    <div at-resolve="'has data'">
      <!--成功之后,并且resolve的理由为'has data'，才渲染-->
      ...评论列表
    </div>
    
    <div at-resolve="'no data'">
      <!--成功之后，并且resolve的理由为'no data'，才渲染-->
      <p>还没有人评论，赶快来抢沙发吧！</p>
    </div>
    
    <div at-reject>
      <!--数据加载失败-->
      <p>哎呀，数据加载出错了。请刷新重试</p>
      <input type="button" value="重新刷新" ng-click="refreshPromise()"/>
    </div>
  </div>
```


# demo
尚未完成

# 指令
* at-promise
 * 属性
 * resolve-call-back	(回调函数)
 * reject-call-back	(回调函数)
 * finally-call-back	(回调函数)
* at-pending
* at-resolve
 * 属性
 * call-back	(回调函数)
* at-reject
 * 属性
 * call-back	(回调函数)
* at-finally
 * 属性
 * call-back	(回调函数)

### 回调函数说明

#### ``at-promise``

> ``at-promise``有3个回调函数``resolve-call-back``、``reject-call-back``和``finally-call-back``
> 该回调函数分别在promise响应之后执行

#### ``at-resolve``、``at-reject``和``at-finally``

> 分别在该视图，被成功渲染出来后执行

所有回调函数，是在promise响应后，并且渲染视图之后调用

可以传入``callBack``或``callBack()``这样的形式，可以传入参数，参数为angular表达式
    
如``callBack(name,age)``，name和age分别是挂载在$scope下的变量，传入字符串则是``callBack('axetroy','22')``

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

无论最终结果是resolve还是reject，都会被渲染

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

# License
项目遵循[MIT协议(The MIT License)](http://opensource.org/licenses/MIT)
