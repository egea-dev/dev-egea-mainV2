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
  useEffect(() => {
    const loadRolePermissions = async () => {
      try {
        const { data: permissions, error } = await supabase
          .from('role_permissions')
          .select('*');
        
        if (error) throw error;
        
        const permissionsByRole: Record<string, Record<string, { can_view: boolean; can_edit: boolean }>> = {};

        // Inicializar estructura base
        ['admin', 'manager', 'responsable', 'operario'].forEach(role => {
          permissionsByRole[role] = {};
          [
            '/admin', '/admin/installations', '/admin/data', '/admin/screens',
            '/admin/templates', '/admin/users', '/admin/archive', '/admin/settings'
          ].forEach(page => {
            permissionsByRole[role][page] = { can_view: role === 'admin', can_edit: role === 'admin' };
          });
        });
        
        // Cargar permisos desde la base de datos
        permissions?.forEach(permission => {
          if (permissionsByRole[permission.role] && permissionsByRole[permission.role][permission.page]) {
            permissionsByRole[permission.role][permission.page] = {
              can_view: permission.can_view,
              can_edit: permission.can_edit
            };
          }
        });
        
        setRolePermissions(permissionsByRole);
      } catch (error) {
        console.error('Error al cargar permisos:', error);
      }
    };
    
    loadRolePermissions();
  }, []);

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
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración del sistema y tu perfil</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
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
                            if (!inviteEmail) return;
                            
                            try {
                              const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail);
                              if (error) throw error;
                              
                              toast.success('Invitación enviada');
                              setInviteEmail('');
                              setIsInviteDialogOpen(false);
                            } catch (error) {
                              toast.error('Error al enviar invitación');
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
                                    const { error } = await supabase
                                      .from('profiles')
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

        {/* TAB: Permisos */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Control de Acceso por Rol
              </CardTitle>
              <CardDescription>Configura permisos para cada rol en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['admin', 'responsable', 'operario'].map((role) => (
                  <div key={role} className="space-y-4">
                    <h3 className="text-lg font-semibold capitalize">{role}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { page: '/admin', label: 'Dashboard' },
                        { page: '/admin/installations', label: 'Instalaciones' },
                        { page: '/admin/data', label: 'Gestión de Datos' },
                        { page: '/admin/screens', label: 'Pantallas' },
                        { page: '/admin/templates', label: 'Plantillas' },
                        { page: '/admin/users', label: 'Usuarios' },
                        { page: '/admin/archive', label: 'Historial' },
                        { page: '/admin/settings', label: 'Configuración' },
                      ].map(({ page, label }) => (
                        <div key={page} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm font-medium">{label}</span>
                          <div className="flex gap-2">
                            <Switch
                              checked={rolePermissions[role]?.[page]?.can_view || role === 'admin'}
                              onCheckedChange={(checked) => {
                                setRolePermissions(prev => ({
                                  ...prev,
                                  [role]: {
                                    ...prev[role],
                                    [page]: {
                                      ...prev[role]?.[page],
                                      can_view: checked
                                    }
                                  }
                                }));
                              }}
                              disabled={role === 'admin'}
                            />
                            <Switch
                              checked={rolePermissions[role]?.[page]?.can_edit || role === 'admin'}
                              onCheckedChange={(checked) => {
                                setRolePermissions(prev => ({
                                  ...prev,
                                  [role]: {
                                    ...prev[role],
                                    [page]: {
                                      ...prev[role]?.[page],
                                      can_edit: checked
                                    }
                                  }
                                }));
                              }}
                              disabled={role === 'admin'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end">
                  <Button onClick={async () => {
                    try {
                      // Guardar permisos en la base de datos
                      const rolesToReset = Object.keys(rolePermissions);
                      const { error } = await supabase
                        .from('role_permissions')
                        .delete()
                        .in('role', rolesToReset.length ? rolesToReset : ['admin', 'manager', 'responsable', 'operario']);

                      if (error) throw error;
                      
                      // Insertar nuevos permisos
                      const permissionsToInsert = [];
                      for (const [role, pages] of Object.entries(rolePermissions)) {
                        for (const [page, permissions] of Object.entries(pages)) {
                          if (permissions.can_view || permissions.can_edit) {
                            permissionsToInsert.push({
                              role,
                              page,
                              can_view: permissions.can_view || false,
                              can_edit: permissions.can_edit || false,
                              can_delete: role === 'admin' // Solo admins pueden eliminar
                            });
                          }
                        }
                      }
                      
                      if (permissionsToInsert.length > 0) {
                        const { error: insertError } = await supabase
                          .from('role_permissions')
                          .insert(permissionsToInsert);
                        
                        if (insertError) throw insertError;
                      }
                      
                      toast.success('Permisos actualizados correctamente');
                    } catch (error) {
                      console.error('Error al guardar permisos:', error);
                      toast.error('Error al guardar permisos');
                    }
                  }}>
                    Guardar Permisos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Empresa */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>Configure los datos de su organización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nombre de la Empresa
                </Label>
                <Input
                  id="company_name"
                  value={stringConfig('company_name')}
                  onChange={(event) =>
                    setConfigValues((prev) => ({ ...prev, company_name: event.target.value }))
                  }
                  onBlur={(event) => handleUpdateConfig('company_name', event.currentTarget.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email de Contacto
                </Label>
                <Input
                  id="company_email"
                  type="email"
                  value={stringConfig('company_email')}
                  onChange={(event) =>
                    setConfigValues((prev) => ({ ...prev, company_email: event.target.value }))
                  }
                  onBlur={(event) => handleUpdateConfig('company_email', event.currentTarget.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono de Contacto
                </Label>
                <Input
                  id="company_phone"
                  value={stringConfig('company_phone')}
                  onChange={(event) =>
                    setConfigValues((prev) => ({ ...prev, company_phone: event.target.value }))
                  }
                  onBlur={(event) => handleUpdateConfig('company_phone', event.currentTarget.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_logo" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  URL del Logo
                </Label>
                <Input
                  id="company_logo"
                  placeholder="https://ejemplo.com/logo.png"
                  value={stringConfig('company_logo')}
                  onChange={(event) =>
                    setConfigValues((prev) => ({ ...prev, company_logo: event.target.value }))
                  }
                  onBlur={(event) => handleUpdateConfig('company_logo', event.currentTarget.value)}
                />
                <p className="text-xs text-muted-foreground">URL pública de la imagen del logo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Apariencia */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apariencia
              </CardTitle>
              <CardDescription>Personaliza el aspecto visual de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme_primary_color">Color Primario</Label>
                <div className="flex gap-2">
                  <Input
                    id="theme_primary_color"
                    type="color"
                    className="w-20 h-10"
                    value={stringConfig('theme_primary_color', '#0ea5e9')}
                    onChange={(event) => {
                      setConfigValues((prev) => ({
                        ...prev,
                        theme_primary_color: event.target.value
                      }));
                      handleUpdateConfig('theme_primary_color', event.target.value);
                    }}
                  />
                  <Input
                    value={stringConfig('theme_primary_color', '#0ea5e9')}
                    onChange={(event) =>
                      setConfigValues((prev) => ({
                        ...prev,
                        theme_primary_color: event.target.value
                      }))
                    }
                    onBlur={(event) => handleUpdateConfig('theme_primary_color', event.currentTarget.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Sistema */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>Opciones generales del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificaciones del sistema</p>
                </div>
                <Switch
                  checked={booleanConfig('enable_notifications')}
                  onCheckedChange={(checked) => {
                    setConfigValues((prev) => ({ ...prev, enable_notifications: checked }));
                    handleUpdateConfig('enable_notifications', checked);
                  }}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="default_task_duration">Duración por defecto de tareas (horas)</Label>
                <Input
                  id="default_task_duration"
                  type="number"
                  min="1"
                  max="24"
                  value={numberConfig('default_task_duration', 8)}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    setConfigValues((prev) => ({
                      ...prev,
                      default_task_duration: Number.isNaN(parsed) ? null : parsed
                    }));
                  }}
                  onBlur={(event) => {
                    const parsed = Number.parseInt(event.currentTarget.value, 10);
                    handleUpdateConfig('default_task_duration', Number.isNaN(parsed) ? null : parsed);
                  }}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Versión de la Aplicación</Label>
                <Input
                  value={stringConfig('app_version', '1.0.0-alpha')}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
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
