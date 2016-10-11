#! /usr/bin/env node
'use strict';

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
  config.jobs = (0, _util.parseJobs)(config.jobs, _commander2.default.basedir);
  var scheduler = new _2.default(config);
  scheduler.init();
} catch (e) {
  console.log('errored', e);
  throw e;
}