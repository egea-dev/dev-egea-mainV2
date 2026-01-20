/**
 * Servicio de Priorización Dinámica para Kioscos de Producción
 * 
 * Implementa un sistema de scoring que prioriza pedidos según:
 * 1. Ventana de envío a Canarias (Lunes-Miércoles)
 * 2. Urgencia por fecha de caducidad
 * 3. Agrupación por material
 */

import { WorkOrder } from '@/types/production';

export interface WorkOrderWithPriority extends WorkOrder {
    _priority_score?: number;
    _is_grouped_material?: boolean;
    _group_material_name?: string;
    _is_canarias_urgent?: boolean;
}

/**
 * Obtiene el día de la semana de una fecha (0=Domingo, 1=Lunes, ..., 6=Sábado)
 */
function getDayOfWeek(date: Date): number {
    return date.getDay();
}

/**
 * Verifica si una fecha cae en Lunes, Martes o Miércoles
 */
export function isMondayToWednesday(dateString: string): boolean {
    try {
        const date = new Date(dateString);
        const dayOfWeek = getDayOfWeek(date);
        // 1=Lunes, 2=Martes, 3=Miércoles
        return dayOfWeek >= 1 && dayOfWeek <= 3;
    } catch {
        return false;
    }
}

/**
 * Calcula los días restantes hasta la fecha de caducidad
 * Retorna valores negativos si ya caducó
 */
export function daysToDueDate(dueDateString: string | null | undefined): number {
    if (!dueDateString) return 999; // Sin fecha = prioridad muy baja

    try {
        const now = new Date();
        const dueDate = new Date(dueDateString);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch {
        return 999;
    }
}

/**
 * Calcula el score de prioridad para un pedido
 * Mayor score = Mayor prioridad (aparece primero)
 */
export function calculatePriorityScore(workOrder: WorkOrder): number {
    let score = 0;

    // FACTOR 1: Prioridad Canarias (L-M) - Máxima prioridad
    const region = workOrder.region?.toUpperCase();
    const createdAt = workOrder.created_at;

    if (region === 'CANARIAS' && createdAt && isMondayToWednesday(createdAt)) {
        score += 1000; // Máxima prioridad por ventana de envío
    }

    // FACTOR 2: Urgencia por fecha de caducidad
    const daysRemaining = daysToDueDate(workOrder.due_date);

    if (daysRemaining <= 0) {
        // Ya caducado o caducando HOY - urgencia extrema
        score += 500;
    } else if (daysRemaining <= 3) {
        // Menos de 3 días - muy urgente
        score += 300;
    } else if (daysRemaining <= 7) {
        // Menos de una semana - urgente
        score += 150;
    } else {
        // Inversamente proporcional a días restantes
        score += (1 / daysRemaining) * 100;
    }

    return score;
}

/**
 * Detecta agrupaciones de pedidos por material
 */
function detectMaterialGroups(orders: WorkOrderWithPriority[]): Map<string, WorkOrderWithPriority[]> {
    const groups = new Map<string, WorkOrderWithPriority[]>();

    orders.forEach(order => {
        const material = order.fabric || 'N/D';
        if (!groups.has(material)) {
            groups.set(material, []);
        }
        groups.get(material)!.push(order);
    });

    return groups;
}

/**
 * Ordena pedidos por prioridad dinámica y añade metadata de agrupación
 */
export function sortWorkOrdersByPriority(orders: WorkOrder[]): WorkOrderWithPriority[] {
    // 1. Calcular score para cada pedido
    const ordersWithScore: WorkOrderWithPriority[] = orders.map(order => ({
        ...order,
        _priority_score: calculatePriorityScore(order),
        _is_canarias_urgent:
            order.region?.toUpperCase() === 'CANARIAS' &&
                order.created_at ?
                isMondayToWednesday(order.created_at) :
                false
    }));

    // 2. Ordenar por score descendente (mayor primero)
    ordersWithScore.sort((a, b) => {
        const scoreA = a._priority_score || 0;
        const scoreB = b._priority_score || 0;
        return scoreB - scoreA; // Descendente
    });

    // 3. Detectar agrupaciones por material
    const materialGroups = detectMaterialGroups(ordersWithScore);

    // 4. Marcar pedidos que pertenecen a grupos (2 o más del mismo material)
    ordersWithScore.forEach(order => {
        const material = order.fabric || 'N/D';
        const group = materialGroups.get(material);

        if (group && group.length >= 2) {
            order._is_grouped_material = true;
            order._group_material_name = material;
        } else {
            order._is_grouped_material = false;
        }
    });

    return ordersWithScore;
}

/**
 * Obtiene el badge de urgencia para un pedido
 */
export function getUrgencyBadge(daysRemaining: number): { label: string; color: string } | null {
    if (daysRemaining < 0) {
        return {
            label: 'VENCIDO',
            color: 'bg-red-900/40 text-red-400 border-red-500/30'
        };
    }
    if (daysRemaining <= 3) {
        return {
            label: 'URGENTE',
            color: 'bg-amber-900/40 text-amber-400 border-amber-500/30'
        };
    }
    if (daysRemaining <= 7) {
        return {
            label: 'PRÓXIMO',
            color: 'bg-orange-900/40 text-orange-400 border-orange-500/30'
        };
    }
    return {
        label: 'A TIEMPO',
        color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30'
    };
}
