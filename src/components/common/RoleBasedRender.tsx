import { ReactNode } from 'react';
import { useProfile } from '@/hooks/use-supabase';

interface RoleBasedRenderProps {
    children: ReactNode;
    hideForRoles?: string[];
    showOnlyForRoles?: string[];
}

/**
 * Componente que renderiza contenido basado en el rol del usuario
 * 
 * @example
 * // Ocultar para Admin y Manager
 * <RoleBasedRender hideForRoles={['admin', 'manager']}>
 *   <QRScanner />
 * </RoleBasedRender>
 * 
 * @example
 * // Mostrar solo para Admin
 * <RoleBasedRender showOnlyForRoles={['admin']}>
 *   <AdminPanel />
 * </RoleBasedRender>
 */
export function RoleBasedRender({
    children,
    hideForRoles = [],
    showOnlyForRoles = []
}: RoleBasedRenderProps) {
    const { data: profile, isLoading } = useProfile();

    // Mientras carga, no mostrar nada para evitar flashes
    if (isLoading) {
        return null;
    }

    const userRole = profile?.role?.toLowerCase() || '';

    // Si se especifica showOnlyForRoles, solo mostrar para esos roles
    if (showOnlyForRoles.length > 0) {
        const shouldShow = showOnlyForRoles.some(role => role.toLowerCase() === userRole);
        return shouldShow ? <>{children}</> : null;
    }

    // Si se especifica hideForRoles, ocultar para esos roles
    if (hideForRoles.length > 0) {
        const shouldHide = hideForRoles.some(role => role.toLowerCase() === userRole);
        return shouldHide ? null : <>{children}</>;
    }

    // Por defecto, mostrar el contenido
    return <>{children}</>;
}

/**
 * Hook personalizado para verificar el rol del usuario
 * 
 * @example
 * const { isAdmin, isManager, isAdminOrManager } = useUserRole();
 */
export function useUserRole() {
    const { data: profile } = useProfile();
    const userRole = profile?.role?.toLowerCase() || '';

    return {
        role: userRole,
        isAdmin: userRole === 'admin',
        isManager: userRole === 'manager',
        isAdminOrManager: userRole === 'admin' || userRole === 'manager',
        isOperario: userRole === 'operario',
        isProduccion: userRole === 'produccion',
        isEnvios: userRole === 'envios',
        isAlmacen: userRole === 'almacen',
        isComercial: userRole === 'comercial',
        isResponsable: userRole === 'responsable',
    };
}
