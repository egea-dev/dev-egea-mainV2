/**
 * Servicio de Priorización Dinámica para Kioscos de Producción v3.1.0
 * 
 * Implementa un sistema de scoring con jerarquía estricta:
 * 1. Ventana de envío a Canarias (Lunes-Miércoles)
 * 2. Agrupación por Material + Fecha de Entrega
 * 3. Urgencia por fecha de caducidad (Inversa)
 */

import { WorkOrder } from '@/types/production';
import { getDeliveryBreakdown, getWorkdaysRemaining } from '@/utils/workday-utils';

export interface WorkOrderWithPriority extends WorkOrder {
    _priority_score?: number;
    _is_grouped_material?: boolean;
    _group_material_name?: string;
    _is_canarias_urgent?: boolean;
    _priority_level?: 'critical' | 'warning' | 'material' | 'normal';
}

/**
 * Verifica si HOY es Lunes, Martes o Miércoles
 * @param dateString - Opcional: si se proporciona, verifica esa fecha. Si no, usa la fecha actual.
 */
export function isMondayToWednesday(dateString?: string): boolean {
    try {
        const date = dateString ? new Date(dateString) : new Date();
        const dayOfWeek = date.getDay();
        // 0=Domingo (preparación), 1=Lunes, 2=Martes, 3=Miércoles
        return dayOfWeek >= 0 && dayOfWeek <= 3;
    } catch {
        return false;
    }
}

/**
 * Calcula los días restantes hasta la fecha de caducidad
 */
export function daysToDueDate(dueDateString: string | null | undefined): number {
    if (!dueDateString) return 999;
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueDate = new Date(dueDateString);
        dueDate.setHours(0, 0, 0, 0);
        const diffMs = dueDate.getTime() - now.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
        return 999;
    }
}

/**
 * Determina el nivel de prioridad para estilos visuales
 */
export function getPriorityLevel(order: WorkOrderWithPriority): 'critical' | 'warning' | 'material' | 'normal' {
    if (order._is_canarias_urgent) return 'warning'; // Ámbar/Naranja según requerimiento

    const days = daysToDueDate(order.due_date);
    if (days <= 2) return 'critical'; // Rojo

    if (order._is_grouped_material) return 'material'; // Verde

    return 'normal';
}

/**
 * Determina si una región pertenece a Canarias
 */
export function isCanarias(region?: string): boolean {
    if (!region) return false;
    const r = region.toUpperCase();
    return r.includes('CANARIAS') ||
        r.includes('TENERIFE') ||
        r.includes('GRAN CANARIA') ||
        r.includes('PALMA') ||
        r.includes('GOMERA') ||
        r.includes('HIERRO') ||
        r.includes('LANZAROTE') ||
        r.includes('FUERTEVENTURA');
}

/**
 * Normaliza una fecha para agrupamiento (solo YYYY-MM-DD)
 */
function normalizeDate(dateStr?: string | null): string {
    if (!dateStr) return 'N/D';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/D';
        return d.toISOString().split('T')[0];
    } catch {
        return 'N/D';
    }
}

/**
 * Calcula el score de prioridad para un pedido (Jerarquía Estricta)
 * P1. Canarias + HOY es L-M: +10000
 * P2. Material Grupos (mismo material + misma fecha): +5000
 * P3. Días restantes: inversamente proporcional
 */
export function calculatePriorityScore(workOrder: WorkOrder, isGrouped: boolean = false): number {
    let score = 0;

    // P1: Canarias + HOY es Lunes/Martes/Miércoles
    if (isCanarias(workOrder.region) && isMondayToWednesday()) {
        score += 10000;
    }

    // P2: Agrupación por Material
    if (isGrouped) {
        score += 5000;
    }

    // P3: Fecha de Vencimiento (Ascendente - menor días = mayor prioridad)
    const daysRemaining = daysToDueDate(workOrder.due_date);
    if (daysRemaining <= 0) {
        score += 2000; // Vencido
    } else if (daysRemaining <= 2) {
        score += 1000; // Crítico
    } else {
        // Puntos inversamente proporcionales a los días (hasta 30 días)
        score += Math.max(0, (30 - daysRemaining) * 10);
    }

    return score;
}

/**
 * Ordena pedidos por prioridad dinámica y añade metadata
 */
export function sortWorkOrdersByPriority(orders: WorkOrder[]): WorkOrderWithPriority[] {
    // 1. Detección preliminar de grupos (Material + Fecha [YYYY-MM-DD] coincidente)
    const materialDateMap = new Map<string, number>();
    orders.forEach(o => {
        const normDate = normalizeDate(o.due_date);
        const key = `${o.fabric || 'N/D'}_${normDate}`;
        materialDateMap.set(key, (materialDateMap.get(key) || 0) + 1);
    });

    // 2. Mapeo con scores y flags
    const ordersWithMeta: WorkOrderWithPriority[] = orders.map(order => {
        const normDate = normalizeDate(order.due_date);
        const key = `${order.fabric || 'N/D'}_${normDate}`;
        const isGrouped = (materialDateMap.get(key) || 0) >= 2;

        const enhanced: WorkOrderWithPriority = {
            ...order,
            _is_canarias_urgent: isCanarias(order.region) && isMondayToWednesday(),
            _is_grouped_material: isGrouped,
            _group_material_name: isGrouped ? order.fabric : undefined
        };

        enhanced._priority_score = calculatePriorityScore(enhanced, isGrouped);
        enhanced._priority_level = getPriorityLevel(enhanced);

        return enhanced;
    });

    // 3. Ordenación descendente por score
    return ordersWithMeta.sort((a, b) => (b._priority_score || 0) - (a._priority_score || 0));
}

/**
 * Obtiene el badge de urgencia (Días Laborables + Dinámico por Región)
 */
export function getUrgencyBadge(
    daysRemaining: number,
    region?: string
): { label: string; color: string } | null {
    // Obtener umbral dinámico según región (shippingDays + 1)
    const breakdown = getDeliveryBreakdown(region);
    const urgentThreshold = breakdown.shippingDays + 1;

    if (daysRemaining < 0) {
        return {
            label: 'VENCIDO',
            color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40'
        };
    }
    if (daysRemaining <= urgentThreshold) {
        return {
            label: 'URGENTE',
            color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40'
        };
    }
    return {
        label: 'A TIEMPO',
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
    };
}
