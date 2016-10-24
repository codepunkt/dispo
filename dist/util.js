'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseBackoff = exports.parseJobs = exports.getAbsolutePath = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {String} path
 * @param {Number} [mode=fs.R_OK]
 * @return {Boolean|String}
 */
var getAbsolutePath = exports.getAbsolutePath = function getAbsolutePath(path) {
  var mode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _fs2.default.R_OK;

  var dir = (0, _path.resolve)(path);
  return _fs2.default.accessSync(dir, mode) || dir;
};

/**
 * @param {Array<Object>} jobs
 * @param {String} basedir
 * @return {Array<Object>}
 */
var parseJobs = exports.parseJobs = function parseJobs(jobs, basedir) {
  return (0, _keys2.default)(jobs).reduce(function (res, name) {
    var _jobs$name = jobs[name];
    var file = _jobs$name.file;
    var cron = _jobs$name.cron;
    var attempts = _jobs$name.attempts;
    var backoff = _jobs$name.backoff;
    var notifyOnError = _jobs$name.notifyOnError;


    if (!file) {
      throw new Error('no file defined for job "' + name + '"');
    }

    var job = require(getAbsolutePath((0, _path.resolve)(basedir, file)));

    var options = {
      attempts: attempts || 3,
      fn: job.default || job,
      name: name
    };

    if (cron) options.cron = cron;
    if (backoff) options.backoff = backoff;
    if (notifyOnError) options.notifyOnError = notifyOnError;

    res.push(options);
    return res;
  }, []);
};

/**
 * @typedef {Object} BackoffOptions
 * @property {String} type
 * @property {Number} [exponent=2]
 */
/**
 * Parses the given backoff options to iron out some inconveniences in kue.js, like e.g. type === 'exponential' only
 * doubling the delay instead of letting it grow exponentially.
 *
 * @param {Boolean|BackoffOptions} [backoff] Backoff algorithm configuration
 * @return {Boolean|BackoffOptions|Function} A backoff configuration that kue.js understands
 */
var parseBackoff = exports.parseBackoff = function parseBackoff(backoff) {
  if (!backoff) {
    return;
  }

  if (backoff.type === 'incremental') {
    return (0, _assign2.default)({}, backoff, { type: 'exponential' });
  } else if (backoff.type === 'exponential') {
    return function (attempt, delay) {
      var range = [];
      for (var n = 1; n < attempt; n++) {
        range.push(n);
      }
      return range.reduce(function (result, attempt) {
        return Math.pow(result, 2);
      }, delay);
    };
  }
};