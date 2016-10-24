import fs from 'fs'
import { resolve } from 'path'

/**
 * @param {String} path
 * @param {Number} [mode=fs.R_OK]
 * @return {Boolean|String}
 */
export const getAbsolutePath = (path, mode = fs.R_OK) => {
  const dir = resolve(path)
  return fs.accessSync(dir, mode) || dir
}

/**
 * @param {Array<Object>} jobs
 * @param {String} basedir
 * @return {Array<Object>}
 */
export const parseJobs = (jobs, basedir) => {
  return Object
    .keys(jobs)
    .reduce((res, name) => {
      const { file, cron, attempts, backoff, notifyOnError } = jobs[name]

      if (!file) {
        throw new Error(`no file defined for job "${name}"`)
      }

      const job = require(getAbsolutePath(resolve(basedir, file)))

      const options = {
        attempts: attempts || 3,
        fn: job.default || job,
        name
      }

      if (cron) options.cron = cron
      if (backoff) options.backoff = backoff
      if (notifyOnError) options.notifyOnError = notifyOnError

      res.push(options)
      return res
    }, [])
}

/**
 * @typedef {Object} BackoffOptions
 * @property {String} type
 * @property {Number} [exponent=2]
 */
/**
 * Parses the given backoff options to iron out some inconveniences in kue.js, like e.g. type === 'exponential' only
 * doubling the delay instead of letting it grow exponentially.
 *
 * @param {Boolean|BackoffOptions} [backoff] Backoff algorithm configuration
 * @return {Boolean|BackoffOptions|Function} A backoff configuration that kue.js understands
 */
export const parseBackoff = (backoff) => {
  if (!backoff) {
    return
  }

  if (backoff.type === 'incremental') {
    return Object.assign({}, backoff, { type: 'exponential' })
  } else if (backoff.type === 'exponential') {
    return function (attempt, delay) {
      let range = []
      for (let n = 1; n < attempt; n++) {
        range.push(n)
      }
      return range.reduce((result, attempt) => {
        return Math.pow(result, 2)
      }, delay)
    }
  }
}
