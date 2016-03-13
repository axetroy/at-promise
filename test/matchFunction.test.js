/**
 * Created by axetroy on 16-3-13.
 */
var match = require('./matchFunction.js');
var expect = require('chai').expect;

var testArr = [
  {
    str: '$on',
    name: '$on',
    agm: []
  },
  {
    str: '$on()',
    name: '$on',
    agm: []
  },
  {
    str: '$_$on$_()',
    name: '$_$on$_',
    agm: []
  },
  {
    str: 'hello',
    name: 'hello',
    agm: []
  },
  {
    str: 'hello()',
    name: 'hello',
    agm: []
  },
  {
    str: 'hello()',
    name: 'hello',
    agm: []
  },
  {
    str: 'under_scope',
    name: 'under_scope',
    agm: []
  },
  {
    str: 'under_scope()',
    name: 'under_scope',
    agm: []
  },
  {
    str: 'withAgm("hello")',
    name: 'withAgm',
    agm: ['"hello"']
  },
  {
    str: 'withAgm("hello",world,,,)',
    name: 'withAgm',
    agm: ['"hello"', 'world', undefined, undefined, undefined]
  },
  // TODO:兼容数组
  {
    str: 'withAgm("hello",[1,2,3])',
    name: 'withAgm',
    agm: ['"hello"', '[1,2,3]']
  },
  // TODO:兼容JSON
  {
    str: 'withAgm("hello",{name:"axetroy",age:"22"})',
    name: 'withAgm',
    agm: ['"hello"', '{name:"axetroy",age:"22"}']
  }
];

describe('测试是否为函数字符串', function () {
  testArr.forEach(function (v) {
    it(v.str, function () {
      expect(match.isFunction(v.str)).to.be.ok;
    });
  });
});


describe('获取函数名称', function () {
  testArr.forEach(function (v) {
    it(v.str, function () {
      expect(match.getFunctionName(v.str)).to.be.equal(v.name);
    });
  });
});

describe('获取函数参数', function () {
  testArr.forEach(function (v) {
    it(v.str, function () {
      expect(match.getAgm(v.str)).to.be.deep.equal(v.agm);
    });
  });
});