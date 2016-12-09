import zmq from 'zmq-prebuilt'

const requester = zmq.socket('req')

const data = {
  name: 'randomSingle',
  delay: 5000,
  meta: { userId: '57bc570c6d505c72cc4d505f' }
}

const onMessage = function (reply) {
  console.log(reply.toString())
}

requester.on('message', onMessage)
requester.connect('tcp://localhost:5555')

setInterval(() => {
  requester.send(JSON.stringify(data))
}, 1e3)
