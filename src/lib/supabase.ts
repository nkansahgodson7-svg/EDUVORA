import { createClient } from '@supabase/supabase-js';

// Fallback to placeholders for preview mode if environment variables aren't set
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
// Sanitize URL in case user pasted the REST URL with /rest/v1 or trailing slashes
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
