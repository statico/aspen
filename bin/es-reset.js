#!/usr/bin/env node
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const colors = require('colors');
const {esReset} = require('../lib/elasticsearch');

esReset(() => console.log("✓ ".green, "Done."));
