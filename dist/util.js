'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAbsolutePath = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getAbsolutePath = exports.getAbsolutePath = function getAbsolutePath(path) {
  var mode = arguments.length <= 1 || arguments[1] === undefined ? _fs2.default.constants.R_OK : arguments[1];

  var dir = (0, _path.resolve)(path);
  return _fs2.default.accessSync(dir, mode) || dir;
};