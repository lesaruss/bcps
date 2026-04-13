import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kopkfgwrodnofuceufdd.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvcGtmZ3dyb2Rub2Z1Y2V1ZmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzM2OTcsImV4cCI6MjA5MDY0OTY5N30.-okm1n7FEqr70-Y_EtL9gboeCfvnjzymludC03V1bl8'
  );
};
