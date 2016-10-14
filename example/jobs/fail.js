var Promise = require('bluebird')

module.exports = function (job) {
  return Promise.resolve().then(function () {
    throw new Error('oh noes')
  })
}
