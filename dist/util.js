'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseJobs = exports.getAbsolutePath = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getAbsolutePath = exports.getAbsolutePath = function getAbsolutePath(path) {
  var mode = arguments.length <= 1 || arguments[1] === undefined ? _fs2.default.R_OK : arguments[1];

  var dir = (0, _path.resolve)(path);
  return _fs2.default.accessSync(dir, mode) || dir;
};

var parseJobs = exports.parseJobs = function parseJobs(jobs, basedir) {
  var res = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)((0, _keys2.default)(jobs)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var name = _step.value;
      var _jobs$name = jobs[name];
      var file = _jobs$name.file;
      var cron = _jobs$name.cron;
      var attempts = _jobs$name.attempts;


      if (!file) {
        throw new Error('no file defined for job "' + name + '"');
      }

      var job = require(getAbsolutePath((0, _path.resolve)(basedir, file)));
      res.push((0, _assign2.default)(cron ? { cron: cron } : {}, {
        attempts: attempts || 3,
        fn: job.default || job,
        name: name
      }));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return res;
};