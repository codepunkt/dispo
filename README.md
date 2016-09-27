# Dispo

[![npm version](https://badge.fury.io/js/mongoose-patch-history.svg)](https://badge.fury.io/js/dispo) [![Build Status](https://travis-ci.org/gonsfx/dispo.svg?branch=master)](https://travis-ci.org/gonsfx/dispo) [![Coverage Status](https://coveralls.io/repos/github/gonsfx/dispo/badge.svg?branch=master)](https://coveralls.io/github/gonsfx/dispo?branch=master) [![Dependency Status](https://david-dm.org/gonsfx/dispo.svg)](https://david-dm.org/gonsfx/dispo) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Dispo is a job and cronjob scheduler for Node which uses [Kue](https://github.com/Automattic/kue) as its job queue and [Redis](http://redis.io/) to store job data. Definition of recurring jobs is done using crontab syntax, one-off jobs can be queued using [ZeroMQ](http://zeromq.org/) requests.

## Requirements

Please ensure that [ZeroMQ](http://zeromq.org/) is installed and you have a [Redis](http://redis.io/) instance available (which is used as storage mechanism).

- [Redis](http://redis.io/)
- [ZeroMQ](http://zeromq.org/)

## Installation

    $ npm install dispo

<!--
## Usage
Needs .json or .js with CommonJS export in which jobs are defined
-->
