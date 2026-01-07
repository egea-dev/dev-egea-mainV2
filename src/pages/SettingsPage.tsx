import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useProfile, useUpdateProfile, useUsers } from "@/hooks/use-supabase";
import { useSystemConfig, useUpdateSystemConfig, useCreateSystemConfig, useDeleteSystemConfig } from "@/hooks/use-system-config";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Building2, Mail, Phone, Palette, Settings, Trash2, Plus, Upload, Users, UserPlus, UserX, Shield, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/badges";
import { Profile } from "@/types";
import { UserDialog } from "@/components/users/UserDialog";
import { useQueryClient } from "@tanstack/react-query";
import type { JsonValue } from "@/integrations/supabase/types";
import { useAllUserPermissions, useUpsertUserPermission } from "@/hooks/use-user-permissions";
import PermissionsMatrix from "../components/settings/PermissionsMatrix";
import SlaConfig from "../components/settings/SlaConfig";
import CompanySettings from "../components/settings/CompanySettings";
import AppearanceSettings from "../components/settings/AppearanceSettings";
import SystemSettings from "../components/settings/SystemSettings";
import { ShieldCheck, Zap } from "lucide-react";

type ConfigValues = Record<string, JsonValue | undefined>;

const getStringConfigValue = (values: ConfigValues, key: string, fallback = ''): string => {
  const value = values[key];
  return typeof value === 'string' ? value : fallback;
};

const getBooleanConfigValue = (values: ConfigValues, key: string, fallback = false): boolean => {
  const value = values[key];
  return typeof value === 'boolean' ? value : fallback;
};

const getNumberConfigValue = (values: ConfigValues, key: string, fallback: number): number => {
  const value = values[key];
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
};

export default function SettingsPage() {
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: configs, isLoading: loadingConfigs } = useSystemConfig();
  const { data: users = [] } = useUsers();
  const updateProfileMutation = useUpdateProfile();
  const updateConfigMutation = useUpdateSystemConfig();
  const createConfigMutation = useCreateSystemConfig();
  const deleteConfigMutation = useDeleteSystemConfig();
  const queryClient = useQueryClient();

  // Hooks para permisos individuales por usuario
  const { data: allUserPermissions = [] } = useAllUserPermissions();
  const upsertUserPermission = useUpsertUserPermission();

  const [fullName, setFullName] = useState('');
  const [configValues, setConfigValues] = useState<ConfigValues>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigValue, setNewConfigValue] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  const [newConfigCategory, setNewConfigCategory] = useState('general');

  // Estados para gestión de usuarios
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Estados para avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Datos básicos del perfil
  const [phone, setPhone] = useState('');

  const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

  // Estados para permisos
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, { can_view: boolean; can_edit: boolean }>>>({});
  // Definición unificada de módulos del sistema
  const SYSTEM_MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'installations', label: 'Instalaciones', icon: Shield },
    { id: 'comercial', label: 'Comercial', icon: Shield },
    { id: 'production', label: 'Producción', icon: Shield },
    { id: 'warehouse', label: 'Almacén', icon: Shield },
    { id: 'envios', label: 'Envíos', icon: Shield },
    { id: 'users', label: 'Usuarios', icon: Shield },
    { id: 'vehicles', label: 'Vehículos', icon: Shield },
    { id: 'screens', label: 'Pantallas', icon: Shield },
    { id: 'templates', label: 'Plantillas', icon: Shield },
    { id: 'data', label: 'Gestión de Datos', icon: Shield },
    { id: 'archive', label: 'Historial', icon: Shield },
    { id: 'settings', label: 'Configuración', icon: Shield },
    { id: 'calendario-global', label: 'Calendario Global', icon: Shield },
    { id: 'kiosk', label: 'Kiosko', icon: Shield },
    { id: 'matrix', label: 'Matriz de Permisos', icon: Shield },
    { id: 'sla-config', label: 'Configuración SLA', icon: Shield },
    { id: 'communications', label: 'Comunicaciones', icon: Shield },
    { id: 'system-log', label: 'Logs del Sistema', icon: Shield },
  ];

  const handleUsersRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };
  const handleUserDialogOpenChange = (open: boolean) => {
    setIsUserDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const stringConfig = (key: string, fallback = '') => getStringConfigValue(configValues, key, fallback);
  const booleanConfig = (key: string, fallback = false) => getBooleanConfigValue(configValues, key, fallback);
  const numberConfig = (key: string, fallback: number) => getNumberConfigValue(configValues, key, fallback);

  useEffect(() => {
    if (configs) {
      const values: ConfigValues = {};
      configs.forEach((config) => {
        values[config.key] = config.value ?? null;
      });
      setConfigValues(values);
    }
  }, [configs]);

  // Cargar permisos existentes de la base de datos
  const loadRolePermissions = async () => {
    try {
      const { data: permissions, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;

      const typedPermissions = permissions as any[];
      const permissionsByRole: Record<string, Record<string, { can_view: boolean; can_edit: boolean }>> = {};

      // Inicializar estructura base para los roles
      ['manager', 'responsable', 'operario', 'production', 'shipping', 'warehouse', 'comercial'].forEach(role => {
        permissionsByRole[role] = {};
        SYSTEM_MODULES.forEach(module => {
          permissionsByRole[role][module.id] = { can_view: false, can_edit: false };
        });
      });

      // Cargar permisos desde la base de datos
      typedPermissions?.forEach((permission: any) => {
        const role = permission.role;
        const resource = permission.resource;

        if (permissionsByRole[role] && permissionsByRole[role][resource]) {
          if (permission.action === 'view') {
            permissionsByRole[role][resource].can_view = permission.granted;
          } else if (permission.action === 'edit' || permission.action === 'update') {
            permissionsByRole[role][resource].can_edit = permission.granted;
          }
        }
      });

      setRolePermissions(permissionsByRole);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    }
  };

  useEffect(() => {
    loadRolePermissions();
  }, []);

  const saveRolePermissions = async () => {
    try {
      const rolesToReset = Object.keys(rolePermissions);
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .in('role', rolesToReset.length ? rolesToReset : ['manager', 'responsable', 'operario', 'production', 'shipping', 'warehouse', 'comercial']);

      if (error) throw error;

      const permissionsToInsert: any[] = [];
      Object.entries(rolePermissions).forEach(([role, modules]) => {
        Object.entries(modules as Record<string, any>).forEach(([resource, permissions]) => {
          if (permissions.can_view) {
            permissionsToInsert.push({ role, resource, action: 'view', granted: true });
          }
          if (permissions.can_edit) {
            permissionsToInsert.push({ role, resource, action: 'edit', granted: true });
          }
        });
      });

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await (supabase
          .from('role_permissions') as any)
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Permisos de rol actualizados correctamente');
    } catch (error) {
      console.error('Error al guardar permisos de rol:', error);
      toast.error('Error al guardar permisos');
    }
  };

  const handleUpdateProfile = () => {
    if (profile) {
      updateProfileMutation.mutate({
        ...profile,
        full_name: fullName,
        phone,
      });
    }
  };

  const handleUpdateConfig = (key: string, value: JsonValue | undefined) => {
    const persistedValue = value ?? null;
    updateConfigMutation.mutate({ key, value: persistedValue });
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const handleAvatarInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    const file = fileInput.files?.[0] ?? null;
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    fileInput.value = '';
  };

  const triggerAvatarPicker = () => {
    fileInputRef.current?.click();
  };

  const extractStoragePath = (url: string): string | null => {
    const segments = url.split('/storage/v1/object/public/avatars/')[1];
    const fallback = url.split('/avatars/')[1];
    const rawPath = (segments || fallback)?.split('?')[0];
    return rawPath ?? null;
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !profile) return;

    try {
      if (avatarFile.size > MAX_AVATAR_SIZE) {
        toast.error('El archivo es demasiado grande. Máximo 2MB');
        return;
      }

      if (!AVATAR_ALLOWED_TYPES.includes(avatarFile.type)) {
        toast.error('Formato no válido. Usa JPG, PNG o WEBP');
        return;
      }

      const fileExt = avatarFile.name.split('.').pop() || 'png';
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se encontró la sesión. Inicia sesión nuevamente.');
        return;
      }

      if (profile.avatar_url) {
        const oldPath = extractStoragePath(profile.avatar_url);
        if (oldPath) {
          try {
            await supabase.storage.from('avatars').remove([oldPath]);
          } catch (error) {
            console.error('No se pudo eliminar el avatar anterior:', error);
          }
        }
      }

      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, avatarFile, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message ?? 'Error al subir avatar');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);

      await updateProfileMutation.mutateAsync({
        ...profile,
        avatar_url: publicUrl,
      });

      setAvatarPreview(publicUrl);
      setAvatarFile(null);
      toast.success('Avatar actualizado correctamente');
    } catch (error) {
      console.error('Error al subir avatar:', error);
      const message = error instanceof Error ? error.message : 'Error al subir avatar. Verifica el bucket "avatars".';
      toast.error(message);
    }
  };

  if (loadingProfile) {
    return <div className="p-6 text-center text-muted-foreground">Cargando perfil...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Mi perfil</CardTitle>
            <CardDescription>Actualiza tu información básica y tu foto de perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleAvatarInputChange}
            />
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      src={avatarPreview || profile?.avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin foto</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={triggerAvatarPicker}>
                    Elegir imagen
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!avatarFile || updateProfileMutation.isPending}
                    onClick={handleUploadAvatar}
                  >
                    {updateProfileMutation.isPending ? 'Subiendo...' : 'Subir Avatar'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo 2MB.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending}
              className="self-start"
            >
              {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            <div className="space-y-1">
              <Label>Correo</Label>
              <p className="text-sm text-muted-foreground">{profile?.email ?? 'Sin correo registrado'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateConfig = () => {
    try {
      const parsedValue = JSON.parse(newConfigValue) as JsonValue;
      createConfigMutation.mutate({
        key: newConfigKey,
        value: parsedValue,
        description: newConfigDescription,
        category: newConfigCategory,
      });
      setIsAddDialogOpen(false);
      setNewConfigKey('');
      setNewConfigValue('');
      setNewConfigDescription('');
      setNewConfigCategory('general');
    } catch (error) {
      toast.error('El valor debe ser un JSON válido');
    }
  };

  if (loadingProfile || loadingConfigs) {
    return <div className="flex items-center justify-center h-96">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Configuración
          </h1>
          <p className="text-slate-400 mt-1">Gestiona la configuración del sistema y tu perfil.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-9 h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Perfil</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Usuarios</TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground line-clamp-1 text-center">Permisos (Rol)</TabsTrigger>
          <TabsTrigger value="user-permissions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground line-clamp-1 text-center">Permisos (Usuario)</TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground line-clamp-1 text-center">Matriz</TabsTrigger>
          <TabsTrigger value="sla" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground line-clamp-1 text-center">SLA</TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Empresa</TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Apariencia</TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sistema</TabsTrigger>
        </TabsList>

        {/* TAB: Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información del Perfil</CardTitle>
              <CardDescription>Actualiza la información de tu cuenta personal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={handleAvatarInputChange}
              />
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {avatarPreview || profile?.avatar_url ? (
                      <img
                        src={avatarPreview || profile?.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" onClick={triggerAvatarPicker}>
                      Elegir imagen
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUploadAvatar}
                      disabled={!avatarFile || updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Subiendo...' : 'Subir Avatar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">El email no se puede modificar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input
                  id="role"
                  value={profile?.role || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Separator />
              <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Usuarios */}
        <TabsContent value="users">
          <div className="space-y-6">
            {/* Invitar Usuarios */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Invitar Nuevos Usuarios
                    </CardTitle>
                    <CardDescription>Envía invitaciones por email para que se unan al sistema</CardDescription>
                  </div>
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invitar Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invitar Usuario</DialogTitle>
                        <DialogDescription>Envía una invitación por email</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="inviteEmail">Email del Usuario</Label>
                          <Input
                            id="inviteEmail"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="usuario@ejemplo.com"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!inviteEmail) {
                              toast.error('El email es obligatorio');
                              return;
                            }

                            try {
                              const { data, error } = await (supabase.rpc as any)('invite_user_by_email', {
                                p_email: inviteEmail,
                                p_full_name: inviteEmail.split('@')[0],
                                p_role: 'operario'
                              });

                              if (error) throw error;

                              if (data?.success) {
                                toast.success('Perfil creado. Ahora debes invitar al usuario desde Supabase Dashboard > Auth > Users > Invite User');
                                setInviteEmail('');
                                setIsInviteDialogOpen(false);
                                handleUsersRefresh();
                              } else {
                                toast.error(data?.message || 'Error al crear perfil');
                              }
                            } catch (error: any) {
                              console.error('Error inviting user:', error);
                              toast.error(error.message || 'Error al invitar usuario');
                            }
                          }}
                        >
                          Enviar Invitación
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            {/* Gestión de Usuarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestión de Usuarios
                </CardTitle>
                <CardDescription>Activa o desactiva cuentas de usuario</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: Profile) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  <User className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <span>{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={user.status} size="sm" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsUserDialogOpen(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant={user.status === 'baja' ? "default" : "destructive"}
                                onClick={async () => {
                                  try {
                                    const newStatus = user.status === 'baja' ? 'activo' : 'baja';
                                    const { error } = await (supabase
                                      .from('profiles') as any)
                                      .update({ status: newStatus })
                                      .eq('id', user.id);
                                    if (error) throw error;

                                    toast.success(`Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'}`);
                                    handleUsersRefresh();
                                  } catch (error) {
                                    toast.error('Error al actualizar estado del usuario');
                                  }
                                }}
                              >
                                {user.status === 'baja' ? <UserPlus className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Permisos por Rol */}
        <TabsContent value="permissions">
          <Card className="bg-slate-950/20 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Control de Acceso por Rol (Templates)
                </CardTitle>
                <CardDescription>Configura los permisos base para cada nivel de acceso</CardDescription>
              </div>
              <Button onClick={saveRolePermissions} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Guardar Todos los Roles
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[700px] pr-4">
                <div className="space-y-10">
                  {['manager', 'responsable', 'operario', 'production', 'shipping', 'warehouse', 'comercial'].map((role) => (
                    <div key={role} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/70 px-6 py-2 rounded-full border border-primary/10 bg-primary/5 backdrop-blur-sm">
                          PLANTILLA: {role}
                        </h3>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SYSTEM_MODULES.map((module) => (
                          <div key={module.id} className="group relative flex flex-col gap-4 p-4 border border-white/5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="text-xs font-bold">{module.label.substring(0, 2).toUpperCase()}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-200">{module.label}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                              <div className="flex items-center gap-3 flex-1 justify-center bg-black/20 py-2 rounded-lg border border-white/5">
                                <Label htmlFor={`${role}-${module.id}-view`} className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Ver</Label>
                                <Switch
                                  id={`${role}-${module.id}-view`}
                                  checked={rolePermissions[role]?.[module.id]?.can_view ?? false}
                                  onCheckedChange={(checked) => {
                                    setRolePermissions(prev => ({
                                      ...prev,
                                      [role]: { ...prev[role], [module.id]: { ...prev[role]?.[module.id], can_view: checked } }
                                    }));
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-3 flex-1 justify-center bg-black/20 py-2 rounded-lg border border-white/5">
                                <Label htmlFor={`${role}-${module.id}-edit`} className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Editar</Label>
                                <Switch
                                  id={`${role}-${module.id}-edit`}
                                  checked={rolePermissions[role]?.[module.id]?.can_edit ?? false}
                                  onCheckedChange={(checked) => {
                                    setRolePermissions(prev => ({
                                      ...prev,
                                      [role]: { ...prev[role], [module.id]: { ...prev[role]?.[module.id], can_edit: checked } }
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Permisos por Usuario */}
        <TabsContent value="user-permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Permisos Individuales por Usuario
              </CardTitle>
              <CardDescription>
                Configura permisos específicos para cada usuario. Los permisos individuales sobrescriben los permisos por rol.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[700px] pr-4">
                <div className="space-y-6">
                  {users.map((user: Profile) => (
                    <Card key={user.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold">{user.full_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{user.email}</span>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                  {user.role}
                                </Badge>
                                <StatusBadge status={user.status} size="sm" />
                              </div>
                            </div>
                          </div>
                          {user.role === 'admin' && (
                            <Badge variant="outline" className="text-xs">
                              Acceso Total
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {SYSTEM_MODULES.map((module) => {
                            const userPerms = allUserPermissions.filter(
                              p => p.user_id === user.id && p.resource === module.id
                            );
                            const hasView = userPerms.some(p => p.action === 'view' && p.granted === true);
                            const hasEdit = userPerms.some(p => p.action === 'edit' && p.granted === true);

                            // Si no hay permisos explícitos, se asume que usa los del rol (podríamos marcarlo visualmente)
                            const isViewOverride = userPerms.some(p => p.action === 'view');
                            const isEditOverride = userPerms.some(p => p.action === 'edit');

                            return (
                              <div
                                key={module.id}
                                className={`flex flex-col gap-4 p-4 rounded-2xl border transition-all duration-300 ${user.role === 'admin' ? 'opacity-50' : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasView ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-500'}`}>
                                    <span className="text-xs font-bold">{module.label.substring(0, 2).toUpperCase()}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-slate-200">{module.label}</span>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                                  <div className="flex items-center gap-3 flex-1 justify-center bg-black/20 py-2 rounded-lg border border-white/5 relative">
                                    <Label htmlFor={`user-${user.id}-${module.id}-view`} className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Ver</Label>
                                    <Switch
                                      id={`user-${user.id}-${module.id}-view`}
                                      checked={hasView}
                                      onCheckedChange={async (checked) => {
                                        if (user.role === 'admin') return;
                                        try {
                                          await upsertUserPermission.mutateAsync({
                                            userId: user.id,
                                            resource: module.id,
                                            action: 'view',
                                            granted: checked,
                                          });
                                          toast.success(`Acceso de lectura ${checked ? 'activado' : 'desactivado'} para ${user.full_name}`);
                                        } catch (error) { console.error(error); }
                                      }}
                                      disabled={user.role === 'admin' || upsertUserPermission.isPending}
                                    />
                                    {isViewOverride && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" title="Override activo" />}
                                  </div>
                                  <div className="flex items-center gap-3 flex-1 justify-center bg-black/20 py-2 rounded-lg border border-white/5 relative">
                                    <Label htmlFor={`user-${user.id}-${module.id}-edit`} className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Edit</Label>
                                    <Switch
                                      id={`user-${user.id}-${module.id}-edit`}
                                      checked={hasEdit}
                                      onCheckedChange={async (checked) => {
                                        if (user.role === 'admin') return;
                                        try {
                                          await upsertUserPermission.mutateAsync({
                                            userId: user.id,
                                            resource: module.id,
                                            action: 'edit',
                                            granted: checked,
                                          });
                                          toast.success(`Acceso de edición ${checked ? 'activado' : 'desactivado'} para ${user.full_name}`);
                                        } catch (error) { console.error(error); }
                                      }}
                                      disabled={user.role === 'admin' || upsertUserPermission.isPending}
                                    />
                                    {isEditOverride && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" title="Override activo" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-6 p-4 bg-muted rounded-lg border">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Información sobre Permisos Individuales</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>Los permisos individuales sobrescriben los permisos por rol</li>
                      <li>Los usuarios con rol admin siempre tienen acceso completo</li>
                      <li>Si un módulo está activado aquí, el usuario tendrá acceso independientemente de su rol</li>
                      <li>Si está desactivado, el usuario NO tendrá acceso aunque su rol lo permita</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Matriz de Permisos */}
        <TabsContent value="matrix">
          <Card className="bg-slate-950/20 border-white/5">
            <CardContent className="p-6">
              <PermissionsMatrix />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Configuración SLA */}
        <TabsContent value="sla">
          <Card className="bg-slate-950/20 border-white/5">
            <CardContent className="p-6">
              <SlaConfig />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Empresa */}
        <TabsContent value="company">
          <CompanySettings />
        </TabsContent>

        {/* TAB: Apariencia */}
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        {/* TAB: Sistema */}
        <TabsContent value="system">
          <SystemSettings />
        </TabsContent>

        {/* TAB: Avanzado */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuración Avanzada</CardTitle>
                  <CardDescription>Gestión completa de todas las configuraciones del sistema</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Configuración
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nueva Configuración</DialogTitle>
                      <DialogDescription>Agrega una nueva clave de configuración al sistema</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new_key">Clave</Label>
                        <Input
                          id="new_key"
                          placeholder="mi_configuracion"
                          value={newConfigKey}
                          onChange={(e) => setNewConfigKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_value">Valor (JSON)</Label>
                        <Textarea
                          id="new_value"
                          placeholder='"valor" o {"objeto": "complejo"}'
                          value={newConfigValue}
                          onChange={(e) => setNewConfigValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_description">Descripción</Label>
                        <Input
                          id="new_description"
                          placeholder="Descripción de la configuración"
                          value={newConfigDescription}
                          onChange={(e) => setNewConfigDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_category">Categoría</Label>
                        <Input
                          id="new_category"
                          placeholder="general"
                          value={newConfigCategory}
                          onChange={(e) => setNewConfigCategory(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleCreateConfig}>Crear</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs && configs.length > 0 ? (
                    configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-mono text-sm">{config.key}</TableCell>
                        <TableCell className="max-w-xs truncate">{JSON.stringify(config.value)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{config.description}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                            {config.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`¿Eliminar configuración "${config.key}"?`)) {
                                deleteConfigMutation.mutate(config.key);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay configuraciones
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {isUserDialogOpen && (
        <UserDialog
          open={isUserDialogOpen}
          onOpenChange={handleUserDialogOpenChange}
          onSuccess={handleUsersRefresh}
          user={selectedUser}
        />
      )}
    </div>
  );
}
