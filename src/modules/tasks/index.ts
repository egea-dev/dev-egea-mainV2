/**
 * Sistema de Módulos de Tareas
 * 
 * Este módulo define la estructura base para diferentes tipos de tareas
 * que pueden ser extendidos en el futuro.
 * 
 * NOTA: Esta es una implementación preparatoria. Los módulos específicos
 * se implementarán según las necesidades del negocio.
 */

import type { LucideIcon } from "lucide-react";
import {
    Wrench,
    Package,
    ClipboardCheck,
    AlertTriangle,
    Truck,
    Settings,
    Home
} from "lucide-react";

// Tipos de tareas soportados
export type TaskType =
    | "instalacion"
    | "mantenimiento"
    | "reparacion"
    | "inspeccion"
    | "entrega"
    | "configuracion"
    | "otro";

// Acciones disponibles para tareas
export type TaskAction =
    | "registrar_llegada"
    | "registrar_salida"
    | "completar_checklist"
    | "reportar_incidencia"
    | "ver_detalles"
    | "ver_ubicacion"
    | "tomar_foto"
    | "firma_cliente";

// Definición de un módulo de tarea
export interface TaskModuleDefinition {
    type: TaskType;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
    actions: TaskAction[];
    requiredFields?: string[];
    optionalFields?: string[];
}

// Registro de módulos de tareas
export const TASK_MODULES: Record<TaskType, TaskModuleDefinition> = {
    instalacion: {
        type: "instalacion",
        label: "Instalación",
        description: "Instalación de equipos o sistemas",
        icon: Home,
        color: "blue",
        actions: [
            "registrar_llegada",
            "completar_checklist",
            "tomar_foto",
            "firma_cliente",
            "reportar_incidencia",
            "registrar_salida"
        ],
        requiredFields: ["site", "location", "description"],
        optionalFields: ["equipment", "serial_number"]
    },

    mantenimiento: {
        type: "mantenimiento",
        label: "Mantenimiento",
        description: "Mantenimiento preventivo o correctivo",
        icon: Wrench,
        color: "amber",
        actions: [
            "registrar_llegada",
            "completar_checklist",
            "reportar_incidencia",
            "registrar_salida"
        ],
        requiredFields: ["site", "location"],
        optionalFields: ["equipment", "last_maintenance"]
    },

    reparacion: {
        type: "reparacion",
        label: "Reparación",
        description: "Reparación de equipos o sistemas",
        icon: Settings,
        color: "red",
        actions: [
            "registrar_llegada",
            "completar_checklist",
            "tomar_foto",
            "reportar_incidencia",
            "registrar_salida"
        ],
        requiredFields: ["site", "location", "issue_description"],
        optionalFields: ["equipment", "priority"]
    },

    inspeccion: {
        type: "inspeccion",
        label: "Inspección",
        description: "Inspección de equipos o instalaciones",
        icon: ClipboardCheck,
        color: "emerald",
        actions: [
            "registrar_llegada",
            "completar_checklist",
            "tomar_foto",
            "registrar_salida"
        ],
        requiredFields: ["site", "location"],
        optionalFields: ["inspection_type"]
    },

    entrega: {
        type: "entrega",
        label: "Entrega",
        description: "Entrega de materiales o equipos",
        icon: Truck,
        color: "purple",
        actions: [
            "registrar_llegada",
            "firma_cliente",
            "tomar_foto",
            "registrar_salida"
        ],
        requiredFields: ["site", "location", "delivery_items"],
        optionalFields: ["contact_name", "contact_phone"]
    },

    configuracion: {
        type: "configuracion",
        label: "Configuración",
        description: "Configuración de sistemas o equipos",
        icon: Settings,
        color: "cyan",
        actions: [
            "registrar_llegada",
            "completar_checklist",
            "registrar_salida"
        ],
        requiredFields: ["site", "location", "system_type"],
        optionalFields: ["configuration_details"]
    },

    otro: {
        type: "otro",
        label: "Otro",
        description: "Otro tipo de tarea",
        icon: Package,
        color: "gray",
        actions: [
            "registrar_llegada",
            "reportar_incidencia",
            "registrar_salida"
        ],
        requiredFields: ["site", "location"],
        optionalFields: []
    }
};

// Obtener módulo por tipo
export function getTaskModule(type: TaskType): TaskModuleDefinition {
    return TASK_MODULES[type] ?? TASK_MODULES.otro;
}

// Obtener icono para un tipo de tarea
export function getTaskIcon(type: TaskType): LucideIcon {
    return getTaskModule(type).icon;
}

// Obtener color para un tipo de tarea
export function getTaskColor(type: TaskType): string {
    return getTaskModule(type).color;
}

// Obtener acciones disponibles para un tipo de tarea
export function getTaskActions(type: TaskType): TaskAction[] {
    return getTaskModule(type).actions;
}

// Verificar si una acción está disponible para un tipo de tarea
export function isActionAvailable(type: TaskType, action: TaskAction): boolean {
    return getTaskActions(type).includes(action);
}

// Mapeo de acciones a etiquetas
export const ACTION_LABELS: Record<TaskAction, string> = {
    registrar_llegada: "Registrar llegada",
    registrar_salida: "Registrar salida",
    completar_checklist: "Completar checklist",
    reportar_incidencia: "Reportar incidencia",
    ver_detalles: "Ver detalles",
    ver_ubicacion: "Ver en Maps",
    tomar_foto: "Tomar foto",
    firma_cliente: "Firma del cliente"
};

// Obtener etiqueta de una acción
export function getActionLabel(action: TaskAction): string {
    return ACTION_LABELS[action] ?? action;
}
