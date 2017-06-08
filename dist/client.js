'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var zmq = require('zeromq');
var requester = zmq.socket('req');

var data = {
  name: 'randomSingle',
  delay: 5000,
  meta: { userId: '57bc570c6d505c72cc4d505f' }
};

var onMessage = function onMessage(reply) {
  console.log(reply.toString());
};

requester.on('message', onMessage);
requester.connect('tcp://localhost:5555');

setInterval(function () {
  requester.send((0, _stringify2.default)(data));
}, 1e3);