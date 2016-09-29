import kue from 'kue'
import zmq from 'zmq'
import later from 'later'
import assert from 'assert'
import { promisify } from 'bluebird'
import { assign, omit } from 'lodash'
import Logger from './logger'

/**
 * Default scheduler config
 * @type {Object}
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
 * @type {Function}
 */
export const getJob = promisify(kue.Job.get)

/**
 * Dispo Scheduler
 */
export default class Dispo {
  constructor (config = {}) {
    this.config = assign({}, defaultConfig, config)
  }

  /**
   * Initializes logging, socket bindings and the queue mechanism
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
   * Defines a job
   *
   * @param  {Object} options - Job options
   * @param  {String} options.name - Job name
   * @param  {String} options.fn - Job method that is executed when the job is run
   * @param  {Number} options.attempts - Number of attempts a job is retried until marked as failure
   * @param  {String} options.cron - Interval-based scheduling written in cron syntax, ignored when delay is given
   */
  async defineJob ({ attempts, cron, fn, name }) {
    assert(name, 'Job must have a name')

    const defaultOptions = { attempts: 3 }
    const options = Object.assign(defaultOptions, { attempts })

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
   */
  _initQueue (options = {}) {
    this._queue = kue.createQueue(options)
    this._queue.watchStuckJobs(5e3)

    this._queue.on('job start', async (id) => await this._logger.logStart(id))
    this._queue.on('job failed attempt', async (id, msg) => await this._logger.logFailedAttempt(id, msg))
    this._queue.on('job failed', async (id, msg) => await this._logger.logFailure(id, msg))

    this._queue.on('job complete', async (id) => {
      const job = await getJob(id)
      await this._logger.logComplete(job)
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
      } else {
        this._logger.verbose(`ZeroMQ rep socket listening on port ${port}`)
      }
    })
  }

  /**
   * Checks if a cronjob of the given `name` is already scheduled.
   *
   * @param  {String} name - The jobs name
   * @return {Boolean}
   */
  async _isCronScheduled (name) {
    const jobsByType = await getJobsByType(name, 'delayed', 0, 10000, 'desc')
    const cronjobsByType = jobsByType.filter((job) => !!job.data.cron)
    return cronjobsByType.length > 0
  }

  /**
   * Queues a job.
   *
   * @param  {String} name - Job name
   * @param  {Object} options - Job options
   * @param  {Number} options.attempts - Number of attempts a job is retried until marked as failure
   * @param  {Number} options.delay - Delay job run by the given amount of miliseconds
   * @param  {String} options.cron - Interval-based scheduling written in cron syntax, ignored when delay is given
   */
  async _queueJob (name, options) {
    const { attempts, cron, delay } = options
    assert(!!cron || !!delay, 'To queue a job, either `cron` or `delay` needs to be defined')

    const isScheduled = await this._isCronScheduled(name)

    if (!cron || !isScheduled) {
      const job = this._queue.create(name, Object.assign(options, { name }))
        .delay(delay || this._calculateDelay(cron))
        .attempts(attempts)

      job.save((err) => {
        if (err) {
          throw new Error(`Job save: ${err.message}`)
        } else {
          this._logger.logQueued(job)
        }
      })
    }
  }

  /**
   * Calculates the delay until a cronjobs next run is due
   *
   * @param  {String} cron - Interval-based scheduling written in cron syntax
   * @return {Number} Number of miliseconds until next cron run
   */
  _calculateDelay (cron) {
    return later.schedule(later.parse.cron(cron)).next(2)
      .map((date) => date.getTime() - Date.now())
      .filter((msec) => msec > 500)
      .shift()
  }
}
