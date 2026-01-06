// Hook para usar el cliente dual Supabase
import { useDualSupabase } from '@/integrations/supabase';

/**
 * Hook para acceder a ambas bases de datos
 * 
 * @example
 * const { main, productivity } = useDualClients();
 * 
 * // Consultar usuarios de DB MAIN
 * const { data: users } = await main.from('profiles').select();
 * 
 * // Consultar pedidos de DB PRODUCTIVITY
 * const { data: orders } = await productivity.from('comercial.orders').select();
 */
export const useDualClients = () => {
    return useDualSupabase();
};
