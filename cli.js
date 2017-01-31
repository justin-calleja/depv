#!/usr/bin/env node

const columnify = require('columnify');
var { depsColumnifyDataF } = require('./src');

const loggers = [console.error, console.log];

depsColumnifyDataF.map(columnify).fork(...loggers);
