import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import type { Database as MainDatabase } from './types';
import type { Database as ProductivityDatabase } from './types-productivity';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_MAIN_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_MAIN_ANON_KEY;
const productivityUrl = import.meta.env.VITE_SUPABASE_PRODUCTIVITY_URL;
const productivityAnonKey = import.meta.env.VITE_SUPABASE_PRODUCTIVITY_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase (MAIN)');
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
export const supabaseMain = createClient<MainDatabase>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.main.auth.token', // Clave única para MAIN
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'egea-main'
    },
    fetch: fetchWithRetry
  },
  db: {
    schema: 'public'
  }
});

// Alias para compatibilidad
export const supabase = supabaseMain;

// PRODUCTIVITY Supabase client
export const supabaseProductivity = createClient<ProductivityDatabase>(
  productivityUrl || '',
  productivityAnonKey || '',
  {
    auth: {
      persistSession: false, // IMPORTANTE: No persistir para evitar colisiones de GoTrueClient
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: null
    },
    global: {
      headers: {
        'X-Client-Info': 'egea-productivity'
      },
      fetch: fetchWithRetry
    },
    db: {
      schema: 'public'
    }
  }
);

// Hook para compatibilidad con código que usa useDualSupabase
export const useDualSupabase = () => {
  return {
    main: supabaseMain,
    productivity: supabaseProductivity,
  };
};

export type SupabaseClient = SupabaseClientType<MainDatabase>;
export * from './types';
