import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { DetailedTask } from "@/integrations/supabase/types";

export type CalendarMode = 'commercial' | 'installations';

export interface CommercialOrder {
    id: string;
    order_number: string;
    customer_name: string;
    status: 'PENDIENTE_PAGO' | 'PAGADO' | 'EN_PRODUCCION' | 'LISTO_ENVIO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
    delivery_date: string | null;
    production_start_date: string | null;
    quantity_total: number;
}

export const useDashboardCalendarData = (
    date: Date,
    mode: CalendarMode,
    view: 'week' | 'month'
) => {
    // Calculate range based on view
    const startDate = view === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfMonth(date);

    const endDate = view === 'week'
        ? endOfWeek(date, { weekStartsOn: 1 })
        : endOfMonth(date);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Query for Commercial Orders
    const { data: orders = [], isLoading: loadingOrders } = useQuery({
        queryKey: ['commercial-orders-calendar', startStr, endStr],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, customer_name, status, created_at, quantity_total')
                .gte('created_at', startStr) // Simplified filter
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching commercial calendar orders:", error);
                throw error;
            }

            return (data as any[]).map(o => ({
                id: o.id,
                order_number: o.order_number,
                customer_name: o.customer_name,
                status: o.status,
                delivery_date: o.created_at, // Fallback to created_at
                production_start_date: o.created_at,
                quantity_total: o.quantity_total
            })) as CommercialOrder[];
        },
        enabled: mode === 'commercial',
    });

    // Query for Installation Tasks
    const { data: tasks = [], isLoading: loadingTasks } = useQuery({
        queryKey: ['dashboard-tasks', startStr, endStr],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('detailed_tasks')
                .select('*')
                .gte('start_date', startStr)
                .lte('start_date', endStr);

            if (error) {
                console.error("Error fetching tasks:", error);
                throw error;
            }
            return (data as any[]) as DetailedTask[];
        },
        enabled: mode === 'installations',
    });

    return {
        orders,
        tasks,
        isLoading: mode === 'commercial' ? loadingOrders : loadingTasks
    };
};
