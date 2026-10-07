import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unlockDateToIso, publicCarta, parseCartaInput, isCartaLocked } from '../lib/cartas.ts'
import type { Carta } from '../types/index.ts'
const letter: Carta = { id: 'test', title: 'Test', body: 'PRIVATE TEST BODY', image_base64: 'PRIVATE IMAGE', sent_at: null, created_at: '2026-10-01T00:00:00Z', is_read: false, unlock_at: '2026-10-08T05:00:00.000Z', is_locked: true }
test('Bogota midnight converts to 05:00 UTC regardless of local timezone', () => {
  assert.equal(unlockDateToIso('2026-10-08'), '2026-10-08T05:00:00.000Z')
  assert.equal(unlockDateToIso('2028-02-29'), '2028-02-29T05:00:00.000Z')
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '', null, '2026-1-01']) assert.equal(unlockDateToIso(invalid), null)
})
test('future content never appears in public serialized letter', () => {
  const result = publicCarta(letter, Date.parse('2026-10-08T04:59:59.999Z'))
  assert.equal(result.is_locked, true); assert.equal(result.body, null); assert.equal(result.image_base64, null)
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false)
})
test('opens exactly at midnight Bogota, past and legacy letters stay open', () => {
  assert.equal(publicCarta(letter, Date.parse('2026-10-08T05:00:00Z')).body, letter.body)
  assert.equal(isCartaLocked(letter, Date.parse('2026-10-09T05:00:00Z')), false)
  assert.equal(isCartaLocked({ unlock_at: null }), false)
  assert.equal(isCartaLocked({ unlock_at: 'invalid' }), true)
})
test('validates date, title and content and ignores client attempt to unlock', () => {
  const input = {title:' Test ',body:' Hello ', unlock_date:'2026-10-08', is_locked:false, unlock_at:null}
  const result = parseCartaInput(input)
  assert.equal(result.title,'Test'); assert.equal(result.body,'Hello'); assert.equal(result.unlock_at,letter.unlock_at)
  assert.throws(()=>parseCartaInput({...input,body:''})); assert.throws(()=>parseCartaInput({...input,title:''})); assert.throws(()=>parseCartaInput({...input,unlock_date:'2026-02-30'}))
})

test('optional original calendar date also uses Bogota midnight', () => {
  const result = parseCartaInput({title:'Test', body:'Test', unlock_date:'2026-10-08', sent_at:'2026-10-07'})
  assert.equal(result.sent_at, '2026-10-07T05:00:00.000Z')
})
