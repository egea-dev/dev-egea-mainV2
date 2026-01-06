import { useQuery } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";

export interface SLAConfig {
    region: string;
    days: number;
}

export interface SLAStatus {
    isNearDeadline: boolean;
    isOverdue: boolean;
    status: 'OK' | 'WARNING' | 'OVERDUE';
    daysRemaining: number;
}

// Hook para obtener configuración SLA
export const useSLAConfig = () => {
    return useQuery({
        queryKey: ['sla-config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comercial_sla_config')
                .select('*')
                .order('days');

            if (error) {
                console.error("Error fetching SLA config:", error);
                throw error;
            }

            return data as SLAConfig[];
        },
        staleTime: 1000 * 60 * 60, // Cache por 1 hora
    });
};

// Función para calcular fecha límite
export const calculateDeadline = (
    orderDate: Date | string,
    region: string,
    slaConfig: SLAConfig[]
): Date => {
    const config = slaConfig.find(c => c.region === region);
    const days = config?.days || 7; // Default 7 días

    const date = new Date(orderDate);
    date.setDate(date.getDate() + days);
    return date;
};

// Función para calcular estado SLA
export const calculateSLAStatus = (
    deliveryDate: Date | string | null,
    warningDays: number = 2
): SLAStatus => {
    if (!deliveryDate) {
        return {
            isNearDeadline: false,
            isOverdue: false,
            status: 'OK',
            daysRemaining: 0
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(deliveryDate);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isOverdue = daysRemaining < 0;
    const isNearDeadline = daysRemaining >= 0 && daysRemaining <= warningDays;

    let status: 'OK' | 'WARNING' | 'OVERDUE' = 'OK';
    if (isOverdue) status = 'OVERDUE';
    else if (isNearDeadline) status = 'WARNING';

    return {
        isNearDeadline,
        isOverdue,
        status,
        daysRemaining
    };
};

// Hook para calcular SLA de un pedido específico
export const useOrderSLA = (
    orderDate: Date | string,
    deliveryRegion: string,
    deliveryDate: Date | string | null
) => {
    const { data: slaConfig = [] } = useSLAConfig();

    const calculatedDeadline = calculateDeadline(orderDate, deliveryRegion, slaConfig);
    const slaStatus = calculateSLAStatus(deliveryDate || calculatedDeadline);

    return {
        calculatedDeadline,
        slaStatus,
        slaConfig
    };
};
