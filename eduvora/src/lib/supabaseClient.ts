import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Sanitize URL in case user pasted the REST URL with /rest/v1 or trailing slashes
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')
);

/**
 * When Supabase is not configured (no env vars), export a no-op client.
 * A real client pointing at a placeholder URL causes retry loops → infinite reloads.
 * The stub silently returns errors so the app runs in offline/mock mode.
 */
function createNoopSupabase(): SupabaseClient {
  const errObj = { message: 'Supabase not configured', code: 'NOT_CONFIGURED' };
  const resolved = { data: null, error: errObj };
  const noop = () => Promise.resolve(resolved);

  // Chainable query builder stub
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'single', 'order', 'gte', 'lte', 'ilike', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = m === 'single' || m === 'maybeSingle' ? noop : () => chain;
  }
  chain.then = (resolve: Function) => resolve(resolved);

  return {
    auth: {
      signInWithPassword: noop,
      signOut: noop,
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      admin: {
        createUser: noop,
        inviteUserByEmail: noop,
      },
    },
    from: () => chain,
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createNoopSupabase();
