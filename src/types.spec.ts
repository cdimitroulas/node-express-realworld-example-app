import { assert } from 'chai'
import * as o from 'fp-ts/lib/Option'

import { string } from './types'

describe('generic types', () => {
  describe('string', () => {
    it('succeeds when given a string', () => {
      assert.deepStrictEqual(string('hello'), o.some('hello'))
    })

    it('fails when given something which is not a string', () => {
      assert.deepStrictEqual(string(null), o.none)
      assert.deepStrictEqual(string({}), o.none)
      assert.deepStrictEqual(string([]), o.none)
      assert.deepStrictEqual(string(0), o.none)
      assert.deepStrictEqual(string(new Date()), o.none)
    })
  })
})
