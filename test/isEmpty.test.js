/**
 * Created by axetroy on 16-3-14.
 */

var isEmpty = require('./isEmpty.js');
var expect = require('chai').expect;

var testArr = [
  {
    s: "   ",
    r: true
  },
  {
    s: " ; ; ",
    r: true
  },
  {
    s: "",
    r: true
  },
  {
    s: "ad",
    r: false
  },
  {
    s: "\n",
    r: true
  },
  {
    s: "\t",
    r: true
  },
  {
    s: "\r",
    r: true
  },
  {
    s: "aa\r",
    r: true
  },
  {
    s: "\raa",
    r: true
  },
  {
    s: "\rbb",
    r: true
  }
];

describe('传入的函数字符串是否为空', function () {
  testArr.forEach(function (v) {
    it(v.s, function () {
      expect(isEmpty(v.s)).to.be.equal(v.r);
    });
  });
});