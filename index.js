/* We need to convert tachyon class strings "w-100 h-100 p0"
 * to a css class with all the rules in it
 * usage: tachyons-to-css "class declaration"
 */

const fs = require('fs')
const path = require('path')
const split = require('split')
const through2 = require('through2')
const join = require('join-stream')
const fstream = fs.createReadStream(path.join(__dirname, 'tachyons.css'), 'utf8')

const eos = require('end-of-stream')
const iclass = process.argv.slice(2)

if (!iclass || iclass.length === 0) {
  console.log('usage: tachyons-to-css "h-100 w-100"')
  process.exit(1)
}

const atoms = iclass[0].split(' ')
console.log('atoms', atoms)

let rules = []
let rulesns = []
let rulesm = []
let rulesl = []

const log = through2(function (d, enc, next) {
  console.log(d.toString())
  next()
})

const extractRules = through2(function (d, enc, next) {
  const self = this
  const classd = d.toString()
  const exp = /(\.[^\{]+)\s\{(.+)\}/
  const m = classd.match(exp)
  if (m === null) {
    return next()
  }
  var ruleset

  const p1 = m[1]
  const p2 = m[2]

    // First part contains the class declaration
    // can be multiple classess '.c1,.c2'
    // Second part contains rules name:value; name:value;

    // Check if the current declaration contains any of the classes
  const classess = p1.split(' ')
  const declrules = p2.split(';')
  classess.forEach(function (cl) {
    const cname = cl.replace('.', '')
    if (cname.endsWith('-ns')) {
      ruleset = rulesns
    } else if (cname.endsWith('-m')) {
      ruleset = rulesm
    } else if (cname.endsWith('-l')) {
      ruleset = rulesl
    } else {
      ruleset = rules
    }

    if (atoms.indexOf(cname) >= 0) {
     // atom found, save rules
      declrules.forEach(function (drule) {
        self.push(drule)
        ruleset.push(drule)
        console.log('rule added', drule)
      })
    }
  })

    // We have the rules that apply to this class declaration. continue
  next(null)
})
/* Parse tachyons and extract the rules corresponding to the argument classes */
const stream = fstream.pipe(split()).on('end', function () {
  printAllRules()
}).pipe(extractRules)

stream.on('end', function () {
  console.log('end!')
})
function printAllRules () {
  console.log('Default')
  printRules(rules)

  console.log('Not small')
  printRules(rulesns)

  console.log('Medium')
  printRules(rulesm)

  console.log('Large')
  printRules(rulesl)
}

function printRules (rules) {
  console.log('{')
  rules.forEach((rule) => {
    if (rule && rule.trim().length > 0) {
      console.log(rule.trim() + ';')
    }
  })
  console.log('}')
}
