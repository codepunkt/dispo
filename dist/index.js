'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getJob = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _kue = require('kue');

var _kue2 = _interopRequireDefault(_kue);

var _later = require('later');

var _later2 = _interopRequireDefault(_later);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _zmqPrebuilt = require('zmq-prebuilt');

var _zmqPrebuilt2 = _interopRequireDefault(_zmqPrebuilt);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _mailer = require('./mailer');

var _mailer2 = _interopRequireDefault(_mailer);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NODE_ENV = process.env.NODE_ENV;

/**
 * Default scheduler config
 */

var defaultConfig = {
  jobs: [],
  options: {
    port: 5555,
    logging: { path: 'log' },
    mailer: null
  }
};

/**
 * Promisified version of `kue.Job.rangeByType`
 * @type {Function}
 */
var getJobsByType = (0, _bluebird.promisify)(_kue2.default.Job.rangeByType);

/**
 * Promisified version of `kue.Job.get`
 *
 * @type {Function}
 */
var getJob = exports.getJob = (0, _bluebird.promisify)(_kue2.default.Job.get);

/**
 * Dispo Scheduler
 */

var Dispo = function () {

  /**
   * Creates an instance of Dispo.
   *
   * @memberOf Dispo
   * @param {Object} [config={}]
   */
  function Dispo() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Dispo);

    this.config = (0, _lodash.merge)({}, defaultConfig, config);
  }

  /**
   * Initializes logging, socket bindings and the queue mechanism
   *
   * @memberOf Dispo
   * @return {Promise<void>}
   */


  _createClass(Dispo, [{
    key: 'init',
    value: function init() {
      var _this = this;

      this._logger = new _logger2.default(this.config.options.logging);
      this._logger.init();

      if (this.config.options.mailer) {
        this._mailer = new _mailer2.default(this.config.options.mailer);
        this._mailer.init();
      }

      this._initSocket();
      this._initQueue(this.config.options.queue);

      return (0, _bluebird.all)(this.config.jobs.map(function (job) {
        return _this.defineJob(job);
      }));
    }

    /**
     * @typedef {Object} DefineJobOptions
     * @property {String} name - Job name
     * @property {Function} fn - Job method that is executed when the job is run
     * @property {Number} attempts - Number of attempts a job is retried until marked as failure
     * @property {String} cron - Interval-based scheduling written in cron syntax, ignored when delay is given
     */
    /**
     * Defines a job
     *
     * @memberOf Dispo
     * @param {DefineJobOptions} options - Job options
     * @return {Promise<void>}
     */

  }, {
    key: 'defineJob',
    value: function defineJob(_ref) {
      var _this2 = this;

      var attempts = _ref.attempts;
      var cron = _ref.cron;
      var notifyOnError = _ref.notifyOnError;
      var fn = _ref.fn;
      var name = _ref.name;
      var backoff = _ref.backoff;

      return new _bluebird2.default(function (resolve, reject) {
        (0, _assert2.default)(name, 'Job must have a name');

        var options = { attempts: attempts, backoff: backoff };
        _this2._queue.process(name, function (job, done) {
          return fn(job).then(done, done);
        });

        if (notifyOnError) {
          options.notifyOnError = notifyOnError;
        }

        if (cron) {
          options.cron = cron;
          _this2._queueJob(name, options).then(resolve, reject);
        } else {
          resolve();
        }
      });
    }

    /**
     * Initializes the queue mechanism
     *
     * This is mostly done to set up queue level logging and to be able to automatically
     * queue the next runs of cronjobs after their previous runs have completed.
     *
     * @memberOf Dispo
     * @param {Object} [options={}]
     */

  }, {
    key: '_initQueue',
    value: function _initQueue() {
      var _this3 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      this._queue = _kue2.default.createQueue(options);
      this._queue.watchStuckJobs(5e3);

      if (NODE_ENV !== 'test') {
        this._queue.on('job start', function (id) {
          return _this3._handleStart(id);
        });
        this._queue.on('job failed attempt', function (id, msg) {
          return _this3._handleFailedAttempt(id, msg);
        });
        this._queue.on('job failed', function (id, msg) {
          return _this3._handleFailed(id, msg);
        });
        this._queue.on('job complete', function (id) {
          return _this3._handleLogComplete(id);
        });
      }

      this._queue.on('job complete', function (id) {
        return _this3._handleComplete(id);
      });
    }

    /**
     * Logs job starts
     *
     * @memberOf Dispo
     * @param {Number} id - Job id
     */

  }, {
    key: '_handleStart',
    value: function _handleStart(id) {
      return this._logger.logStart(id);
    }

    /**
     * Logs failed attempts
     *
     * @memberOf Dispo
     * @param {Number} id - Job id
     * @param {String} msg - Error message
     */

  }, {
    key: '_handleFailedAttempt',
    value: function _handleFailedAttempt(id, msg) {
      return this._logger.logFailedAttempt(id, msg);
    }

    /**
     * Logs failed jobs and sends notification emails if configured to do so
     *
     * @memberOf Dispo
     * @param {Number} id - Job id
     * @param {String} msg - Error message
     */

  }, {
    key: '_handleFailed',
    value: function _handleFailed(id, msg) {
      var _this4 = this;

      return this._logger.logFailure(id, msg).then(function () {
        return getJob(id);
      }).then(function (job) {
        if (_this4._mailer) {
          return _this4._mailer.sendMail(id, job.error());
        }
      });
    }

    /**
     * Logs completed jobs
     *
     * @memberOf Dispo
     * @param {Number} id - Job id
     */

  }, {
    key: '_handleLogComplete',
    value: function _handleLogComplete(id) {
      return this.logger.logComplete(id);
    }

    /**
     * Re-queues completed cron jobs
     *
     * @memberOf Dispo
     * @param {Number} id - Job id
     */

  }, {
    key: '_handleComplete',
    value: function _handleComplete(id) {
      var _this5 = this;

      return getJob(id).then(function (job) {
        if (job.data.cron) {
          return _this5._queueJob(job.data.name, job.data);
        }
      });
    }

    /**
     * Initialize ØMQ reply socket
     *
     * Received messages add new jobs to the queue when the given job is defined in
     * the job configuration
     *
     * @memberOf Dispo
     * @param {Number|String} [port=this.config.options.port]
     */

  }, {
    key: '_initSocket',
    value: function _initSocket() {
      var _this6 = this;

      var port = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.config.options.port;

      var responder = _zmqPrebuilt2.default.socket('rep');

      responder.on('message', function (message) {
        var payload = JSON.parse(message.toString());
        var job = _this6.config.jobs.filter(function (job) {
          return job.name === payload.name;
        }).shift();

        if (job) {
          var data = (0, _lodash.omit)(Object.assign(payload, job), 'fn', 'name');
          _this6._queueJob(job.name, data).then(function () {
            return responder.send('ok');
          });
        }
      });

      responder.bind('tcp://*:' + port, function (err) {
        if (err) {
          throw new Error('Port binding: ' + err.message);
        } else if (NODE_ENV !== 'test') {
          _this6._logger.verbose('ZeroMQ rep socket listening on port ' + port);
        }
      });
    }

    /**
     * Checks if a cronjob of the given `name` is already scheduled.
     *
     * @memberOf Dispo
     * @param {String} name - The jobs name
     * @return {Promise<Boolean>}
     */

  }, {
    key: '_isCronScheduled',
    value: function _isCronScheduled(name) {
      return getJobsByType(name, 'delayed', 0, 10000, 'desc').then(function (jobsByType) {
        var cronjobsByType = jobsByType.filter(function (job) {
          return !!job.data.cron;
        });
        return cronjobsByType.length > 0;
      });
    }

    /**
     * @typedef {Object} QueueJobOptions
     * @property {Number} attempts - Number of attempts a job is retried until marked as failure
     * @property {Number} delay - Delay job run by the given amount of miliseconds
     * @property {String} cron - Interval-based scheduling written in cron syntax, ignored when delay is given
     * @property {Boolean|{type:String,delay:Number}} backoff - Interval-based scheduling written in cron syntax, ignored when delay is given
     */
    /**
     * Queues a job.
     *
     * @memberOf Dispo
     * @param {String} name - Job name
     * @param {QueueJobOptions} options - Job options
     * @return {Promise<void>}
     */

  }, {
    key: '_queueJob',
    value: function _queueJob(name, options) {
      var _this7 = this;

      var attempts = options.attempts;
      var cron = options.cron;
      var delay = options.delay;
      var backoff = options.backoff;

      (0, _assert2.default)(!!cron || !!delay, 'To queue a job, either `cron` or `delay` needs to be defined');

      this._isCronScheduled(name).then(function (isScheduled) {
        if (!cron || !isScheduled) {
          (function () {
            var job = _this7._queue.create(name, Object.assign(options, { name: name })).delay(delay || _this7._calculateDelay(cron)).attempts(attempts);

            if (backoff) {
              console.log(name, backoff);
              job.backoff((0, _util.parseBackoff)(backoff));
            }

            job.save(function (err) {
              if (err) {
                throw new Error('Job save: ' + err.message);
              } else if (NODE_ENV !== 'test') {
                _this7._logger.logQueued(job);
              }
            });
          })();
        }
      });
    }

    /**
     * Calculates the delay until a cronjobs next run is due
     *
     * @memberOf Dispo
     * @param {String} cron - Interval-based scheduling written in cron syntax
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