// src/hooks/use-dual-supabase.ts
// Hook para facilitar el acceso a ambos clientes de Supabase

import { supabaseMain, supabaseProductivity } from '@/integrations/supabase';

export const useDualSupabase = () => {
    return {
        main: supabaseMain,
        productivity: supabaseProductivity,
    };
};
