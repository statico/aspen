#!/usr/bin/env node

const chalk = require('chalk')
const { reset } = require('../lib/elasticsearch')

async function main () {
  await reset()
  console.log(chalk.green('✓'), 'Done.')
}

main()
