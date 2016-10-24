var Promise = require('bluebird')

module.exports = function (job) {
  return Promise.resolve().then(function () {
    const callMe = {}
    callMe.maybe()
  })
}
