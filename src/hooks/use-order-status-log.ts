import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";

export interface StatusLogEntry {
    id: string;
    order_id: string;
    old_status: string | null;
    new_status: string;
    comment: string;
    changed_by: string;
    changed_at: string;
}

export const useOrderStatusLog = (orderId: string) => {
    return useQuery({
        queryKey: ['order-status-log', orderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comercial_order_status_log')
                .select('*')
                .eq('order_id', orderId)
                .order('changed_at', { ascending: false });

            if (error) {
                console.error("Error fetching status log:", error);
                throw error;
            }

            return data as StatusLogEntry[];
        },
        enabled: !!orderId
    });
};
