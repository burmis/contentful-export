"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = runContentfulExport;
var _fs = require("fs");
var _bfj = _interopRequireDefault(require("bfj"));
var _bluebird = _interopRequireDefault(require("bluebird"));
var _cliTable = _interopRequireDefault(require("cli-table3"));
var _listr = _interopRequireDefault(require("listr"));
var _listrUpdateRenderer = _interopRequireDefault(require("listr-update-renderer"));
var _listrVerboseRenderer = _interopRequireDefault(require("listr-verbose-renderer"));
var _lodash = _interopRequireDefault(require("lodash.startcase"));
var _mkdirp = _interopRequireDefault(require("mkdirp"));
var _differenceInSeconds = _interopRequireDefault(require("date-fns/differenceInSeconds"));
var _formatDistance = _interopRequireDefault(require("date-fns/formatDistance"));
var _contentfulBatchLibs = require("contentful-batch-libs");
var _downloadAssets = _interopRequireDefault(require("./tasks/download-assets"));
var _getSpaceData = _interopRequireDefault(require("./tasks/get-space-data"));
var _initClient = _interopRequireDefault(require("./tasks/init-client"));
var _parseOptions = _interopRequireDefault(require("./parseOptions"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const accessP = _bluebird.default.promisify(_fs.access);
function createListrOptions(options) {
  if (options.useVerboseRenderer) {
    return {
      renderer: _listrVerboseRenderer.default
    };
  }
  return {
    renderer: _listrUpdateRenderer.default,
    collapse: false
  };
}
function runContentfulExport(params) {
  const log = [];
  const options = (0, _parseOptions.default)(params);
  const listrOptions = createListrOptions(options);
  console.log("STARTING A CUSTOMIZED CONTENTFUL EXPORT");

  // Setup custom error listener to store errors for later
  (0, _contentfulBatchLibs.setupLogging)(log);
  const tasks = new _listr.default([{
    title: "Initialize client",
    task: (0, _contentfulBatchLibs.wrapTask)(ctx => {
      try {
        // CMA client
        ctx.client = (0, _initClient.default)(options);
        if (options.deliveryToken && !options.includeDrafts) {
          // CDA client for fetching only public entries
          ctx.cdaClient = (0, _initClient.default)(options, true);
        }
        return _bluebird.default.resolve();
      } catch (err) {
        return _bluebird.default.reject(err);
      }
    })
  }, {
    title: "Fetching data from space",
    task: ctx => {
      return (0, _getSpaceData.default)({
        client: ctx.client,
        cdaClient: ctx.cdaClient,
        spaceId: options.spaceId,
        environmentId: options.environmentId,
        maxAllowedLimit: options.maxAllowedLimit,
        includeDrafts: options.includeDrafts,
        includeArchived: options.includeArchived,
        skipContentModel: options.skipContentModel,
        skipEditorInterfaces: options.skipEditorInterfaces,
        skipContent: options.skipContent,
        skipWebhooks: options.skipWebhooks,
        skipRoles: options.skipRoles,
        skipTags: options.skipTags,
        stripTags: options.stripTags,
        listrOptions,
        queryEntries: options.queryEntries,
        queryAssets: options.queryAssets
      });
    }
  }, {
    title: "Download assets",
    task: (0, _contentfulBatchLibs.wrapTask)((0, _downloadAssets.default)(options)),
    skip: ctx => !options.downloadAssets || !Object.prototype.hasOwnProperty.call(ctx.data, "assets")
  }, {
    title: "Write export log file",
    task: () => {
      return new _listr.default([{
        title: "Lookup directory to store the logs",
        task: ctx => {
          return accessP(options.exportDir).then(() => {
            ctx.logDirectoryExists = true;
          }).catch(() => {
            ctx.logDirectoryExists = false;
          });
        }
      }, {
        title: "Create log directory",
        task: () => {
          return (0, _mkdirp.default)(options.exportDir);
        },
        skip: ctx => !ctx.logDirectoryExists
      }, {
        title: "Writing data to file",
        task: ctx => {
          console.log("logFilePath = ", options.logFilePath);
          console.log("ctx.data = ", ctx.data);
          return _bfj.default.write(options.logFilePath, ctx.data, {
            circular: "ignore",
            space: 2
          });
        }
      }]);
    },
    skip: () => !options.saveFile
  }], listrOptions);
  return tasks.run({
    data: {}
  }).then(ctx => {
    const resultTypes = Object.keys(ctx.data);
    if (resultTypes.length) {
      const resultTable = new _cliTable.default();
      resultTable.push([{
        colSpan: 2,
        content: "Exported entities"
      }]);
      resultTypes.forEach(type => {
        resultTable.push([(0, _lodash.default)(type), ctx.data[type].length]);
      });
      console.log(resultTable.toString());
    } else {
      console.log("No data was exported");
    }
    if ("assetDownloads" in ctx) {
      const downloadsTable = new _cliTable.default();
      downloadsTable.push([{
        colSpan: 2,
        content: "Asset file download results"
      }]);
      downloadsTable.push(["Successful", ctx.assetDownloads.successCount]);
      downloadsTable.push(["Warnings ", ctx.assetDownloads.warningCount]);
      downloadsTable.push(["Errors ", ctx.assetDownloads.errorCount]);
      console.log(downloadsTable.toString());
    }
    const endTime = new Date();
    const durationHuman = (0, _formatDistance.default)(endTime, options.startTime);
    const durationSeconds = (0, _differenceInSeconds.default)(endTime, options.startTime);
    console.log(`The export took ${durationHuman} (${durationSeconds}s)`);
    if (options.saveFile) {
      console.log(`\nStored space data to json file at: ${options.logFilePath}`);
    }
    return ctx.data;
  }).catch(err => {
    log.push({
      ts: new Date().toJSON(),
      level: "error",
      error: err
    });
  }).then(data => {
    // @todo this should live in batch libs
    const errorLog = log.filter(logMessage => logMessage.level !== "info" && logMessage.level !== "warning");
    const displayLog = log.filter(logMessage => logMessage.level !== "info");
    (0, _contentfulBatchLibs.displayErrorLog)(displayLog);
    if (errorLog.length) {
      return (0, _contentfulBatchLibs.writeErrorLogFile)(options.errorLogFile, errorLog).then(() => {
        const multiError = new Error("Errors occured");
        multiError.name = "ContentfulMultiError";
        multiError.errors = errorLog;
        throw multiError;
      });
    }
    console.log("The export was successful.");
    return data;
  });
}
module.exports = exports.default;