import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';

type Permission = 'view' | 'create' | 'edit' | 'delete';
type Resource = 'dashboard' | 'users' | 'vehicles' | 'installations' | 'templates' | 'screens' | 'communications' | 'archive' | 'admin';

interface PermissionGuardEnhancedProps {
  children: React.ReactNode;
  resource: Resource;
  action: Permission;
  fallback?: React.ReactNode;
  currentUser?: Profile | null;
}
const FALLBACK_ROLE = 'operario' as Profile['role'];

const extractBooleanResult = (input: unknown): boolean | undefined => {
  if (typeof input === 'boolean') {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const record = input as Record<string, unknown>;
  const candidateKeys: Array<keyof typeof record> = [
    'granted',
    'allow',
    'allowed',
    'value',
    'can_manage'
  ];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'boolean') {
      return candidate;
    }
  }

  const nestedCandidates = ['result', 'data'] as const;
  for (const nestedKey of nestedCandidates) {
    const nestedValue = record[nestedKey];
    const nestedBoolean =
      typeof nestedValue === 'boolean'
        ? nestedValue
        : extractBooleanResult(nestedValue);
    if (typeof nestedBoolean === 'boolean') {
      return nestedBoolean;
    }
  }

  return undefined;
};

const getPermissionByHierarchy = (role: string, resource: Resource, action: Permission): boolean => {
  if (role === 'admin') return true;

  if (role === 'manager') {
    if (resource === 'users' && action === 'delete') return false;
    if (resource === 'archive' && (action === 'create' || action === 'delete')) return false;
    return true;
  }

  if (role === 'responsable') {
    const allowedResources: Resource[] = ['dashboard', 'users', 'vehicles', 'installations', 'screens', 'communications', 'archive'];
    const allowedActions: Permission[] = ['view', 'create', 'edit'];

    if (!allowedResources.includes(resource)) return false;
    if (resource === 'users' && action !== 'view') return false;
    if (resource === 'vehicles' && action === 'delete') return false;
    if (resource === 'installations' && action === 'delete') return false;
    if (resource === 'archive' && action !== 'view') return false;

    return allowedActions.includes(action);
  }

  if (role === 'operario') {
    const allowedResources: Resource[] = ['dashboard', 'vehicles', 'installations', 'screens', 'communications'];
    const allowedActions: Permission[] = ['view'];

    if (!allowedResources.includes(resource)) return false;

    if (resource === 'communications' && (action === 'create' || action === 'edit')) {
      return true;
    }

    return allowedActions.includes(action);
  }

  return false;
};

const canManageRoleByHierarchy = (managerRole: string, targetRole: string): boolean => {
  const rank: Record<string, number> = { admin: 4, manager: 3, responsable: 2, operario: 1 };
  return (rank[managerRole] ?? 0) > (rank[targetRole] ?? 0);
};

export const PermissionGuardEnhanced = ({
  children,
  resource,
  action,
  fallback = null,
  currentUser
}: PermissionGuardEnhancedProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef(new Map<string, boolean>());
  const prevRoleRef = useRef<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!currentUser) {
        // Si no hay currentUser, obtenerlo del auth
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('auth_user_id', user.id)
              .maybeSingle();
            
            if (profileError) {
              if (profileError.code !== 'PGRST116') {
                console.error('Error loading profile role:', profileError);
              }
              const fallbackPermission = await checkUserPermission(FALLBACK_ROLE, resource, action);
              setHasPermission(fallbackPermission);
            } else if (profile?.role) {
              const permission = await checkUserPermission(profile.role, resource, action);
              setHasPermission(permission);
            } else {
              const fallbackPermission = await checkUserPermission(FALLBACK_ROLE, resource, action);
              setHasPermission(fallbackPermission);
            }
          } else {
            const fallbackPermission = await checkUserPermission(FALLBACK_ROLE, resource, action);
            setHasPermission(fallbackPermission);
          }
        } catch (error) {
          console.error('Error checking permission:', error);
          const fallbackPermission = await checkUserPermission(FALLBACK_ROLE, resource, action);
          setHasPermission(fallbackPermission);
        }
      } else {
        // Usar el currentUser proporcionado
        const permission = await checkUserPermission(currentUser.role, resource, action);
        setHasPermission(permission);
      }
      setLoading(false);
    };

    checkPermission();
  }, [currentUser, resource, action]);

  // Invalidate cache on role change
  useEffect(() => {
    const currentRole = currentUser?.role || null;
    if (prevRoleRef.current !== currentRole) {
      cacheRef.current.clear();
      prevRoleRef.current = currentRole;
    }
  }, [currentUser?.role]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  // Función para verificar permisos según jerarquía
  const checkUserPermission = async (role: string, resource: Resource, action: Permission): Promise<boolean> => {
    const cacheKey = `${role}-${resource}-${action}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase
        .rpc('has_permission', {
          user_role: role,
          resource,
          action
        });

      const fallbackResult = getPermissionByHierarchy(role, resource, action);

      if (error) {
        console.error('Error checking permission:', error);
        cacheRef.current.set(cacheKey, fallbackResult);
        return fallbackResult;
      }

      const normalizedResult = extractBooleanResult(data);
      const result = typeof normalizedResult === 'boolean'
        ? normalizedResult
        : fallbackResult;

      cacheRef.current.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error checking permission:', error);
      const fallbackResult = getPermissionByHierarchy(role, resource, action);
      cacheRef.current.set(cacheKey, fallbackResult);
      return fallbackResult;
    }
  };


  if (loading) {
    return null; // o un spinner si se prefiere
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

// Hook personalizado para verificar permisos
export const usePermission = (resource: Resource, action: Permission) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const cacheRef = useRef(new Map<string, boolean>());
  const prevRoleRef = useRef<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          
          if (profileError) {
            if (profileError.code !== 'PGRST116') {
              console.error('Error getting current user profile:', profileError);
            }
            setCurrentUser(null);
          } else {
            setCurrentUser(profile ?? null);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (loading) return;

    const resolvePermission = async () => {
      const role = currentUser?.role ?? FALLBACK_ROLE;
      const cacheKey = `${role}-${resource}-${action}`;
      if (cacheRef.current.has(cacheKey)) {
        setHasPermission(cacheRef.current.get(cacheKey)!);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('has_permission', {
            user_role: role,
            resource,
            action
          });

        const fallbackResult = getPermissionByHierarchy(role, resource, action);

        if (error) {
          console.error('Error checking permission:', error);
          cacheRef.current.set(cacheKey, fallbackResult);
          setHasPermission(fallbackResult);
        } else {
          const normalizedResult = extractBooleanResult(data);
          const result = typeof normalizedResult === 'boolean'
            ? normalizedResult
            : fallbackResult;
          cacheRef.current.set(cacheKey, result);
          setHasPermission(result);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        const fallbackResult = getPermissionByHierarchy(role, resource, action);
        cacheRef.current.set(cacheKey, fallbackResult);
        setHasPermission(fallbackResult);
      }
    };

    resolvePermission();
  }, [currentUser?.role, resource, action, loading]);

  // Invalidate cache on role change
  useEffect(() => {
    const currentRole = currentUser?.role ?? FALLBACK_ROLE;
    if (prevRoleRef.current !== currentRole) {
      cacheRef.current.clear();
      prevRoleRef.current = currentRole;
    }
  }, [currentUser?.role]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  return { hasPermission, loading, currentUser };
};

// Componente simplificado para checks rápidos
export const Can = ({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: PermissionGuardEnhancedProps) => {
  return (
    <PermissionGuardEnhanced resource={resource} action={action} fallback={fallback}>
      {children}
    </PermissionGuardEnhanced>
  );
};

// Componente para verificar permisos de gestión de roles
export const CanManageRole = ({
  targetRole,
  children,
  fallback = null
}: {
  targetRole: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const [canManage, setCanManage] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const cacheRef = useRef(new Map<string, boolean>());
  const prevRoleRef = useRef<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      let fetchedRole: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();
          
          if (profile) {
            fetchedRole = profile.role;
            setCurrentUser(profile);

            const cacheKey = `${profile.role}-${targetRole}`;
            if (cacheRef.current.has(cacheKey)) {
              setCanManage(cacheRef.current.get(cacheKey)!);
            } else {
              const { data, error } = await supabase
                .rpc('can_manage_role', {
                  p_manager_role: profile.role,
                  p_target_role: targetRole
                });

              const fallbackResult = canManageRoleByHierarchy(profile.role, targetRole);

              if (error) {
                console.error('Error checking role management permission:', error);
                cacheRef.current.set(cacheKey, fallbackResult);
                setCanManage(fallbackResult);
              } else {
                const normalizedResult = extractBooleanResult(data);
                const result = typeof normalizedResult === 'boolean'
                  ? normalizedResult
                  : fallbackResult;
                cacheRef.current.set(cacheKey, result);
                setCanManage(result);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        if (fetchedRole) {
          const cacheKey = `${fetchedRole}-${targetRole}`;
          const fallbackResult = canManageRoleByHierarchy(fetchedRole, targetRole);
          cacheRef.current.set(cacheKey, fallbackResult);
          setCanManage(fallbackResult);
        } else {
          setCanManage(false);
        }
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, [targetRole]);

  // Invalidate cache on role change
  useEffect(() => {
    const currentRole = currentUser?.role || null;
    if (prevRoleRef.current !== currentRole) {
      cacheRef.current.clear();
      prevRoleRef.current = currentRole;
    }
  }, [currentUser?.role]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  if (loading) return null;
  return canManage ? <>{children}</> : <>{fallback}</>;
};