import { createClient } from '@supabase/supabase-js';
import type { Database as MainDatabase } from './types-main';
import type { Database as ProductivityDatabase } from './types-productivity';

// DB MAIN EGEA V2 (Core: usuarios, instalaciones, comunicaciones)
const MAIN_URL = import.meta.env.VITE_SUPABASE_MAIN_URL || '';
const MAIN_ANON_KEY = import.meta.env.VITE_SUPABASE_MAIN_ANON_KEY || '';

// DB PRODUCTIVITY (Comercial, Producción, Almacén)
const PRODUCTIVITY_URL = import.meta.env.VITE_SUPABASE_PRODUCTIVITY_URL || '';
const PRODUCTIVITY_ANON_KEY = import.meta.env.VITE_SUPABASE_PRODUCTIVITY_ANON_KEY || '';

// Validar variables de entorno
if (!MAIN_URL || !MAIN_ANON_KEY) {
  throw new Error('Faltan las variables de entorno de Supabase MAIN (VITE_SUPABASE_MAIN_URL, VITE_SUPABASE_MAIN_ANON_KEY)');
}

if (!PRODUCTIVITY_URL || !PRODUCTIVITY_ANON_KEY) {
  throw new Error('Faltan las variables de entorno de Supabase PRODUCTIVITY (VITE_SUPABASE_PRODUCTIVITY_URL, VITE_SUPABASE_PRODUCTIVITY_ANON_KEY)');
}

// Cliente MAIN (usuarios, instalaciones, comunicaciones)
export const supabaseMain = createClient<MainDatabase>(MAIN_URL, MAIN_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'supabase.main.auth.token',
  },
});

// Cliente PRODUCTIVITY (comercial, producción, almacén)
// NOTA: Se ha eliminado la restricción de esquema para evitar errores 406 si 'almacen' no está expuesto.
// Se recomienda usar tablas en 'public' o asegurarse de exponer los esquemas necesarios en la API de Supabase.
export const supabaseProductivity = createClient<ProductivityDatabase>(PRODUCTIVITY_URL, PRODUCTIVITY_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'supabase.productivity.token',
  },
});

// Hook para usar ambos clientes
export const useDualSupabase = () => {
  return {
    main: supabaseMain,
    productivity: supabaseProductivity,
  };
};

// Re-exportar el cliente MAIN como default para compatibilidad con código existente
export const supabase = supabaseMain;
export default supabaseMain;
