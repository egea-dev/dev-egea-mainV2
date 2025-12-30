import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const fetchWithRetry = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
  retries = 3
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);

    if (
      retries > 0 &&
      error instanceof Error &&
      (error.name === 'AbortError' ||
        error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.message.includes('network'))
    ) {
      console.warn(`Fetch failed (${error.name}), retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
};

// MAIN Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'egea-productivity'
    },
    fetch: fetchWithRetry
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
});

// PRODUCTIVITY Supabase client
export const supabaseProductivity = createClient<Database>(
  import.meta.env.VITE_SUPABASE_PRODUCTIVITY_URL,
  import.meta.env.VITE_SUPABASE_PRODUCTIVITY_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: null // Explicitly disable storage to prevent conflict
    },
    global: {
      headers: {
        'X-Client-Info': 'egea-productivity-db'
      },
      fetch: fetchWithRetry
    },
    db: {
      schema: 'public'
    }
  }
);

export type SupabaseClient = SupabaseClientType<Database>;

export * from './types';
