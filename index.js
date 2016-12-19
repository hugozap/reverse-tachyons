/* We need to convert tachyon class strings "w-100 h-100 p0"
 * to a css class with all the rules in it
 * usage: tachyons-to-css "class declaration"
 */

const fs = require('fs')
const path = require('path')
const split = require('split')
const through2 = require('through2')
const join = require('join-stream')
const eos = require('end-of-stream')
const iclass = process.argv.slice(2)

/*
 * Returns a javascript representation from a tachyons string
 */
function getJSObjectRules (tachyons, cb) {
  getCSSRules(tachyons, (err, ruleObj) => {
    console.log('ruleObj', ruleObj)
    cb(null, {
      defaultRules: getRulesJs(ruleObj.defaultRules),
      nsRules: getRulesJs(ruleObj.nsRules),
      mRules: getRulesJs(ruleObj.mRules),
      lRules: getRulesJs(ruleObj.lRules)
    })
  })
}

function getCSSRules (tachyons, cb) {
  const defaultRules = []
  const atoms = tachyons.split(' ')
  const nsRules = []
  const mRules = []
  const lRules = []

  const fstream = fs.createReadStream(path.join(__dirname, 'tachyons.css'), 'utf8')
  fstream.pipe(split()).pipe(extractRules(atoms, defaultRules, nsRules, mRules, lRules))

  fstream.on('end', function (err) {
    console.log('inside end event')
    if (err) {
      return cb(err)
    }
    cb(null, {
      defaultRules: defaultRules,
      nsRules: nsRules,
      mRules: mRules,
      lRules: lRules
    })
  })
}

/* Returns a stream that adds the rule to its corresponding array
 * depending on the atom name
 */
const extractRules = function (atoms, defaultRules, nsRules, mRules, lRules) {
  return through2(function (d, enc, next) {
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
        ruleset = nsRules
      } else if (cname.endsWith('-m')) {
        ruleset = mRules
      } else if (cname.endsWith('-l')) {
        ruleset = lRules
      } else {
        ruleset = defaultRules
      }

      if (atoms.indexOf(cname) >= 0) {
     // atom found, save rules
        declrules.forEach(function (drule) {
          drule = drule.trim()
          self.push(drule)
          ruleset.push(drule)
        })
      }
    })

    // We have the rules that apply to this class declaration. continue
    next(null)
  })
}

function printAllRules (format) {
  const printRules = format === 'js' ? printRulesJs : printRules
  console.log('Default')
  printRules(rules)

  console.log('Not small')
  printRules(rulesns)

  console.log('Medium')
  printRules(rulesm)

  console.log('Large')
  printRules(rulesl)
}

function toJSProperty (rule) {

}

function getRulesJs (rules) {
  const validRules = rules.filter((e) => { return e && e.trim().length > 0 })
  const obj = {}
  validRules.forEach((rule, ix) => {
    const parts = rule.split(': ')
    const prop = toJSNameFromCSS(parts[0])
    const val = parts[1]
    obj[prop] = val
  })
  return obj
}

/* convert the css property name to its js equivalent */
function toJSNameFromCSS (prop) {
    // background-size => backgroundSize
  const parts = prop.split('-').map(function (e, ix) {
    if (ix > 0) {
      return e.charAt(0).toUpperCase() + e.slice(1)
    }
    return e
  })

  return parts.join('')
}
function getCSSFormat (tachyons, cb) {
  function formatRule (rules) {
    let astr = []
    astr.push('{')
    const validRules = rules.filter( (e) => { return e.trim().length> 0 })
    validRules.forEach((rule) => {
      const parts = rule.split(': ')
      const prop = parts[0]
      const val = parts[1]
      const frule = prop + ': ' + val + ';'
      astr.push(frule)
    })
    astr.push('}')
    return astr.join('\n')
  }
  getCSSRules(tachyons, (err, rules) => {
    cb(null, {
      defaultRules: formatRule(rules.defaultRules),
      nsRules: formatRule(rules.nsRules),
      mRules: formatRule(rules.mRules),
      lRules: formatRule(rules.lRules)
    })
  })
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

module.exports = {getCSSRules, getJSObjectRules, getCSSFormat}
