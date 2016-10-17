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
  nodemailerConfig: {
    transportOptions: null,
    mailOptions: {
      from: 'info@dispo-cheduler.com',
      to: '', // list of receivers, override this through the jobs config file
      subject: 'Dispo - job and cronjob scheduler for Node',
      text: ''
    }
  }
};

/**
 * Mailer
 */

var Mailer = function () {
  function Mailer(options) {
    (0, _classCallCheck3.default)(this, Mailer);

    this.config = (0, _assign2.default)({}, defaults, options);
  }

  (0, _createClass3.default)(Mailer, [{
    key: 'init',
    value: function init() {
      this._mailer = _nodemailer2.default.createTransport(this.config.nodemailerConfig.transportOptions || (0, _nodemailerSendmailTransport2.default)());
    }
  }, {
    key: 'sendMail',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(job) {
        var mailOptions, _ref2, data, id;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                mailOptions = this.config.nodemailerConfig.mailOptions;
                _context.next = 3;
                return (0, _.getJob)(job);

              case 3:
                _ref2 = _context.sent;
                data = _ref2.data;
                id = _ref2.id;

                // set recipients to empty string to disable mail in a per job basis

                if ('recipients' in data) {
                  mailOptions.to = data.recipients;
                }

                if ('enabled' in this.config) {
                  _context.next = 9;
                  break;
                }

                return _context.abrupt('return');

              case 9:
                if (!(this.config.enabled === false)) {
                  _context.next = 11;
                  break;
                }

                return _context.abrupt('return');

              case 11:
                if (!(mailOptions.to === '')) {
                  _context.next = 13;
                  break;
                }

                return _context.abrupt('return');

              case 13:

                mailOptions.text = 'Job ' + id + ' - ' + data.name + ': Failed on all ' + data.attempts + ' attempts.';

                return _context.abrupt('return', this._mailer.sendMail(mailOptions));

              case 15:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function sendMail(_x) {
        return _ref.apply(this, arguments);
      }

      return sendMail;
    }()
  }]);
  return Mailer;
}();

exports.default = Mailer;