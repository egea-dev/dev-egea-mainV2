/**
 * Utilidades para cálculo de días LABORABLES (Lunes a Viernes)
 * 
 * Configuración de tiempos por región:
 * - Baleares: 7 días laborables = 2 recepción + 4 producción + 1 envío
 * - Península: 10 días laborables = 2 recepción + 5 producción + 3 envío
 * - Canarias: 20 días laborables = 2 recepción + 7 producción + 11 envío
 */

export interface DeliveryBreakdown {
    totalDays: number;
    receptionDays: number;
    productionDays: number;
    shippingDays: number;
}

/**
 * Configuración de tiempos de entrega por región (en días LABORABLES)
 */
export const DELIVERY_CONFIG: Record<string, DeliveryBreakdown> = {
    // Baleares: 7 días total
    BALEARES: { totalDays: 7, receptionDays: 2, productionDays: 4, shippingDays: 1 },
    MALLORCA: { totalDays: 7, receptionDays: 2, productionDays: 4, shippingDays: 1 },
    MENORCA: { totalDays: 7, receptionDays: 2, productionDays: 4, shippingDays: 1 },
    IBIZA: { totalDays: 7, receptionDays: 2, productionDays: 4, shippingDays: 1 },
    FORMENTERA: { totalDays: 7, receptionDays: 2, productionDays: 4, shippingDays: 1 },

    // Península: 10 días total
    PENINSULA: { totalDays: 10, receptionDays: 2, productionDays: 5, shippingDays: 3 },

    // Canarias: 20 días total
    CANARIAS: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    TENERIFE: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    GRAN_CANARIA: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    LANZAROTE: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    FUERTEVENTURA: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    LA_PALMA: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    LA_GOMERA: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },
    EL_HIERRO: { totalDays: 20, receptionDays: 2, productionDays: 7, shippingDays: 11 },

    // Default (Península)
    DEFAULT: { totalDays: 10, receptionDays: 2, productionDays: 5, shippingDays: 3 }
};

/**
 * Verifica si una fecha es día laborable (Lunes a Viernes)
 * @param date Fecha a verificar
 * @returns true si es día laborable (L-V), false si es fin de semana
 */
export function isWorkday(date: Date): boolean {
    const day = date.getDay();
    // 0 = Domingo, 6 = Sábado
    return day !== 0 && day !== 6;
}

/**
 * Añade N días LABORABLES a una fecha
 * Excluye sábados y domingos del cálculo
 * 
 * @param startDate Fecha de inicio
 * @param workdays Número de días laborables a añadir
 * @returns Nueva fecha después de añadir los días laborables
 */
export function addWorkdays(startDate: Date, workdays: number): Date {
    const result = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < workdays) {
        result.setDate(result.getDate() + 1);
        if (isWorkday(result)) {
            daysAdded++;
        }
    }

    return result;
}

/**
 * Calcula el número de días LABORABLES entre dos fechas
 * 
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @returns Número de días laborables entre las fechas (puede ser negativo si endDate < startDate)
 */
export function getWorkdaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Determinar dirección
    const isForward = end >= start;
    let current = new Date(isForward ? start : end);
    const target = new Date(isForward ? end : start);

    let workdays = 0;
    while (current < target) {
        current.setDate(current.getDate() + 1);
        if (isWorkday(current)) {
            workdays++;
        }
    }

    return isForward ? workdays : -workdays;
}

/**
 * Calcula los días laborables restantes hasta una fecha de vencimiento
 * 
 * @param dueDate Fecha de vencimiento (string o Date)
 * @returns Días laborables restantes (negativo si ya venció)
 */
export function getWorkdaysRemaining(dueDate: string | Date | null | undefined): number {
    if (!dueDate) return 999;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        return getWorkdaysBetween(today, due);
    } catch {
        return 999;
    }
}

/**
 * Obtiene el desglose de tiempos de entrega para una región
 * 
 * @param region Región de entrega
 * @returns Objeto con desglose de tiempos
 */
export function getDeliveryBreakdown(region?: string): DeliveryBreakdown {
    if (!region) return DELIVERY_CONFIG.DEFAULT;

    const normalizedRegion = region.toUpperCase().replace(/\s+/g, '_');
    return DELIVERY_CONFIG[normalizedRegion] || DELIVERY_CONFIG.DEFAULT;
}

export function getProductionWorkdays(region?: string): number {
    return getDeliveryBreakdown(region).productionDays;
}

export function getShippingWorkdays(region?: string): number {
    return getDeliveryBreakdown(region).shippingDays;
}

export function getReceptionWorkdays(region?: string): number {
    return getDeliveryBreakdown(region).receptionDays;
}

/**
 * Obtiene los días SLA totales para una región (días LABORABLES)
 * 
 * @param region Región de entrega
 * @returns Número de días laborables totales
 */
export function getSLAWorkdays(region?: string): number {
    return getDeliveryBreakdown(region).totalDays;
}

/**
 * Calcula la fecha de vencimiento basada en fecha de entrega + SLA días laborables
 * 
 * @param deliveryDate Fecha de entrega del pedido
 * @param region Región de entrega
 * @returns Fecha de vencimiento calculada
 */
export function calculateDueDateWorkdays(deliveryDate: string | Date | null, region?: string): Date | null {
    if (!deliveryDate) return null;

    try {
        const start = new Date(deliveryDate);
        const slaDays = getSLAWorkdays(region);
        return addWorkdays(start, slaDays);
    } catch {
        return null;
    }
}

export function calculateProductionDueDate(startDate: string | Date | null, region?: string): Date | null {
    if (!startDate) return null;
    try {
        const start = new Date(startDate);
        const days = getProductionWorkdays(region);
        return addWorkdays(start, days);
    } catch {
        return null;
    }
}

export function calculateShippingDueDate(startDate: string | Date | null, region?: string): Date | null {
    if (!startDate) return null;
    try {
        const start = new Date(startDate);
        const days = getShippingWorkdays(region);
        return addWorkdays(start, days);
    } catch {
        return null;
    }
}

/**
 * Formatea la información de tiempo de entrega para mostrar al usuario
 * 
 * @param region Región de entrega
 * @returns String descriptivo con el tiempo de entrega
 */
export function getDeliveryTimeText(region?: string): string {
    const breakdown = getDeliveryBreakdown(region);
    return `${breakdown.totalDays} días laborables`;
}

/**
 * Obtiene descripción detallada del desglose de tiempos
 * 
 * @param region Región de entrega
 * @returns String con desglose completo
 */
export function getDeliveryBreakdownText(region?: string): string {
    const b = getDeliveryBreakdown(region);
    return `Total: ${b.totalDays} días (${b.receptionDays} recepción + ${b.productionDays} producción + ${b.shippingDays} envío)`;
}
