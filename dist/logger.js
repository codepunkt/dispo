'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

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
          result += _chalk2.default.dim(_chalk2.default[color]('\n  ' + (0, _stringify2.default)(options.meta)));
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
    (0, _classCallCheck3.default)(this, Logger);

    this.config = (0, _assign2.default)({}, defaults, options);
  }

  /**
   * @memberOf Logger
   */


  (0, _createClass3.default)(Logger, [{
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
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(job) {
        var _ref2, data, id;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return (0, _.getJob)(job);

              case 2:
                _ref2 = _context.sent;
                data = _ref2.data;
                id = _ref2.id;

                this.winston.info('Starting ' + data.name, (0, _assign2.default)({ id: id }, data));

              case 6:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function logStart(_x3) {
        return _ref.apply(this, arguments);
      }

      return logStart;
    }()

    /**
     * @param {{_attempts:String,data:{name:String},duration:String,id:String}} job
     * @memberOf Logger
     */

  }, {
    key: 'logComplete',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(job) {
        var _ref4, _attempts, data, duration, id, message;

        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (0, _.getJob)(job);

              case 2:
                _ref4 = _context2.sent;
                _attempts = _ref4._attempts;
                data = _ref4.data;
                duration = _ref4.duration;
                id = _ref4.id;
                message = 'Finished ' + data.name + ' after ' + (0, _prettyMs2.default)(Number(duration));

                this.winston.info(message, (0, _assign2.default)({ id: id, duration: duration, tries: _attempts }, data));

              case 9:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function logComplete(_x4) {
        return _ref3.apply(this, arguments);
      }

      return logComplete;
    }()

    /**
     * @param {{data:{attempts:String,name:String},id:String}} job
     * @param {String} msg
     * @memberOf Logger
     */

  }, {
    key: 'logFailure',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(job, msg) {
        var _ref6, data, id, message;

        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return (0, _.getJob)(job);

              case 2:
                _ref6 = _context3.sent;
                data = _ref6.data;
                id = _ref6.id;
                message = 'Failed ' + data.name + ' with message "' + msg + '" after ' + data.attempts + ' tries';

                this.winston.error(message, (0, _assign2.default)({ id: id, message: msg }, data));

              case 7:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function logFailure(_x5, _x6) {
        return _ref5.apply(this, arguments);
      }

      return logFailure;
    }()

    /**
     * @param {{data:{name:String},id:String}} job
     * @param {String} msg
     * @memberOf Logger
     */

  }, {
    key: 'logFailedAttempt',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(job, msg) {
        var _ref8, data, id;

        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return (0, _.getJob)(job);

              case 2:
                _ref8 = _context4.sent;
                data = _ref8.data;
                id = _ref8.id;

                this.winston.warn('Error on ' + data.name, (0, _assign2.default)({ id: id, message: msg }, data));

              case 6:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function logFailedAttempt(_x7, _x8) {
        return _ref7.apply(this, arguments);
      }

      return logFailedAttempt;
    }()

    /**
     * @param {{data:{name:String},_delay:String,created_at:String,id:String}} job
     * @memberOf Logger
     */

  }, {
    key: 'logQueued',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(_ref10) {
        var data = _ref10.data;
        var id = _ref10.id;
        var createdAt = _ref10.created_at;
        var delay = _ref10._delay;
        var message;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                message = 'Queued ' + data.name + ' to run in ' + runsIn(createdAt, delay);

                this.winston.info(message, (0, _assign2.default)({ id: id }, data));

              case 2:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function logQueued(_x9) {
        return _ref9.apply(this, arguments);
      }

      return logQueued;
    }()
  }]);
  return Logger;
}();

exports.default = Logger;