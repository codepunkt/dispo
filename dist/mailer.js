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

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

var _nodemailerSendmailTransport = require('nodemailer-sendmail-transport');

var _nodemailerSendmailTransport2 = _interopRequireDefault(_nodemailerSendmailTransport);

var _ = require('.');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Default logger options
 * @type {Object}
 */
var defaults = {
  transport: (0, _nodemailerSendmailTransport2.default)(),
  mail: {
    from: 'Dispo <dispo@example.com>'
  }
};

/**
 * Mailer
 */

var Mailer = function () {

  /**
   * Creates an instance of Mailer.
   *
   * @memberOf Mailer
   * @param {Object} [config={}]
   */
  function Mailer(config) {
    (0, _classCallCheck3.default)(this, Mailer);

    this.config = (0, _assign2.default)({}, defaults, config);
  }

  /**
   * Initializes a nodemailer transport
   *
   * @memberOf Mailer
   * @return {Promise<void>}
   */


  (0, _createClass3.default)(Mailer, [{
    key: 'init',
    value: function init() {
      this._mailer = _nodemailer2.default.createTransport(this.config.transport);
    }
  }, {
    key: 'sendMail',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(job, message) {
        var _ref2, _ref2$data, notifyOnError, name, id;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return (0, _.getJob)(job);

              case 2:
                _ref2 = _context.sent;
                _ref2$data = _ref2.data;
                notifyOnError = _ref2$data.notifyOnError;
                name = _ref2$data.name;
                id = _ref2.id;

                if (notifyOnError) {
                  _context.next = 9;
                  break;
                }

                return _context.abrupt('return');

              case 9:

                this._mailer.sendMail((0, _assign2.default)({}, this.config.mail, {
                  to: notifyOnError,
                  subject: 'Job "' + name + '" (id ' + id + ') failed',
                  text: 'Job "' + name + '" (id ' + id + ') failed\n\n' + message
                }));

              case 10:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function sendMail(_x, _x2) {
        return _ref.apply(this, arguments);
      }

      return sendMail;
    }()
  }]);
  return Mailer;
}();

exports.default = Mailer;