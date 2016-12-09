'use strict';

var _zmqPrebuilt = require('zmq-prebuilt');

var _zmqPrebuilt2 = _interopRequireDefault(_zmqPrebuilt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var requester = _zmqPrebuilt2.default.socket('req');

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
  requester.send(JSON.stringify(data));
}, 1e3);