#! /usr/bin/env node
import fs from 'fs-extra'
import { resolve } from 'path'
import program from 'commander'
import Scheduler from '..'
import { version } from '../../package.json'

const checkFile = (path, mode = fs.constants.R_OK) => {
  const dir = resolve(path)
  return fs.accessSync(dir, mode) || dir
}

program
  .version(version)
  .option('-C, --config <config>', 'config file path, default: `jobs.json`')
  .option('-B, --basedir <basedir>', 'directory used as a base for relative config and job paths')
  .parse(process.argv)

program.config = program.config || 'jobs.json'
program.basedir = program.basedir || process.cwd()

if (program.basedir.slice(-1) !== '/') {
  program.basedir += '/'
}

const config = require(checkFile(`${program.basedir}${program.config}`))
const jobs = []

for (let name of Object.keys(config.jobs)) {
  const { file, cron, attempts } = config.jobs[name]
  jobs.push(Object.assign({ attempts }, cron ? { cron } : {}, {
    fn: require(checkFile(`${program.basedir}${file}`)).default,
    name
  }))
}

config.jobs = jobs

const scheduler = new Scheduler(config)
scheduler.init()
