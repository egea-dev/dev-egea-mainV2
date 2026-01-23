import { useQuery } from '@tanstack/react-query';
import { addWorkdays, getWorkdaysBetween } from '@/utils/workday-utils';

/**
 * Función centralizada para obtener días SLA según región (días LABORABLES)
 * Baleares: 7 días laborables
 * Península: 10 días laborables
 * Canarias: 20 días laborables
 */
export const getSLADays = (region?: string): number => {
    const slaMap: Record<string, number> = {
        // Baleares - 7 días laborables
        'MALLORCA': 7,
        'MENORCA': 7,
        'IBIZA': 7,
        'FORMENTERA': 7,
        'BALEARES': 7,

        // Península - 10 días laborables
        'PENINSULA': 10,

        // Canarias - 20 días laborables
        'CANARIAS': 20,
        'TENERIFE': 20,
        'GRAN_CANARIA': 20,
        'LANZAROTE': 20,
        'FUERTEVENTURA': 20,
        'LA_PALMA': 20,
        'LA_GOMERA': 20,
        'EL_HIERRO': 20,

        'DEFAULT': 10
    };

    const normalizedRegion = region?.toUpperCase() || 'DEFAULT';
    return slaMap[normalizedRegion] || slaMap['DEFAULT'];
};

// Alias para compatibilidad con código existente que lo use como hook
export const useSLADays = getSLADays;

/**
 * Calcula la fecha de vencimiento basada en delivery_date + SLA días
 */
export const calculateDueDate = (deliveryDate: string | null, region?: string): Date | null => {
    if (!deliveryDate) return null;

    const slaDays = getSLADays(region);
    const dueDate = new Date(deliveryDate);
    dueDate.setDate(dueDate.getDate() + slaDays);

    return dueDate;
};
