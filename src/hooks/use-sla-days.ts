import { useQuery } from '@tanstack/react-query';

/**
 * Hook centralizado para obtener días SLA según región
 * Baleares: 7 días
 * Península: 10 días
 * Canarias: 15 días
 */
export const useSLADays = (region?: string): number => {
    const slaMap: Record<string, number> = {
        // Baleares - 7 días
        'MALLORCA': 7,
        'MENORCA': 7,
        'IBIZA': 7,
        'FORMENTERA': 7,
        'BALEARES': 7,

        // Península - 10 días
        'PENINSULA': 10,

        // Canarias - 15 días
        'CANARIAS': 15,
        'TENERIFE': 15,
        'GRAN_CANARIA': 15,
        'LANZAROTE': 15,
        'FUERTEVENTURA': 15,
        'LA_PALMA': 15,
        'LA_GOMERA': 15,
        'EL_HIERRO': 15,

        'DEFAULT': 10
    };

    const normalizedRegion = region?.toUpperCase() || 'DEFAULT';
    return slaMap[normalizedRegion] || slaMap['DEFAULT'];
};

/**
 * Calcula la fecha de vencimiento basada en delivery_date + SLA días
 */
export const calculateDueDate = (deliveryDate: string | null, region?: string): Date | null => {
    if (!deliveryDate) return null;

    const slaDays = useSLADays(region);
    const dueDate = new Date(deliveryDate);
    dueDate.setDate(dueDate.getDate() + slaDays);

    return dueDate;
};
