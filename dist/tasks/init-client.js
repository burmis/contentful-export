"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = initClient;
var _contentful = require("contentful");
var _contentfulBatchLibs = require("contentful-batch-libs");
var _contentfulManagement = require("contentful-management");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function logHandler(level, data) {
  _contentfulBatchLibs.logEmitter.emit(level, data);
}
function initClient(opts, useCda = false) {
  const defaultOpts = {
    timeout: 10000,
    logHandler
  };
  const config = _objectSpread(_objectSpread({}, defaultOpts), opts);
  if (useCda) {
    const cdaConfig = {
      space: config.spaceId,
      accessToken: config.deliveryToken,
      environment: config.environmentId,
      resolveLinks: false
    };
    return (0, _contentful.createClient)(cdaConfig);
  }
  return (0, _contentfulManagement.createClient)(config);
}
module.exports = exports.default;