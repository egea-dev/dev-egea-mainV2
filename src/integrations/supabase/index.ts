// src/integrations/supabase/index.ts
// Exportaciones unificadas de Supabase

export { supabaseMain, supabaseProductivity, useDualSupabase } from './dual-client';
export type { Database as MainDatabase } from './types-main';
export type { Database as ProductivityDatabase } from './types-productivity';
