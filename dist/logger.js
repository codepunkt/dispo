'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _winston5 = require('winston');

var _winston6 = _interopRequireDefault(_winston5);

var _prettyMs = require('pretty-ms');

var _prettyMs2 = _interopRequireDefault(_prettyMs);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

var _lodash = require('lodash');

var _fs = require('fs');

var _ = require('.');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Maps log levels to terminal colors
 */
var mapLevelToColor = {
  error: 'red',
  info: 'white',
  verbose: 'cyan',
  warn: 'yellow'
};

/**
 * Default logger options
 */
var defaults = {
  winstonConfig: {
    level: 'verbose',
    transports: [new _winston6.default.transports.Console({
      timestamp: true,
      formatter: function formatter(options) {
        var color = mapLevelToColor[options.level];
        var result = _chalk2.default[color]('[' + dateTime() + '] ' + options.message);

        if (!(0, _lodash.isEmpty)(options.meta)) {
          result += _chalk2.default.dim(_chalk2.default[color]('\n  ' + JSON.stringify(options.meta)));
        }

        return result;
      }
    }), new _winston6.default.transports.File({ filename: 'log/scheduler.log' })]
  }
};

/**
 * Returns human readable time of the next job run based on the jobs creation date and delay
 *
 * @param {String} createdAt - The jobs createdAt timestamp
 * @param {String} delay - The jobs delay
 * @return {String} Human readable time of the next job run
 */
var runsIn = function runsIn(createdAt, delay) {
  return (0, _prettyMs2.default)(Number(createdAt) + Number(delay) - Date.now());
};

/**
 * Returns formatted date
 *
 * @param {Date} [date=Date.now()] - Date to be formatted
 * @param {String} [format=HH:MM:ss] - Date format
 * @return {String} Formatted date
 */
var dateTime = function dateTime() {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Date.now();
  var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'HH:MM:ss';

  return (0, _dateformat2.default)(date, format);
};

/**
 * Logger
 */

var Logger = function () {
  function Logger(options) {
    _classCallCheck(this, Logger);

    this.config = Object.assign({}, defaults, options);
  }

  /**
   * @memberOf Logger
   */


  _createClass(Logger, [{
    key: 'init',
    value: function init() {
      var logpath = _path2.default.resolve(this.config.path);
      if (!(0, _fs.existsSync)(logpath)) {
        (0, _fs.mkdirSync)(logpath);
      }
      this.winston = new _winston6.default.Logger(this.config.winstonConfig);
    }

    /**
     * @param {Array<any>} params
     * @memberOf Logger
     */

  }, {
    key: 'error',
    value: function error() {
      var _winston;

      (_winston = this.winston).error.apply(_winston, arguments);
    }
    /**
     * @param {Array<any>} params
     * @memberOf Logger
     */

  }, {
    key: 'info',
    value: function info() {
      var _winston2;

      (_winston2 = this.winston).info.apply(_winston2, arguments);
    }
    /**
     * @param {Array<any>} params
     * @memberOf Logger
     */

  }, {
    key: 'verbose',
    value: function verbose() {
      var _winston3;

      (_winston3 = this.winston).verbose.apply(_winston3, arguments);
    }
    /**
     * @param {Array<any>} params
     * @memberOf Logger
     */

  }, {
    key: 'warn',
    value: function warn() {
      var _winston4;

      (_winston4 = this.winston).warn.apply(_winston4, arguments);
    }

    /**
     * @param {{data:{name:String},id:String}} job
     * @memberOf Logger
     */

  }, {
    key: 'logStart',
    value: function logStart(job) {
      var _this = this;

      (0, _.getJob)(job).then(function (_ref) {
        var data = _ref.data;
        var id = _ref.id;

        _this.winston.info('Starting ' + data.name, Object.assign({ id: id }, data));
      });
    }

    /**
     * @param {{_attempts:String,data:{name:String},duration:String,id:String}} job
     * @memberOf Logger
     */

  }, {
    key: 'logComplete',
    value: function logComplete(job) {
      var _this2 = this;

      (0, _.getJob)(job).then(function (_ref2) {
        var _attempts = _ref2._attempts;
        var data = _ref2.data;
        var duration = _ref2.duration;
        var id = _ref2.id;

        var message = 'Finished ' + data.name + ' after ' + (0, _prettyMs2.default)(Number(duration));
        _this2.winston.info(message, Object.assign({ id: id, duration: duration, tries: _attempts }, data));
      });
    }

    /**
     * @param {{data:{attempts:String,name:String},id:String}} job
     * @param {String} msg
     * @memberOf Logger
     */

  }, {
    key: 'logFailure',
    value: function logFailure(job, msg) {
      var _this3 = this;

      (0, _.getJob)(job).then(function (_ref3) {
        var data = _ref3.data;
        var id = _ref3.id;

        var message = 'Failed ' + data.name + ' with message "' + msg + '" after ' + data.attempts + ' tries';
        _this3.winston.error(message, Object.assign({ id: id, message: msg }, data));
      });
    }

    /**
     * @param {{data:{name:String},id:String}} job
     * @param {String} msg
     * @memberOf Logger
     */

  }, {
    key: 'logFailedAttempt',
    value: function logFailedAttempt(job, msg) {
      var _this4 = this;

      (0, _.getJob)(job).then(function (_ref4) {
        var data = _ref4.data;
        var id = _ref4.id;

        _this4.winston.warn('Error on ' + data.name, Object.assign({ id: id, message: msg }, data));
      });
    }

    /**
     * @param {{data:{name:String},_delay:String,created_at:String,id:String}} job
     * @memberOf Logger
     */

  }, {
    key: 'logQueued',
    value: function logQueued(_ref5) {
      var data = _ref5.data;
      var id = _ref5.id;
      var createdAt = _ref5.created_at;
      var delay = _ref5._delay;

      var message = 'Queued ' + data.name + ' to run in ' + runsIn(createdAt, delay);
      this.winston.info(message, Object.assign({ id: id }, data));
    }
  }]);

  return Logger;
}();

exports.default = Logger;