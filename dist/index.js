'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getJob = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _kue = require('kue');

var _kue2 = _interopRequireDefault(_kue);

var _later = require('later');

var _later2 = _interopRequireDefault(_later);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _zmqPrebuilt = require('zmq-prebuilt');

var _zmqPrebuilt2 = _interopRequireDefault(_zmqPrebuilt);

var _bluebird = require('bluebird');

var _lodash = require('lodash');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _mailer = require('./mailer');

var _mailer2 = _interopRequireDefault(_mailer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NODE_ENV = process.env.NODE_ENV;

/**
 * Default scheduler config
 * @type {Object}
 */

var defaultConfig = {
  jobs: [],
  options: {
    port: 5555,
    logging: { path: 'log' },
    mailer: { enabled: false }
  }
};

/**
 * Promisified version of `kue.Job.rangeByType`
 * @type {Function}
 */
var getJobsByType = (0, _bluebird.promisify)(_kue2.default.Job.rangeByType);

/**
 * Promisified version of `kue.Job.get`
 * @type {Function}
 */
var getJob = exports.getJob = (0, _bluebird.promisify)(_kue2.default.Job.get);

/**
 * Dispo Scheduler
 */

var Dispo = function () {
  function Dispo() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, Dispo);

    this.config = (0, _lodash.merge)({}, defaultConfig, config);
  }

  /**
   * Initializes logging, socket bindings and the queue mechanism
   */


  (0, _createClass3.default)(Dispo, [{
    key: 'init',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
        var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, job;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                this._logger = new _logger2.default(this.config.options.logging);
                this._logger.init();

                if ('enabled' in this.config.options.mailer && this.config.options.mailer.enabled === true) {
                  this._mailer = new _mailer2.default(this.config.options.mailer);
                  this._mailer.init();
                }

                this._initSocket();
                this._initQueue(this.config.options.queue);

                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context.prev = 8;
                _iterator = (0, _getIterator3.default)(this.config.jobs);

              case 10:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context.next = 17;
                  break;
                }

                job = _step.value;
                _context.next = 14;
                return this.defineJob(job);

              case 14:
                _iteratorNormalCompletion = true;
                _context.next = 10;
                break;

              case 17:
                _context.next = 23;
                break;

              case 19:
                _context.prev = 19;
                _context.t0 = _context['catch'](8);
                _didIteratorError = true;
                _iteratorError = _context.t0;

              case 23:
                _context.prev = 23;
                _context.prev = 24;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 26:
                _context.prev = 26;

                if (!_didIteratorError) {
                  _context.next = 29;
                  break;
                }

                throw _iteratorError;

              case 29:
                return _context.finish(26);

              case 30:
                return _context.finish(23);

              case 31:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[8, 19, 23, 31], [24,, 26, 30]]);
      }));

      function init() {
        return _ref.apply(this, arguments);
      }

      return init;
    }()

    /**
     * Defines a job
     *
     * @param  {Object} options - Job options
     * @param  {String} options.name - Job name
     * @param  {String} options.fn - Job method that is executed when the job is run
     * @param  {Number} options.attempts - Number of attempts a job is retried until marked as failure
     * @param  {Number} options.recipients - List of emails (separated by comma) to send email to on failure
     * @param  {String} options.cron - Interval-based scheduling written in cron syntax, ignored when delay is given
     */

  }, {
    key: 'defineJob',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(_ref3) {
        var attempts = _ref3.attempts;
        var cron = _ref3.cron;
        var recipients = _ref3.recipients;
        var fn = _ref3.fn;
        var name = _ref3.name;
        var options;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                (0, _assert2.default)(name, 'Job must have a name');

                options = { attempts: attempts };

                this._queue.process(name, function (job, done) {
                  return fn(job).then(done, done);
                });

                if (recipients) {
                  options.recipients = recipients;
                }

                if (!cron) {
                  _context2.next = 8;
                  break;
                }

                options.cron = cron;
                _context2.next = 8;
                return this._queueJob(name, options);

              case 8:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function defineJob(_x2) {
        return _ref2.apply(this, arguments);
      }

      return defineJob;
    }()

    /**
     * Initializes the queue mechanism
     *
     * This is mostly done to set up queue level logging and to be able to automatically
     * queue the next runs of cronjobs after their previous runs have completed.
     */

  }, {
    key: '_initQueue',
    value: function _initQueue() {
      var _this = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this._queue = _kue2.default.createQueue(options);
      this._queue.watchStuckJobs(5e3);

      if (NODE_ENV !== 'test') {
        this._queue.on('job start', function () {
          var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(id) {
            return _regenerator2.default.wrap(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    _context3.next = 2;
                    return _this._handleStart(id);

                  case 2:
                    return _context3.abrupt('return', _context3.sent);

                  case 3:
                  case 'end':
                    return _context3.stop();
                }
              }
            }, _callee3, _this);
          }));

          return function (_x4) {
            return _ref4.apply(this, arguments);
          };
        }());
        this._queue.on('job failed attempt', function () {
          var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(id, msg) {
            return _regenerator2.default.wrap(function _callee4$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    _context4.next = 2;
                    return _this._handleFailedAttempt(id, msg);

                  case 2:
                    return _context4.abrupt('return', _context4.sent);

                  case 3:
                  case 'end':
                    return _context4.stop();
                }
              }
            }, _callee4, _this);
          }));

          return function (_x5, _x6) {
            return _ref5.apply(this, arguments);
          };
        }());
        this._queue.on('job failed', function () {
          var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(id, msg) {
            return _regenerator2.default.wrap(function _callee5$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    _context5.next = 2;
                    return _this._handleFailed(id, msg);

                  case 2:
                    return _context5.abrupt('return', _context5.sent);

                  case 3:
                  case 'end':
                    return _context5.stop();
                }
              }
            }, _callee5, _this);
          }));

          return function (_x7, _x8) {
            return _ref6.apply(this, arguments);
          };
        }());
        this._queue.on('job complete', function () {
          var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(id) {
            return _regenerator2.default.wrap(function _callee6$(_context6) {
              while (1) {
                switch (_context6.prev = _context6.next) {
                  case 0:
                    _context6.next = 2;
                    return _this._handleComplete(id);

                  case 2:
                    return _context6.abrupt('return', _context6.sent);

                  case 3:
                  case 'end':
                    return _context6.stop();
                }
              }
            }, _callee6, _this);
          }));

          return function (_x9) {
            return _ref7.apply(this, arguments);
          };
        }());
      }

      this._queue.on('job complete', function () {
        var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(id) {
          return _regenerator2.default.wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  _context7.next = 2;
                  return _this.__handleCompleteAlways(id);

                case 2:
                  return _context7.abrupt('return', _context7.sent);

                case 3:
                case 'end':
                  return _context7.stop();
              }
            }
          }, _callee7, _this);
        }));

        return function (_x10) {
          return _ref8.apply(this, arguments);
        };
      }());
    }
  }, {
    key: '_handleStart',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(id) {
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this._logger.logStart(id);

              case 2:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function _handleStart(_x11) {
        return _ref9.apply(this, arguments);
      }

      return _handleStart;
    }()
  }, {
    key: '_handleFailedAttempt',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(id, msg) {
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return this._logger.logFailedAttempt(id, msg);

              case 2:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function _handleFailedAttempt(_x12, _x13) {
        return _ref10.apply(this, arguments);
      }

      return _handleFailedAttempt;
    }()
  }, {
    key: '_handleFailed',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(id, msg) {
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return this._logger.logFailure(id, msg);

              case 2:
                if (!this._mailer) {
                  _context10.next = 5;
                  break;
                }

                _context10.next = 5;
                return this._mailer.sendMail(id);

              case 5:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function _handleFailed(_x14, _x15) {
        return _ref11.apply(this, arguments);
      }

      return _handleFailed;
    }()
  }, {
    key: '_handleComplete',
    value: function () {
      var _ref12 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11(id) {
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return this._logger.logComplete(id);

              case 2:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function _handleComplete(_x16) {
        return _ref12.apply(this, arguments);
      }

      return _handleComplete;
    }()
  }, {
    key: '_handleCompleteAlways',
    value: function () {
      var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee12(id) {
        var job;
        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _context12.next = 2;
                return getJob(id);

              case 2:
                job = _context12.sent;

                if (!job.data.cron) {
                  _context12.next = 6;
                  break;
                }

                _context12.next = 6;
                return this._queueJob(job.data.name, job.data);

              case 6:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function _handleCompleteAlways(_x17) {
        return _ref13.apply(this, arguments);
      }

      return _handleCompleteAlways;
    }()

    /**
     * Initialize ØMQ reply socket
     *
     * Received messages add new jobs to the queue when the given job is defined in
     * the job configuration
     */

  }, {
    key: '_initSocket',
    value: function _initSocket() {
      var _this2 = this;

      var port = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.config.options.port;

      var responder = _zmqPrebuilt2.default.socket('rep');

      responder.on('message', function () {
        var _ref14 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee13(message) {
          var payload, job, data;
          return _regenerator2.default.wrap(function _callee13$(_context13) {
            while (1) {
              switch (_context13.prev = _context13.next) {
                case 0:
                  payload = JSON.parse(message.toString());
                  job = _this2.config.jobs.filter(function (job) {
                    return job.name === payload.name;
                  }).shift();

                  if (!job) {
                    _context13.next = 7;
                    break;
                  }

                  data = (0, _lodash.omit)((0, _assign2.default)(payload, job), 'fn', 'name');
                  _context13.next = 6;
                  return _this2._queueJob(job.name, data);

                case 6:
                  responder.send('ok');

                case 7:
                case 'end':
                  return _context13.stop();
              }
            }
          }, _callee13, _this2);
        }));

        return function (_x19) {
          return _ref14.apply(this, arguments);
        };
      }());

      responder.bind('tcp://*:' + port, function (err) {
        if (err) {
          throw new Error('Port binding: ' + err.message);
        } else if (NODE_ENV !== 'test') {
          _this2._logger.verbose('ZeroMQ rep socket listening on port ' + port);
        }
      });
    }

    /**
     * Checks if a cronjob of the given `name` is already scheduled.
     *
     * @param  {String} name - The jobs name
     * @return {Boolean}
     */

  }, {
    key: '_isCronScheduled',
    value: function () {
      var _ref15 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee14(name) {
        var jobsByType, cronjobsByType;
        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return getJobsByType(name, 'delayed', 0, 10000, 'desc');

              case 2:
                jobsByType = _context14.sent;
                cronjobsByType = jobsByType.filter(function (job) {
                  return !!job.data.cron;
                });
                return _context14.abrupt('return', cronjobsByType.length > 0);

              case 5:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function _isCronScheduled(_x20) {
        return _ref15.apply(this, arguments);
      }

      return _isCronScheduled;
    }()

    /**
     * Queues a job.
     *
     * @param  {String} name - Job name
     * @param  {Object} options - Job options
     * @param  {Number} options.attempts - Number of attempts a job is retried until marked as failure
     * @param  {Number} options.delay - Delay job run by the given amount of miliseconds
     * @param  {String} options.cron - Interval-based scheduling written in cron syntax, ignored when delay is given
     */

  }, {
    key: '_queueJob',
    value: function () {
      var _ref16 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee15(name, options) {
        var _this3 = this;

        var attempts, cron, delay, isScheduled;
        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                attempts = options.attempts;
                cron = options.cron;
                delay = options.delay;

                (0, _assert2.default)(!!cron || !!delay, 'To queue a job, either `cron` or `delay` needs to be defined');

                _context15.next = 6;
                return this._isCronScheduled(name);

              case 6:
                isScheduled = _context15.sent;


                if (!cron || !isScheduled) {
                  (function () {
                    var job = _this3._queue.create(name, (0, _assign2.default)(options, { name: name })).delay(delay || _this3._calculateDelay(cron)).attempts(attempts);

                    job.save(function (err) {
                      if (err) {
                        throw new Error('Job save: ' + err.message);
                      } else if (NODE_ENV !== 'test') {
                        _this3._logger.logQueued(job);
                      }
                    });
                  })();
                }

              case 8:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function _queueJob(_x21, _x22) {
        return _ref16.apply(this, arguments);
      }

      return _queueJob;
    }()

    /**
     * Calculates the delay until a cronjobs next run is due
     *
     * @param  {String} cron - Interval-based scheduling written in cron syntax
     * @return {Number} Number of miliseconds until next cron run
     */

  }, {
    key: '_calculateDelay',
    value: function _calculateDelay(cron) {
      return _later2.default.schedule(_later2.default.parse.cron(cron)).next(2).map(function (date) {
        return date.getTime() - Date.now();
      }).filter(function (msec) {
        return msec > 500;
      }).shift();
    }
  }]);
  return Dispo;
}();

exports.default = Dispo;