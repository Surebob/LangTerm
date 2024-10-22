import { createClient } from '@supabase/supabase-js'

// In Next.js, environment variables are replaced during build time
// We can access NEXT_PUBLIC_ variables directly
const supabaseUrl = 'https://yeblzgxbyytpcqiveojw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYmx6Z3hieXl0cGNxaXZlb2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1NzA4NDAsImV4cCI6MjA0NTE0Njg0MH0.bUueh7foOGdiBkekvqO1atJThT-dVcUpVW863g7CS5g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})