var Promise = require('bluebird')

var wait = function (seconds) {
  seconds = seconds || Math.random() * 4 + 1
  return new Promise(function (resolve) {
    setTimeout(function () { resolve() }, 1e3 * seconds)
  })
}

module.exports = function (job) {
  return wait().then(function () {
    if (Math.random() > 0.6) {
      throw new Error('oh noes')
    }
  })
}
