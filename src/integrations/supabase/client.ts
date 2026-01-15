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

// ============================================================================
// ARQUITECTURA MODULAR: MAIN + PRODUCTIVITY
// ============================================================================
// Este proyecto usa dos bases de datos Supabase separadas intencionalmente:
// - MAIN: Autenticación, usuarios, recursos, instalaciones
// - PRODUCTIVITY: Comercial, producción, envíos, almacén
//
// NOTA SOBRE EL WARNING "Multiple GoTrueClient instances":
// Este warning aparece en la consola del navegador porque creamos dos clientes
// Supabase. Supabase mismo aclara: "It is not an error, but this should be 
// avoided". En nuestro caso es SEGURO porque:
// 1. Usamos diferentes bases de datos (no hay conflicto de datos)
// 2. Solo MAIN maneja autenticación (Productivity usa interceptor)
// 3. No hay operaciones concurrentes sobre las mismas tablas
// El warning es benigno y se puede ignorar.
// ============================================================================

type GlobalSupabaseCache = typeof globalThis & {
  __supabaseMain?: SupabaseClientType<MainDatabase>;
  __supabaseProductivity?: SupabaseClientType<ProductivityDatabase>;
};

const globalSupabase = globalThis as GlobalSupabaseCache;

// MAIN Supabase client - Única instancia con autenticación
const mainClient =
  globalSupabase.__supabaseMain ??
  createClient<MainDatabase>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.main.auth.token',
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

if (import.meta.env.DEV) {
  globalSupabase.__supabaseMain = mainClient;
}

export const supabaseMain = mainClient;

// Alias para compatibilidad
export const supabase = supabaseMain;

// Interceptor de fetch que inyecta el token de MAIN en las peticiones de PRODUCTIVITY
// Esto permite compartir la autenticación sin crear múltiples instancias de GoTrueClient
const fetchWithMainAuth = async (
  url: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> => {
  // Obtener el token de la sesión de MAIN
  const { data: { session } } = await supabaseMain.auth.getSession();

  // Inyectar el token en los headers si existe
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // Llamar al fetch con retry usando los headers modificados
  return fetchWithRetry(url, { ...options, headers });
};

// PRODUCTIVITY Supabase client
// CAMBIO: Ahora tiene su propia sesión independiente
// Esto resuelve el error "No suitable key or wrong key type" causado por
// el rechazo del token de MAIN en PRODUCTIVITY (diferentes JWT secrets)
const productivityClient =
  globalSupabase.__supabaseProductivity ??
  createClient<ProductivityDatabase>(
    productivityUrl || '',
    productivityAnonKey || '',
    {
      auth: {
        persistSession: true, // ?o. Sesi??n propia
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase.productivity.auth.token', // ?o. Storage key propio
        storage: window.localStorage,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'X-Client-Info': 'egea-productivity'
        },
        fetch: fetchWithRetry // ?o. Usa fetch normal con retry
      },
      db: {
        schema: 'public'
      }
    }
  );

if (import.meta.env.DEV) {
  globalSupabase.__supabaseProductivity = productivityClient;
}

export const supabaseProductivity = productivityClient;

// Hook para compatibilidad con código que usa useDualSupabase
export const useDualSupabase = () => {
  return {
    main: supabaseMain,
    productivity: supabaseProductivity,
  };
};

export type SupabaseClient = SupabaseClientType<MainDatabase>;
export * from './types';
