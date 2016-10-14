import kue from 'kue'
import later from 'later'
import assert from 'assert'
import zmq from 'zmq-prebuilt'
import { promisify } from 'bluebird'
import { merge, omit } from 'lodash'
import Logger from './logger'
import { parseBackoff } from './util'

const { NODE_ENV } = process.env

/**
 * Default scheduler config
 */
const defaultConfig = {
  jobs: [],
  options: {
    port: 5555,
    logging: { path: 'log' }
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
   * @return {Promise<void>}
   */
  async init () {
    this._logger = new Logger(this.config.options.logging)
    this._logger.init()

    this._initSocket()
    this._initQueue(this.config.options.queue)

    for (let job of this.config.jobs) {
      await this.defineJob(job)
    }
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
  async defineJob ({ attempts, cron, fn, name, backoff }) {
    assert(name, 'Job must have a name')

    const options = { attempts, backoff }
    this._queue.process(name, (job, done) => fn(job).then(done, done))

    if (cron) {
      options.cron = cron
      await this._queueJob(name, options)
    }
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
      this._queue.on('job start', async (id) => await this._logger.logStart(id))
      this._queue.on('job failed attempt', async (id, msg) => await this._logger.logFailedAttempt(id, msg))
      this._queue.on('job failed', async (id, msg) => await this._logger.logFailure(id, msg))
      this._queue.on('job complete', async (id) => await this._logger.logComplete(id))
    }

    this._queue.on('job complete', async (id) => {
      const job = await getJob(id)
      if (job.data.cron) {
        await this._queueJob(job.data.name, job.data)
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

    responder.on('message', async (message) => {
      const payload = JSON.parse(message.toString())
      const job = this.config.jobs.filter((job) => job.name === payload.name).shift()

      if (job) {
        const data = omit(Object.assign(payload, job), 'fn', 'name')
        await this._queueJob(job.name, data)
        responder.send('ok')
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
  async _isCronScheduled (name) {
    const jobsByType = await getJobsByType(name, 'delayed', 0, 10000, 'desc')
    const cronjobsByType = jobsByType.filter((job) => !!job.data.cron)
    return cronjobsByType.length > 0
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
  async _queueJob (name, options) {
    const { attempts, cron, delay, backoff } = options
    assert(!!cron || !!delay, 'To queue a job, either `cron` or `delay` needs to be defined')

    const isScheduled = await this._isCronScheduled(name)

    if (!cron || !isScheduled) {
      const job = this._queue.create(name, Object.assign(options, { name }))
        .delay(delay || this._calculateDelay(cron))
        .attempts(attempts)

      if (backoff) {
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
