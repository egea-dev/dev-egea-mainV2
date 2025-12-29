// src/hooks/use-customers.ts
// Hook para gestionar clientes usando el cliente de PRODUCTIVITY

import { useQuery } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';

export const useCustomers = () => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .schema('comercial')
                .from('customers')
                .select('*');

            if (error) throw error;
            return data;
        },
    });
};
