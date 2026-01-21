/**
 * Servicio de Priorización Dinámica para Kioscos de Producción v3.1.0
 * 
 * Implementa un sistema de scoring con jerarquía estricta:
 * 1. Ventana de envío a Canarias (Lunes-Miércoles)
 * 2. Agrupación por Material + Fecha de Entrega
 * 3. Urgencia por fecha de caducidad (Inversa)
 */

import { WorkOrder } from '@/types/production';

export interface WorkOrderWithPriority extends WorkOrder {
    _priority_score?: number;
    _is_grouped_material?: boolean;
    _group_material_name?: string;
    _is_canarias_urgent?: boolean;
    _priority_level?: 'critical' | 'warning' | 'material' | 'normal';
}

/**
 * Verifica si una fecha cae en Lunes, Martes o Miércoles
 */
export function isMondayToWednesday(dateString: string): boolean {
    try {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        // 1=Lunes, 2=Martes, 3=Miércoles
        return dayOfWeek >= 1 && dayOfWeek <= 3;
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
 * Calcula el score de prioridad para un pedido (Jerarquía Estricta)
 * 1. Canarias (L-M): +10000
 * 2. Material Grupos: +5000 (solo si hay coincidencia de material)
 * 3. Días restantes: 1000 / (días + 1)
 */
export function calculatePriorityScore(workOrder: WorkOrder, isGrouped: boolean = false): number {
    let score = 0;

    // NIVEL 1: Canarias L-M
    const region = workOrder.region?.toUpperCase();
    const createdAt = workOrder.created_at;
    if (region === 'CANARIAS' && createdAt && isMondayToWednesday(createdAt)) {
        score += 10000;
    }

    // NIVEL 2: Agrupación por Material
    if (isGrouped) {
        score += 5000;
    }

    // NIVEL 3: Fecha de Vencimiento
    const daysRemaining = daysToDueDate(workOrder.due_date);
    if (daysRemaining <= 0) {
        score += 2000; // Vencido
    } else if (daysRemaining <= 2) {
        score += 1000; // Crítico
    } else {
        // Puntos adicionales inversamente proporcionales a los días
        score += Math.max(0, (20 - daysRemaining) * 10);
    }

    return score;
}

/**
 * Ordena pedidos por prioridad dinámica y añade metadata
 */
export function sortWorkOrdersByPriority(orders: WorkOrder[]): WorkOrderWithPriority[] {
    // 1. Detección preliminar de grupos (Material + Fecha coincidente)
    const materialDateMap = new Map<string, number>();
    orders.forEach(o => {
        const key = `${o.fabric || 'N/D'}_${o.due_date || 'N/D'}`;
        materialDateMap.set(key, (materialDateMap.get(key) || 0) + 1);
    });

    // 2. Mapeo con scores y flags
    const ordersWithMeta: WorkOrderWithPriority[] = orders.map(order => {
        const key = `${order.fabric || 'N/D'}_${order.due_date || 'N/D'}`;
        const isGrouped = (materialDateMap.get(key) || 0) >= 2;

        const enhanced: WorkOrderWithPriority = {
            ...order,
            _is_canarias_urgent: order.region?.toUpperCase() === 'CANARIAS' &&
                order.created_at ? isMondayToWednesday(order.created_at) : false,
            _is_grouped_material: isGrouped,
            _group_material_name: isGrouped ? order.fabric : undefined
        };

        enhanced._priority_score = calculatePriorityScore(enhanced, isGrouped);
        enhanced._priority_level = getPriorityLevel(enhanced);

        return enhanced;
    });

    // 3. Ordenación descendente
    return ordersWithMeta.sort((a, b) => (b._priority_score || 0) - (a._priority_score || 0));
}

/**
 * Obtiene el badge de urgencia (Sin Emojis)
 */
export function getUrgencyBadge(daysRemaining: number): { label: string; color: string } | null {
    if (daysRemaining < 0) {
        return {
            label: 'VENCIDO',
            color: 'bg-red-900/40 text-red-400 border-red-500/30'
        };
    }
    if (daysRemaining <= 2) {
        return {
            label: 'URGENTE',
            color: 'bg-red-900/20 text-red-300 border-red-500/20'
        };
    }
    if (daysRemaining <= 5) {
        return {
            label: 'PRÓXIMO',
            color: 'bg-amber-900/40 text-amber-400 border-amber-500/30'
        };
    }
    return {
        label: 'A TIEMPO',
        color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30'
    };
}
