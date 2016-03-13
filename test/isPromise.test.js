/**
 * Created by axetroy on 16-3-14.
 */
var isPromise = require('./isPromise.js');
var expect = require('chai').expect;

var pro = new Promise(function (resolve, reject) {
  resolve();
});
var testArr = [
  {
    p: {},
    r: false
  },
  {
    p: pro,
    r: false
  },
  {
    p: {
      then: function () {
      }
    },
    r: false
  },
  {
    p: {
      then: function () {
      }, $$state: undefined
    },
    r: false
  },
  {
    p: {
      then: function () {
      }, $$state: '0'
    },
    r: false
  },
  {
    p: {
      then: function () {
      }, $$state: 1
    },
    r: false
  },
  {
    p: {
      then: function () {
      },
      $$state: {
        status: 0
      }
    },
    r: true
  }
];

describe('测试是否为promise对象', function () {
  testArr.forEach(function (v) {
    it(JSON.stringify(v.p), function () {
      expect(isPromise(v.p)).to.be.equal(v.r);
    });
  });
});