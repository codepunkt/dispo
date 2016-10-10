#! /usr/bin/env node
'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _path = require('path');

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _ = require('..');

var _2 = _interopRequireDefault(_);

var _package = require('../../package.json');

var _util = require('../util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version(_package.version).option('-C, --config <config>', 'config file path, default: `jobs.json`').option('-B, --basedir <basedir>', 'directory used as a base for relative config and job paths').parse(process.argv);

_commander2.default.config = _commander2.default.config || 'jobs.json';
_commander2.default.basedir = _commander2.default.basedir || process.cwd();

try {
  var config = require((0, _util.getAbsolutePath)((0, _path.resolve)(_commander2.default.basedir, _commander2.default.config)));
  var jobs = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)((0, _keys2.default)(config.jobs)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var name = _step.value;
      var _config$jobs$name = config.jobs[name];
      var file = _config$jobs$name.file;
      var cron = _config$jobs$name.cron;
      var attempts = _config$jobs$name.attempts;

      var _exports = require((0, _util.getAbsolutePath)((0, _path.resolve)(_commander2.default.basedir, file)));
      jobs.push((0, _assign2.default)({ attempts: attempts }, cron ? { cron: cron } : {}, {
        fn: _exports.default || _exports,
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

  config.jobs = jobs;

  var scheduler = new _2.default(config);
  scheduler.init();
} catch (e) {
  console.log('errored', e);
  throw e;
}