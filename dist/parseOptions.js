"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseOptions;
var _contentfulBatchLibs = require("contentful-batch-libs");
var _format = _interopRequireDefault(require("date-fns/format"));
var _path = require("path");
var _querystring = _interopRequireDefault(require("querystring"));
var _package = require("../package");
var _headers = require("./utils/headers");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function parseOptions(params) {
  const defaultOptions = {
    environmentId: 'master',
    exportDir: process.cwd(),
    includeDrafts: false,
    includeArchived: false,
    skipRoles: false,
    skipContentModel: false,
    skipEditorInterfaces: false,
    skipContent: false,
    skipWebhooks: false,
    skipTags: false,
    stripTags: false,
    maxAllowedLimit: 1000,
    saveFile: true,
    useVerboseRenderer: false,
    rawProxy: false
  };
  const configFile = params.config ? require((0, _path.resolve)(process.cwd(), params.config)) : {};
  const options = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, defaultOptions), configFile), params), {}, {
    headers: (0, _contentfulBatchLibs.addSequenceHeader)(params.headers || (0, _headers.getHeadersConfig)(params.header))
  });

  // Validation
  if (!options.spaceId) {
    throw new Error('The `spaceId` option is required.');
  }
  if (!options.managementToken) {
    throw new Error('The `managementToken` option is required.');
  }
  const proxySimpleExp = /.+:\d+/;
  const proxyAuthExp = /.+:.+@.+:\d+/;
  if (options.proxy && !(proxySimpleExp.test(options.proxy) || proxyAuthExp.test(options.proxy))) {
    throw new Error('Please provide the proxy config in the following format:\nhost:port or user:password@host:port');
  }
  options.startTime = new Date();
  options.contentFile = options.contentFile || `contentful-export-${options.spaceId}-${options.environmentId}-${(0, _format.default)(options.startTime, "yyyy-MM-dd'T'HH-mm-ss")}.json`;
  options.logFilePath = (0, _path.resolve)(options.exportDir, options.contentFile);
  if (!options.errorLogFile) {
    options.errorLogFile = (0, _path.resolve)(options.exportDir, `contentful-export-error-log-${options.spaceId}-${options.environmentId}-${(0, _format.default)(options.startTime, "yyyy-MM-dd'T'HH-mm-ss")}.json`);
  } else {
    options.errorLogFile = (0, _path.resolve)(process.cwd(), options.errorLogFile);
  }

  // Further processing
  options.accessToken = options.managementToken;
  if (typeof options.proxy === 'string') {
    options.proxy = (0, _contentfulBatchLibs.proxyStringToObject)(options.proxy);
  }
  if (!options.rawProxy && options.proxy) {
    options.httpsAgent = (0, _contentfulBatchLibs.agentFromProxy)(options.proxy);
    delete options.proxy;
  }
  if (options.queryEntries && options.queryEntries.length > 0) {
    const querystr = options.queryEntries.join('&');
    options.queryEntries = _querystring.default.parse(querystr);
  }
  if (options.queryAssets && options.queryAssets.length > 0) {
    const querystr = options.queryAssets.join('&');
    options.queryAssets = _querystring.default.parse(querystr);
  }
  if (options.contentOnly) {
    options.skipRoles = true;
    options.skipContentModel = true;
    options.skipWebhooks = true;
  }
  options.application = options.managementApplication || `contentful.export/${_package.version}`;
  options.feature = options.managementFeature || 'library-export';
  return options;
}
module.exports = exports.default;