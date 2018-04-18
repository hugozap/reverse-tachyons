/* We need to convert tachyon class strings "w-100 h-100 p0"
 * to a css class with all the rules in it
 * usage: tachyons-to-css "class declaration"
 */

var fs = require('fs')
var path = require('path')
var split = require('split')
var through2 = require('through2')
var join = require('join-stream')
var eos = require('end-of-stream')
var util = require('util')
const intoStream = require('into-stream');

const tachyonsStr = fs.readFileSync(path.join(__dirname, 'node_modules/tachyons/css/tachyons.css'), 'utf8');
/*
 * Returns a javascript representation from a tachyons string
 */
function getJSObjectRules (tachyons, cb) {
  getCSSRules(tachyons, (err, ruleObj) => {
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
  const atoms = tachyons.trim().split(' ')
  const nsRules = []
  const mRules = []
  const lRules = []

  const fstream = intoStream(tachyonsStr)
  fstream.pipe(split()).pipe(extractRules(atoms, defaultRules, nsRules, mRules, lRules))

  fstream.on('end', function (err) {
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
    const validRules = rules.filter((e) => { return e.trim().length > 0 })
    validRules.forEach((rule) => {
      const parts = rule.split(': ')
      const prop = parts[0]
      const val = parts[1]
      const frule = prop + ': ' + val + ';'
      astr.push(frule)
    })
    astr.push('}')
    return astr.join(' ')
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

function process (tachyons, options, cb) {
  if (options.js) {
    var result = []
    getJSObjectRules(tachyons, function (err, obj) {
      result.push('->Defaults:')
      result.push(util.inspect(obj.defaultRules, false, null))
      if (Object.keys(obj.nsRules).length > 0) {
        result.push('->Not small:')
        result.push(util.inspect(obj.nsRules, false, null))
      }
      if (Object.keys(obj.mRules).length > 0) {
        result.push('->Medium:')
        result.push(util.inspect(obj.mRules, false, null))
      }
      if (Object.keys(obj.lRules).length > 0) {
        result.push('->Large:')
        result.push(util.inspect(obj.lRules, false, null))
      }
      cb(null, result.join('\n'))
    })
  } else if (options.radium) {
    console.log('TODO: Radium format')
  } else {
    getCSSFormat(tachyons, function (err, obj) {
      var result = []
        result.push(obj.defaultRules)
      if (obj.nsRules.length > 3) {
        result.push('--- Not small:')
        result.push(obj.nsRules)
      }
      if (obj.mRules.length > 3) {
        result.push('---- Medium:')
        result.push(obj.mRules)
      }
      if (obj.lRules.length > 3) {
        result.push('---- Large:')
        result.push(obj.lRules)
      }
      cb(null, result.join('\n\n'))
    })
  }
}
module.exports = {process, getCSSRules, getJSObjectRules, getCSSFormat}
