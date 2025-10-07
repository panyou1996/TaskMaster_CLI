import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtebtntpwimxxfsspezs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZWJ0bnRwd2lteHhmc3NwZXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDU1NjcsImV4cCI6MjA3NDk4MTU2N30.yfqRqNMle1FVAvvsutsFZLK_9WkynRQdNlXAUOkE49U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
