import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmswoyiuoeqzeassubvw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kyhsOoWxO8YEBczAIJsUxQ_9KUmxFV2'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
