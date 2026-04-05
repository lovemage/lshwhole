import { createClient } from '@supabase/supabase-js'

const PUBLIC_SUPABASE_URL_FALLBACK = 'https://zalqqizdcqrzldfqfqip.supabase.co'
const PUBLIC_SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbHFxaXpkY3FyemxkZnFmcWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTkyMTYsImV4cCI6MjA3ODA3NTIxNn0.lbEx64TOropUVuZtgqQNI5k7yG8-bZPotLfiM_ho6PY'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL_FALLBACK
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY_FALLBACK

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const supabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
