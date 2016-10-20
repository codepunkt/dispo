import fs from 'fs'
import { spy } from 'sinon'
import sinonChai from 'sinon-chai'
import chai, { expect } from 'chai'
import path, { resolve } from 'path'
import Scheduler from '../src'
import Logger from '../src/logger'
import Mailer from '../src/mailer'

import {
  getAbsolutePath,
  parseJobs,
  parseBackoff
} from '../src/util'

chai.use(sinonChai)

describe('Utility methods', () => {
  describe('getAbsolutePath', () => {
    const existingPath = 'src/bin/dispo.js'

    it('throws when file doesnt exist', () => {
      expect(() => getAbsolutePath(existingPath)).to.not.throw(Error)
      expect(() => getAbsolutePath('nonexisting.json')).to.throw(Error)
    })

    it('returns absolute path when file exists', () => {
      expect(getAbsolutePath(existingPath)).to.equal(resolve(existingPath))
    })

    it('uses native fs and path methods', () => {
      const accessSync = spy(fs, 'accessSync')
      const resolve = spy(path, 'resolve')
      getAbsolutePath(existingPath)
      expect(resolve).to.have.been.calledOnce
      expect(resolve).to.have.been.calledWith(existingPath)
      expect(accessSync).to.have.been.calledOnce
      expect(accessSync).to.have.been.calledWith(resolve(existingPath), fs.R_OK)
      accessSync.restore()
      resolve.restore()
    })

    it('pass 2nd parameter to fs.accessSync', () => {
      const accessSync = spy(fs, 'accessSync')
      getAbsolutePath(existingPath, fs.W_OK)
      expect(accessSync).to.have.been.calledWith(resolve(existingPath), fs.W_OK)
      accessSync.restore()
    })
  })

  describe('parseJobs', () => {
    const base = process.cwd()

    it('throws for jobs without a file', () => {
      expect(() => parseJobs({ withoutFile: {} }, base)).to.throw(Error)
      expect(() => parseJobs({ nonExistingFile: { file: '404.js' } }, base)).to.throw(Error)
      expect(() => parseJobs({ existingFile: { file: 'example/jobs/random.js' } }, base)).to.not.throw(Error)
    })

    it('returns an array of jobs objects', () => {
      const file = 'example/jobs/random.js'
      const fn = require(`../${file}`)

      const result = parseJobs({
        random: { file, attempts: 2, recipients: 'example@email.com' },
        alsoRandom: { file, cron: '*/2 * * * *' },
        backoffFixed: { file, attempts: 2, backoff: { delay: 3000, type: 'fixed' } },
        backoffExponentially: { file, attempts: 2, backoff: { delay: 3000, type: 'exponential' } }
      }, base)

      expect(result).to.deep.equal([
        { name: 'random', attempts: 2, fn, recipients: 'example@email.com' },
        { name: 'alsoRandom', attempts: 3, fn, cron: '*/2 * * * *' },
        { name: 'backoffFixed', attempts: 2, fn, backoff: { delay: 3000, type: 'fixed' } },
        { name: 'backoffExponentially', attempts: 2, fn, backoff: { delay: 3000, type: 'exponential' } }
      ])
    })
  })

  describe('parseBackoff', () => {
    it('returns undefined when no backoff property is given', () => {
      const actualResult = parseBackoff()
      expect(actualResult).to.equal(undefined)
    })

    it(`returns a an object with type 'exponential' when given the type 'incremental'`, () => {
      const actualOptions = parseBackoff({ type: 'incremental' })
      expect(actualOptions).to.deep.equal({ type: 'exponential' })
    })

    it(`returns a exponential growth function when given the type 'exponential'`, () => {
      const delay = 3
      const fn = parseBackoff({ type: 'exponential' })
      const actualResult2ndAttempt = fn(2, delay)
      const actualResult3rdAttempt = fn(3, delay)
      const actualResult4thAttempt = fn(4, delay)
      expect(actualResult2ndAttempt).to.equal(9)
      expect(actualResult3rdAttempt).to.equal(81)
      expect(actualResult4thAttempt).to.equal(6561)
    })
  })
})

describe('Scheduler', () => {
  describe('initialization', () => {
    it('initializes a logger', () => {
      const scheduler = new Scheduler()
      scheduler.init()
      expect(scheduler._logger).to.be.instanceof(Logger)
    })

    it('initializes a mailer when switch is on', () => {
      const scheduler = new Scheduler({options: {mailer: {enabled: true}}})
      scheduler.init()
      expect(scheduler._mailer).to.be.instanceof(Mailer)
    })

    it('doesn\'t initializes a mailer by default', () => {
      const scheduler = new Scheduler()
      scheduler.init()
      expect(scheduler._mailer).to.be.undefined
    })
  })
})
