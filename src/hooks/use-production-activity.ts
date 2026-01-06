import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { ProductionActivity } from "@/types/production";

// Hook para obtener actividad de una work order
export const useProductionActivity = (workOrderId: string) => {
    return useQuery({
        queryKey: ['production-activity', workOrderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('produccion_activity')
                .select('*')
                .eq('work_order_id', workOrderId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching production activity:", error);
                throw error;
            }

            return data as ProductionActivity[];
        },
        enabled: !!workOrderId,
    });
};
