var test = require('tape')
var r = require('./index')

test('basic', function (t) {
    t.plan(1)
    r.getCSSRules('w-100', (err, rules) => {
        t.equals(rules.defaultRules[0], 'width: 100%')
    })
})

test('js 1', function (t) {
   t.plan(1)
    r.getJSObjectRules('w-100 bg-black', (err, obj) => { 
        const expectedDefault = {
            width: '100%',
            backgroundColor:'#000'
        }
        t.equals(JSON.stringify(obj.defaultRules), JSON.stringify(expectedDefault))
    })
})
