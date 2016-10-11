#! /usr/bin/env node
import { resolve } from 'path'
import program from 'commander'
import Scheduler from '..'
import { version } from '../../package.json'
import { getAbsolutePath, parseJobs } from '../util'

program
  .version(version)
  .option('-C, --config <config>', 'config file path, default: `jobs.json`')
  .option('-B, --basedir <basedir>', 'directory used as a base for relative config and job paths')
  .parse(process.argv)

program.config = program.config || 'jobs.json'
program.basedir = program.basedir || process.cwd()

try {
  const config = require(getAbsolutePath(resolve(program.basedir, program.config)))
  config.jobs = parseJobs(config.jobs, program.basedir)
  const scheduler = new Scheduler(config)
  scheduler.init()
} catch (e) {
  console.log('errored', e)
  throw e
}
