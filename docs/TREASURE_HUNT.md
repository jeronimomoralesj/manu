# Four-corner surprise

## Behavior and boundaries

Each distinct new correct trivia answer reveals one crack in fixed order: top left, top right, bottom left, bottom right. Clicking persists an opened timestamp; the correct physical code persists a separate solved timestamp. Wrong codes never advance progress. Server state survives reloads and device changes.

The fourth solved code atomically creates completion and one private owner-notification event. The song and gift message are fetched only after all four solves and only while the feature is enabled. Dismissing the final dialog persists acknowledgment; solved cracks can reopen it. Audio has user-operated controls.

This preserves the existing **one shared participant**. Anyone with the public site link shares progress; this is not identity-based recipient privacy. Adding recipient login is a separate change. Other legacy APIs were not broadly redesigned.

## Release prerequisites

1. Review and obtain approval for the database/security/storage change. Apply `supabase/migrations/20261008_treasure_hunt.sql` to the intended Supabase project before deploying these routes. It adds tables with direct browser access denied, service-role-only RPCs, and a private `treasure-audio` bucket. It never resets songs, memories, letters, points or questions. It can be rerun without resetting progress. Follow the project's normal backup process.
2. Verify the bucket is private. Existing buckets are deliberately not changed automatically; upload fails closed if this name already belongs to a public bucket. Also inspect existing storage.objects SELECT policies for anon/authenticated: a private bucket flag alone does not rule out an overly broad preexisting read policy. Do not change unrelated policies without reviewing scope.
3. Deploy and verify the exact application commit. Keep the surprise disabled until private configuration and live verification are complete.
4. The owner securely configures `RESEND_API_KEY` (send-only, preferably domain-scoped) and `TREASURE_EMAIL_FROM` in server hosting settings. Never use `NEXT_PUBLIC_`. Credential creation/entry and persistent grants require the owner's action/approval. This feature does not create accounts or keys.
5. Admin → Sorpresa reuses the existing verified `letters_admin` account. The owner notification goes to that verified account's email, fixed at first save. Save four physical codes plus reward title/message. Code inputs are write-only; blank preserves the existing hash. Use four different randomly generated codes, preferably 8+ characters. Accepted: ASCII letters, digits, spaces, hyphens, 4–64 characters; case and outside whitespace normalize.
6. Upload the actual recorded song privately: MP3, M4A, OGG, WAV or WebM, maximum 4 MiB, with basic container/signature validation. The limit stays below Vercel's request-body ceiling. Paths and signed storage URLs are never public. Older private uploads are retained rather than unexpectedly deleting them.
7. Have four genuinely new trivia questions available. Legacy answers are not guessed correct. Reset/replay gives feedback but never extra points or a crack. Answers made while disabled do not reveal cracks retroactively.
8. Configure an authorized server-side scheduler to GET `/api/cron/treasure-notify` every five minutes with `Authorization: Bearer <CRON_SECRET>`. The owner securely configures that secret. Verify the hosting plan supports the schedule; no upgrade or paid plan is implied. This change does not silently install a platform-specific cron. **Do not call notifications fully operational until this worker is configured and verified.** Immediate sending happens after completion; the worker retries if the tab closes. Admin also has an authenticated retry button.
9. Enable only after four codes, actual audio, and delivery configuration are ready. Use a separate staging database with synthetic questions/codes for live testing; never solve the real hunt as a production test.

## Security and notification reliability

- Codes are bcrypt-hashed in PostgreSQL. Public state and initial HTML contain no raw codes, hashes, audio paths, private email, or reward content.
- Public trivia omits the answer key. Feedback is returned only for a committed answer. Creating/editing/resetting/deleting questions and viewing keys require the existing admin role.
- Mutations lock one progress row. A permanent distinct-question ledger prevents replay/reset farming. One unique outbox record prevents duplicate completion events.
- Five code attempts per crack per rolling minute are enforced by the database, independent of client IP or identity.
- Cross-origin browser game mutations are rejected; responses are private/no-store.
- The frozen email payload and stable Resend idempotency key are reused. A database lease prevents concurrent sends. `sent_at` means provider acceptance, not inbox delivery.
- Resend retains keys for 24 hours; automatic retries stop at 23 hours after the first attempt to avoid an uncertain duplicate. An expired attempt needs provider delivery review before any manual repair. Never simply clear attempt timestamps or generate a fresh key.

## Verification commands

- `npm run test:cartas` and `npm run test:cartas:api`: existing letter regressions.
- `npm run test:treasure`: inputs, completion gates, audio signature, synthetic email retry.
- `npm run test:treasure:api`: local fake-Supabase HTTP contracts; not proof of SQL behavior.
- `npm run test:treasure:db`: actual local PostgreSQL migration/ACL/concurrency/rollback tests. The shell script installs pinned disposable dependencies in a temporary directory. For an existing isolated test runtime, set `TREASURE_DB_RUNTIME`.
- `npx tsc --noEmit`, targeted ESLint, `npm run build`.

Browser keyboard/mobile/playback/visual checks remain necessary before claiming visual QA. Tests never use production data or real email delivery.

References: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [email API](https://resend.com/docs/api-reference/emails/send-email).
