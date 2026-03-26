import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkbocpwzoqvqzthocgia.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrYm9jcHd6b3F2cXp0aG9jZ2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjIzNDEsImV4cCI6MjA5MDA5ODM0MX0.tJLzUWdHe4KS3zqRN-pMQOVD6YVMeSTXHGzZx2F8A-8'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
