var test = require('tape')
var r = require('./index')

test('basic', function (t) {
  t.plan(1)
  r.getCSSRules('w-100', (err, rules) => {
    t.equals(rules.defaultRules[0], 'width: 100%')
  })
})

test('CSS declaration', function (t) {
    t.plan(1)
    r.getCSSFormat('w-100 h-100 w-50-ns w-10-m w-20-l', (err, ob) => { 
        const expectedDefault = `{
height: 100%;
width: 100%;
}`
        t.equals( ob.defaultRules, expectedDefault)
    })
})

test('js 1', function (t) {
  t.plan(1)
  r.getJSObjectRules('w-100 bg-black', (err, obj) => {
    const expectedDefault = {
      width: '100%',
      backgroundColor: '#000'
    }
    t.equals(JSON.stringify(obj.defaultRules), JSON.stringify(expectedDefault))
  })
})

test('responsive 1', function (t) {
  t.plan(4)
  r.getJSObjectRules('w-100 w-50-ns w-10-m w-20-l', (err, ob) => {
    const expecteDefault = {
      width: '100%'
    }
    const expectedNotSmall = {
      width: '50%'
    }
    const expectedMedium = {
      width: '10%'
    }
    const expectedLarge = {
      width: '20%'
    }
    t.deepEqual(ob.defaultRules, expecteDefault)
    t.deepEqual(ob.nsRules, expectedNotSmall)
    t.deepEqual(ob.mRules, expectedMedium)
    t.deepEqual(ob.lRules, expectedLarge)
  })
})
