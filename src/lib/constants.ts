// src/lib/constants.ts
// Sistema centralizado de semáforos y constantes visuales

// =====================================================================
// SISTEMA SEMÁFORO PARA TAREAS - INSTALACIONES
// =====================================================================
// Estados específicos para tareas de instalaciones
export const INSTALLATION_STATES = {
  URGENTE: 'urgente',
  EN_FABRICACION: 'en fabricacion',
  A_LA_ESPERA: 'a la espera',
  TERMINADO: 'terminado',
} as const;

export type InstallationState = typeof INSTALLATION_STATES[keyof typeof INSTALLATION_STATES];

export const INSTALLATION_STATE_COLORS: Record<InstallationState, string> = {
  [INSTALLATION_STATES.URGENTE]: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  [INSTALLATION_STATES.EN_FABRICACION]: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  [INSTALLATION_STATES.A_LA_ESPERA]: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  [INSTALLATION_STATES.TERMINADO]: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

export const INSTALLATION_STATE_LABELS: Record<InstallationState, string> = {
  [INSTALLATION_STATES.URGENTE]: 'Urgente',
  [INSTALLATION_STATES.EN_FABRICACION]: 'En Fabricación',
  [INSTALLATION_STATES.A_LA_ESPERA]: 'A la Espera',
  [INSTALLATION_STATES.TERMINADO]: 'Terminado',
};

// =====================================================================
// SISTEMA SEMÁFORO PARA TAREAS - TAPICERÍA
// =====================================================================
export const UPHOLSTERY_STATES = {
  EN_FABRICACION: 'en fabricacion',
  A_LA_ESPERA: 'a la espera',
} as const;

export type UpholsteryState = typeof UPHOLSTERY_STATES[keyof typeof UPHOLSTERY_STATES];

export const UPHOLSTERY_STATE_COLORS: Record<UpholsteryState, string> = {
  [UPHOLSTERY_STATES.EN_FABRICACION]: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  [UPHOLSTERY_STATES.A_LA_ESPERA]: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
};

export const UPHOLSTERY_STATE_LABELS: Record<UpholsteryState, string> = {
  [UPHOLSTERY_STATES.EN_FABRICACION]: 'En Fabricación',
  [UPHOLSTERY_STATES.A_LA_ESPERA]: 'A la Espera',
};

// =====================================================================
// SISTEMA SEMÁFORO UNIFICADO (TODOS LOS ESTADOS)
// =====================================================================
export const TASK_STATES = {
  URGENTE: 'urgente',
  PENDIENTE: 'pendiente',
  A_LA_ESPERA: 'a la espera',
  EN_FABRICACION: 'en fabricacion',
  TERMINADO: 'terminado',
  INCIDENTE: 'incidente',
  ARREGLO: 'arreglo',
  PENDIENTE_VALIDAR: 'pendiente de validar',
} as const;

export type TaskState = typeof TASK_STATES[keyof typeof TASK_STATES];

export const TASK_STATE_COLORS: Record<TaskState, string> = {
  [TASK_STATES.URGENTE]: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  [TASK_STATES.PENDIENTE]: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40',
  [TASK_STATES.A_LA_ESPERA]: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
  [TASK_STATES.EN_FABRICACION]: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40',
  [TASK_STATES.TERMINADO]: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  [TASK_STATES.INCIDENTE]: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40',
  [TASK_STATES.ARREGLO]: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40',
  [TASK_STATES.PENDIENTE_VALIDAR]: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
};

export const TASK_STATE_LABELS: Record<TaskState, string> = {
  [TASK_STATES.URGENTE]: 'Urgente',
  [TASK_STATES.PENDIENTE]: 'Pendiente',
  [TASK_STATES.A_LA_ESPERA]: 'A la Espera',
  [TASK_STATES.EN_FABRICACION]: 'En Fabricación',
  [TASK_STATES.TERMINADO]: 'Terminado',
  [TASK_STATES.INCIDENTE]: 'Incidente',
  [TASK_STATES.ARREGLO]: 'Arreglo',
  [TASK_STATES.PENDIENTE_VALIDAR]: 'Pendiente de Validar',
};

// =====================================================================
// SISTEMA SEMÁFORO PARA ESTADO DE USUARIOS
// =====================================================================
export const USER_STATUS = {
  ACTIVO: 'activo',
  BAJA: 'baja',
  VACACIONES: 'vacaciones',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVO]: 'bg-green-500 text-white border-green-600',
  [USER_STATUS.VACACIONES]: 'bg-orange-500 text-white border-orange-600',
  [USER_STATUS.BAJA]: 'bg-red-500 text-white border-red-600',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVO]: 'Activo',
  [USER_STATUS.VACACIONES]: 'De Vacaciones',
  [USER_STATUS.BAJA]: 'De Baja',
};

// Indicadores de punto (para badges pequeños)
export const USER_STATUS_DOT_COLORS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVO]: 'bg-green-500',
  [USER_STATUS.VACACIONES]: 'bg-orange-500',
  [USER_STATUS.BAJA]: 'bg-red-500',
};

// =====================================================================
// COLORES PARA VEHÍCULOS
// =====================================================================
export const VEHICLE_TYPES = {
  JUMPER: 'jumper',
  CAMION: 'camion',
  FURGONETA: 'furgoneta',
  OTRO: 'otro',
} as const;

export type VehicleType = typeof VEHICLE_TYPES[keyof typeof VEHICLE_TYPES] | string;

export const VEHICLE_TYPE_COLORS: Record<string, string> = {
  [VEHICLE_TYPES.JUMPER]: 'bg-muted/60 text-foreground border-border/60 hover:bg-muted/60',
  [VEHICLE_TYPES.CAMION]: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  [VEHICLE_TYPES.FURGONETA]: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  [VEHICLE_TYPES.OTRO]: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  'default': 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  [VEHICLE_TYPES.JUMPER]: 'Jumper',
  [VEHICLE_TYPES.CAMION]: 'Camión',
  [VEHICLE_TYPES.FURGONETA]: 'Furgoneta',
  [VEHICLE_TYPES.OTRO]: 'Otro',
};
// =====================================================================
// ROLES DE USUARIO
// =====================================================================
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  RESPONSABLE: 'responsable',
  OPERARIO: 'operario',
  PRODUCCION: 'produccion',
  ENVIOS: 'envios',
  ALMACEN: 'almacen',
  COMERCIAL: 'comercial',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.RESPONSABLE]: 'Responsable',
  [USER_ROLES.OPERARIO]: 'Operario',
  [USER_ROLES.PRODUCCION]: 'Producción',
  [USER_ROLES.ENVIOS]: 'Envíos',
  [USER_ROLES.ALMACEN]: 'Almacén',
  [USER_ROLES.COMERCIAL]: 'Comercial',
};

// =====================================================================
// GRUPOS DE PANTALLAS
// =====================================================================
export const SCREEN_GROUPS = {
  INSTALACIONES: 'Instalaciones',
  CONFECCION: 'Confección',
  TAPICERIA: 'Tapicería',
} as const;

export type ScreenGroup = typeof SCREEN_GROUPS[keyof typeof SCREEN_GROUPS];

// =====================================================================
// UTILIDADES PARA OBTENER COLORES
// =====================================================================

/**
 * Obtiene el color de un estado de tarea, con fallback a gris
 */
export function getTaskStateColor(state: string | null | undefined): string {
  if (!state) return 'bg-gray-200 text-gray-800 border-gray-300';
  return TASK_STATE_COLORS[state as TaskState] || 'bg-gray-200 text-gray-800 border-gray-300';
}

/**
 * Obtiene el color de un estado de usuario, con fallback a gris
 */
export function getUserStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-gray-500 text-white border-gray-600';
  return USER_STATUS_COLORS[status as UserStatus] || 'bg-gray-500 text-white border-gray-600';
}

/**
 * Obtiene el color de un tipo de vehículo, con fallback a default
 */
export function getVehicleTypeColor(type: string | null | undefined): string {
  if (!type) return VEHICLE_TYPE_COLORS['default'];
  return VEHICLE_TYPE_COLORS[type.toLowerCase()] || VEHICLE_TYPE_COLORS['default'];
}

/**
 * Obtiene el label de un estado de tarea
 */
export function getTaskStateLabel(state: string | null | undefined): string {
  if (!state) return 'Sin estado';
  return TASK_STATE_LABELS[state as TaskState] || state;
}

/**
 * Obtiene el label de un estado de usuario
 */
export function getUserStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Sin estado';
  return USER_STATUS_LABELS[status as UserStatus] || status;
}

/**
 * Obtiene el label de un rol de usuario
 */
export function getUserRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Sin rol';
  return USER_ROLE_LABELS[role as UserRole] || role;
}
