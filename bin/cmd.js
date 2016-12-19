#!/usr/bin/env node

var minimist = require('minimist')
var getStdin = require('get-stdin')
var reverse = require('../index')

if (process.version.match(/v(\d+)\./)[1] < 4) {
  console.error('reverse-tachyons: Node v4 or greater is required. `standard` did not run.')
} else {
  var argv = minimist(process.argv.slice(2), {
    boolean: [
      'js',
      'radium',
      'css',
      'help'
    ]
  })
  // Unix convention: Command line argument `-` is a shorthand for --stdin
  if (argv._[0] === '-') {
    argv.stdin = true
    argv._.shift()
  }
  if (argv.help) {
    console.log(`
       Usage:
         reverse-tachyons <flags> [tachyons string]
       Flags:
         js : output JS definitions
         radium: output JS (Radium compatible) definitions
         css: output CSS definitions
      `
      )
    process.exitCode = 0
    return
  }

  var options = {
    js: argv.js,
    css: argv.css,
    radium: argv.radium
  }

  var stdinText
  if (argv.stdin) {
    getStdin().then(function (text) {
      stdinText = text
      reverse.process(text, options, onResult)
    })
  } else {
    reverse.process(argv._[0], options, onResult)
  }

  function onResult (err, result) {
    if (err) {
      return onError(err)
    }
    if (argv.stdin) {
      process.stdout.write(result)
    } else {
      process.stdout.write(result)
    }
  }

  function onError (err) {
    console.error(err.stack || err.message || err)
    process.exitCode = 1
    return
  }
}

