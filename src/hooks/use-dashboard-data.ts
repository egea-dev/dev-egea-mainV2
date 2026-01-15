import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseProductivity } from "@/integrations/supabase/client";
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { DetailedTask } from "@/integrations/supabase/types";

export type CalendarMode = 'commercial' | 'installations';

export interface CommercialOrder {
    id: string;
    order_number: string;
    admin_code?: string;
    customer_name: string;
    customer_company?: string;
    status: 'PENDIENTE_PAGO' | 'PAGADO' | 'EN_PROCESO' | 'PTE_ENVIO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO' | 'EN_PRODUCCION' | 'LISTO_ENVIO';
    delivery_date: string | null;
    production_start_date: string | null;
    quantity_total: number;
    delivery_region?: string | null;
    region?: string | null;
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
    const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
        queryKey: ['commercial-orders-calendar', startStr, endStr],
        queryFn: async () => {
            // Fetch Active Orders (not delivered/cancelled) OR Orders in the current date range
            const statusFilter = `status.in.(PENDIENTE_PAGO,PAGADO,EN_PROCESO,PTE_ENVIO,EN_PRODUCCION,LISTO_ENVIO,ENVIADO,ENTREGADO)`;
            const dateFilter = `and(delivery_date.gte.${startStr},delivery_date.lte.${endStr})`;

            const { data, error } = await supabaseProductivity
                .from('comercial_orders')
                .select('id, order_number, admin_code, customer_name, customer_company, status, delivery_date, quantity_total, created_at, delivery_region, region')
                .or(`${statusFilter},${dateFilter}`)
                .order('delivery_date', { ascending: true });

            if (error) {
                console.error("Error fetching commercial calendar orders:", error);
                throw error;
            }

            return (data as any[]).map(o => ({
                id: o.id,
                order_number: o.order_number,
                admin_code: o.admin_code,
                customer_name: o.customer_company || o.customer_name || 'Cliente',
                customer_company: o.customer_company,
                status: o.status,
                delivery_date: o.delivery_date || o.created_at, // Fallback to created_at if no delivery date
                production_start_date: o.delivery_date || o.created_at,
                quantity_total: o.quantity_total,
                delivery_region: o.delivery_region,
                region: o.region
            })) as CommercialOrder[];
        },
        enabled: mode === 'commercial',
    });

    // Query for Installation Tasks
    const { data: tasks = [], isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
        queryKey: ['dashboard-tasks', startStr, endStr],
        queryFn: async () => {
            let query = supabase
                .from('detailed_tasks')
                .select('*')
                .eq('screen_group', 'Instalaciones');

            // Logic: Fetch ALL non-terminated tasks (Active)
            // PLUS terminated tasks that are within the current date range.
            // This ensures we always see pending work, but don't load 5 years of history.
            const activeFilter = `state.neq.terminado`;
            const historyFilter = `and(state.eq.terminado,start_date.gte.${startStr},start_date.lte.${endStr})`;

            query = query.or(`${activeFilter},${historyFilter}`);

            // Order by date to keep the calendar organized, nulls first for attention
            query = query.order('start_date', { ascending: true, nullsFirst: true });

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching tasks:", error);
                throw error;
            }

            return (data ?? []) as DetailedTask[];
        },
        enabled: mode === 'installations',
    });

    const refetch = async () => {
        if (mode === 'commercial') {
            return refetchOrders();
        } else {
            return refetchTasks();
        }
    };

    return {
        orders,
        tasks,
        isLoading: mode === 'commercial' ? loadingOrders : loadingTasks,
        refetch
    };
};
