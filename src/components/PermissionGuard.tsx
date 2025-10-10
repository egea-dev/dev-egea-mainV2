import { ReactNode } from 'react';
import { useProfile } from '@/hooks/use-supabase';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type PermissionGuardProps = {
  children: ReactNode;
  requiredRole?: 'admin' | 'responsable' | 'operario';
  requiredPermission?: 'view' | 'edit' | 'delete';
  page?: string;
  fallback?: ReactNode;
};

export const PermissionGuard = ({
  children,
  requiredRole,
  requiredPermission = 'view',
  page,
  fallback = <Navigate to="/admin" replace />
}: PermissionGuardProps) => {
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Verificando permisos...</div>;
  }

  // Si hay error o no hay perfil, redirigir a auth
  if (isError || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // Los admins tienen acceso a todo
  if (profile.role === 'admin') {
    return <>{children}</>;
  }

  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole) {
    // Permitir acceso jerárquico: admin puede acceder a todo, responsable a responsable y operario, etc.
    const roleHierarchy = { admin: 3, responsable: 2, operario: 1 };
    const userLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return fallback;
    }
  }

  // Responsables pueden acceder a instalaciones y usuarios (para enviar mensajes)
  if (profile.role === 'responsable') {
    return <>{children}</>;
  }

  // Operarios solo pueden acceder a sus tareas asignadas (rutas públicas con token)
  if (profile.role === 'operario') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};