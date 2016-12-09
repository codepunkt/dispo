'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

var _nodemailerSendmailTransport = require('nodemailer-sendmail-transport');

var _nodemailerSendmailTransport2 = _interopRequireDefault(_nodemailerSendmailTransport);

var _ = require('.');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
    _classCallCheck(this, Mailer);

    this.config = Object.assign({}, defaults, config);
  }

  /**
   * Initializes a nodemailer transport
   *
   * @memberOf Mailer
   * @return {Promise<void>}
   */


  _createClass(Mailer, [{
    key: 'init',
    value: function init() {
      this._mailer = _nodemailer2.default.createTransport(this.config.transport);
    }
  }, {
    key: 'sendMail',
    value: function sendMail(job, message) {
      var _this = this;

      return (0, _.getJob)(job).then(function (_ref) {
        var _ref$data = _ref.data;
        var notifyOnError = _ref$data.notifyOnError;
        var name = _ref$data.name;
        var id = _ref.id;

        if (!notifyOnError) return;

        return _this._mailer.sendMail(Object.assign({}, _this.config.mail, {
          to: notifyOnError,
          subject: 'Job "' + name + '" (id ' + id + ') failed',
          text: 'Job "' + name + '" (id ' + id + ') failed\n\n' + message
        }));
      });
    }
  }]);

  return Mailer;
}();

exports.default = Mailer;