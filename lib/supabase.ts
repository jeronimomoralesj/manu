import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Browser-safe client — uses publishable key, respects RLS
export function getBrowserClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  return createClient(url, key)
}

// Server-only client — uses secret key, bypasses RLS
export function getServerClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}
