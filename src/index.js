import kue from 'kue'
import later from 'later'
import assert from 'assert'
import zmq from 'zmq-prebuilt'
import Promise, { all, promisify } from 'bluebird'
import { omit, merge } from 'lodash'
import Logger from './logger'
import Mailer from './mailer'
import { parseBackoff } from './util'

const { NODE_ENV } = process.env

/**
 * Default scheduler config
 */
const defaultConfig = {
  jobs: [],
  options: {
    port: 5555,
    logging: { path: 'log' },
    mailer: null
  }
}

/**
 * Promisified version of `kue.Job.rangeByType`
 * @type {Function}
 */
const getJobsByType = promisify(kue.Job.rangeByType)

/**
 * Promisified version of `kue.Job.get`
 *
 * @type {Function}
 */
export const getJob = promisify(kue.Job.get)

/**
 * Dispo Scheduler
 */
export default class Dispo {

  /**
   * Creates an instance of Dispo.
   *
   * @memberOf Dispo
   * @param {Object} [config={}]
   */
  constructor (config = {}) {
    this.config = merge({}, defaultConfig, config)
  }

  /**
   * Initializes logging, socket bindings and the queue mechanism
   *
   * @memberOf Dispo
   * @return {Promise<void>}
   */
  init () {
    this._logger = new Logger(this.config.options.logging)
    this._logger.init()

    if (this.config.options.mailer) {
      this._mailer = new Mailer(this.config.options.mailer)
      this._mailer.init()
    }

    this._initSocket()
    this._initQueue(this.config.options.queue)

    return all(this.config.jobs.map((job) => {
      return this.defineJob(job)
    }))
  }

  /**
   * @typedef {Object} DefineJobOptions
   * @property {String} name - Job name
   * @property {Function} fn - Job method that is executed when the job is run
   * @property {Number} attempts - Number of attempts a job is retried until marked as failure
   * @property {String} cron - Interval-based scheduling written in cron syntax, ignored when delay is given
   */
  /**
   * Defines a job
   *
   * @memberOf Dispo
   * @param {DefineJobOptions} options - Job options
   * @return {Promise<void>}
   */
  defineJob ({ attempts, cron, notifyOnError, fn, name, backoff }) {
    return new Promise((resolve, reject) => {
      assert(name, 'Job must have a name')

      const options = { attempts, backoff }
      this._queue.process(name, (job, done) => fn(job).then(done, done))

      if (notifyOnError) {
        options.notifyOnError = notifyOnError
      }

      if (cron) {
        options.cron = cron
        this._queueJob(name, options).then(resolve, reject)
      } else {
        resolve()
      }
    })
  }

  /**
   * Initializes the queue mechanism
   *
   * This is mostly done to set up queue level logging and to be able to automatically
   * queue the next runs of cronjobs after their previous runs have completed.
   *
   * @memberOf Dispo
   * @param {Object} [options={}]
   */
  _initQueue (options = {}) {
    this._queue = kue.createQueue(options)
    this._queue.watchStuckJobs(5e3)

    if (NODE_ENV !== 'test') {
      this._queue.on('job start', (id) => this._handleStart(id))
      this._queue.on('job failed attempt', (id, msg) => this._handleFailedAttempt(id, msg))
      this._queue.on('job failed', (id, msg) => this._handleFailed(id, msg))
      this._queue.on('job complete', (id) => this._handleLogComplete(id))
    }

    this._queue.on('job complete', (id) => this._handleComplete(id))
  }

  /**
   * Logs job starts
   *
   * @memberOf Dispo
   * @param {Number} id - Job id
   */
  _handleStart (id) {
    return this._logger.logStart(id)
  }

  /**
   * Logs failed attempts
   *
   * @memberOf Dispo
   * @param {Number} id - Job id
   * @param {String} msg - Error message
   */
  _handleFailedAttempt (id, msg) {
    return this._logger.logFailedAttempt(id, msg)
  }

  /**
   * Logs failed jobs and sends notification emails if configured to do so
   *
   * @memberOf Dispo
   * @param {Number} id - Job id
   * @param {String} msg - Error message
   */
  _handleFailed (id, msg) {
    return this._logger.logFailure(id, msg)
      .then(() => getJob(id))
      .then((job) => {
        if (this._mailer) {
          return this._mailer.sendMail(id, job.error())
        }
      })
  }

  /**
   * Logs completed jobs
   *
   * @memberOf Dispo
   * @param {Number} id - Job id
   */
  _handleLogComplete (id) {
    return this.logger.logComplete(id)
  }

  /**
   * Re-queues completed cron jobs
   *
   * @memberOf Dispo
   * @param {Number} id - Job id
   */
  _handleComplete (id) {
    return getJob(id).then((job) => {
      if (job.data.cron) {
        return this._queueJob(job.data.name, job.data)
      }
    })
  }

  /**
   * Initialize ØMQ reply socket
   *
   * Received messages add new jobs to the queue when the given job is defined in
   * the job configuration
   *
   * @memberOf Dispo
   * @param {Number|String} [port=this.config.options.port]
   */
  _initSocket (port = this.config.options.port) {
    const responder = zmq.socket('rep')

    responder.on('message', (message) => {
      const payload = JSON.parse(message.toString())
      const job = this.config.jobs.filter((job) => job.name === payload.name).shift()

      if (job) {
        const data = omit(Object.assign(payload, job), 'fn', 'name')
        this._queueJob(job.name, data).then(() => responder.send('ok'))
      }
    })

    responder.bind(`tcp://*:${port}`, (err) => {
      if (err) {
        throw new Error(`Port binding: ${err.message}`)
      } else if (NODE_ENV !== 'test') {
        this._logger.verbose(`ZeroMQ rep socket listening on port ${port}`)
      }
    })
  }

  /**
   * Checks if a cronjob of the given `name` is already scheduled.
   *
   * @memberOf Dispo
   * @param {String} name - The jobs name
   * @return {Promise<Boolean>}
   */
  _isCronScheduled (name) {
    return getJobsByType(name, 'delayed', 0, 10000, 'desc').then((jobsByType) => {
      const cronjobsByType = jobsByType.filter((job) => !!job.data.cron)
      return cronjobsByType.length > 0
    })
  }

  /**
   * @typedef {Object} QueueJobOptions
   * @property {Number} attempts - Number of attempts a job is retried until marked as failure
   * @property {Number} delay - Delay job run by the given amount of miliseconds
   * @property {String} cron - Interval-based scheduling written in cron syntax, ignored when delay is given
   * @property {Boolean|{type:String,delay:Number}} backoff - Interval-based scheduling written in cron syntax, ignored when delay is given
   */
  /**
   * Queues a job.
   *
   * @memberOf Dispo
   * @param {String} name - Job name
   * @param {QueueJobOptions} options - Job options
   * @return {Promise<void>}
   */
  _queueJob (name, options) {
    const { attempts, cron, delay, backoff } = options
    assert(!!cron || !!delay, 'To queue a job, either `cron` or `delay` needs to be defined')

    this._isCronScheduled(name).then((isScheduled) => {
      if (!cron || !isScheduled) {
        const job = this._queue.create(name, Object.assign(options, { name }))
          .delay(delay || this._calculateDelay(cron))
          .attempts(attempts)

        if (backoff) {
          console.log(name, backoff)
          job.backoff(parseBackoff(backoff))
        }

        job.save((err) => {
          if (err) {
            throw new Error(`Job save: ${err.message}`)
          } else if (NODE_ENV !== 'test') {
            this._logger.logQueued(job)
          }
        })
      }
    })
  }

  /**
   * Calculates the delay until a cronjobs next run is due
   *
   * @memberOf Dispo
   * @param {String} cron - Interval-based scheduling written in cron syntax
   * @return {Number} Number of miliseconds until next cron run
   */
  _calculateDelay (cron) {
    return later.schedule(later.parse.cron(cron)).next(2)
      .map((date) => date.getTime() - Date.now())
      .filter((msec) => msec > 500)
      .shift()
  }
}
