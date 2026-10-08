import { test } from 'node:test'
import assert from 'node:assert/strict'
import { audioMatchesType, crackIndex, normalizeCode, parseTreasureConfig, isComplete, parseQuestion, type TreasureState } from '../lib/treasure.ts'
import { sendCompletionMail } from '../lib/treasure-notifications.ts'

test('exactly four fixed indices and strict normalized codes', () => {
  for (const index of [0, 1, 2, 3]) assert.equal(crackIndex(index), index)
  for (const index of [-1, 4, '0', null, NaN, 1.5]) assert.throws(() => crackIndex(index))
  assert.equal(normalizeCode('  amor-123  '), 'AMOR-123')
  for (const code of ['', 'abc', 1234, '😃😃😃😃', 'a'.repeat(65)]) assert.throws(() => normalizeCode(code))
})
test('config keeps blank codes without exposing stored values', () => {
  const input = { enabled: false, codes: ['', ' test ', '', 'NEW-4'], title: ' Hola ', message: ' Mensaje ' }
  assert.deepEqual(parseTreasureConfig(input), { enabled: false, codes: ['', 'TEST', '', 'NEW-4'], title: 'Hola', message: 'Mensaje' })
  assert.throws(() => parseTreasureConfig({ ...input, codes: ['ONE1'] }))
  assert.throws(() => parseTreasureConfig({ ...input, enabled: 'true' }))
})
test('reward requires all four correct corner records plus server completion', () => {
  const state: TreasureState = { enabled: true, cracks: [0, 1, 2, 3].map(index => ({ index, revealed_at: 'now', opened_at: 'now', solved_at: 'now' })), completed_at: 'now', completion_seen_at: null }
  assert.equal(isComplete(state), true)
  assert.equal(isComplete({ ...state, enabled: false }), false)
  assert.equal(isComplete({ ...state, completed_at: null }), false)
  assert.equal(isComplete({ ...state, cracks: state.cracks.slice(1) }), false)
  assert.equal(isComplete({ ...state, cracks: state.cracks.map(c => ({ ...c, index: 0 })) }), false)
  assert.equal(isComplete({ ...state, cracks: state.cracks.map(c => c.index === 3 ? { ...c, solved_at: null } : c) }), false)
})
test('question data is validated before authorized edits', () => {
  const q = { question: ' Test ', options: [' Yes ', 'No'], correct_option_index: 0, points_reward: 20 }
  assert.equal(parseQuestion(q).question, 'Test')
  assert.throws(() => parseQuestion({ ...q, correct_option_index: 2 }))
  assert.throws(() => parseQuestion({ ...q, points_reward: -10 }))
})
test('notification retry uses same key and private recipient, errors are non-sensitive', async () => {
  const requests: RequestInit[] = []
  let fail = true
  const fakeFetch: typeof fetch = async (_url, init) => { requests.push(init!); return Response.json(fail ? { error: 'Provider failure' } : { id: 'synthetic-provider-id' }, { status: fail ? 503 : 200 }) }
  const event = { id: 1, lease_until: 'synthetic', payload: { from: 'first@example.invalid', to: 'owner@example.invalid', subject: 'Synthetic completion', text: 'Synthetic event' } }
  const env = { RESEND_API_KEY: 'test-only-key', TREASURE_EMAIL_FROM: 'test@example.invalid' }
  await assert.rejects(sendCompletionMail(event, fakeFetch, env), /503/)
  fail = false
  assert.equal(await sendCompletionMail(event, fakeFetch, { ...env, TREASURE_EMAIL_FROM: 'changed@example.invalid' }), 'synthetic-provider-id')
  assert.deepEqual(requests[0].headers, requests[1].headers)
  assert.equal(requests[0].body, requests[1].body)
  assert.deepEqual(JSON.parse(String(requests[0].body)).to, ['owner@example.invalid'])
  await assert.rejects(sendCompletionMail(event, fakeFetch, {}), /not configured/)
})

test('audio upload checks actual container rather than trusting MIME alone', () => {
  const bytes = (value: string) => new TextEncoder().encode(value)
  assert.equal(audioMatchesType(bytes('ID3synthetic'), 'audio/mpeg'), true)
  assert.equal(audioMatchesType(new Uint8Array([255, 251, 144, 0]), 'audio/mpeg'), true)
  assert.equal(audioMatchesType(bytes('<html>fake.mp3</html>'), 'audio/mpeg'), false)
  assert.equal(audioMatchesType(bytes('RIFF0000WAVEsample'), 'audio/wav'), true)
  assert.equal(audioMatchesType(bytes('not really audio'), 'audio/wav'), false)
})
