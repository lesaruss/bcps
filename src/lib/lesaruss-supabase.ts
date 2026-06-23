import { createBrowserClient } from '@supabase/ssr'

export const createLesarussClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_LESARUSS_SUPABASE_URL || 'https://fwbhwfxpncrsfhttimna.supabase.co',
    process.env.NEXT_PUBLIC_LESARUSS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA'
  )
}
