import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Settings,
    Globe,
    Bell,
    Shield,
    Key,
    AlertTriangle,
    Database,
    Zap
} from "lucide-react";
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/use-system-config";
import { Badge } from "@/components/ui/badge";

export default function SystemSettings() {
    const { data: configs = [] } = useSystemConfig();
    const updateConfig = useUpdateSystemConfig();

    // General
    const [systemName, setSystemName] = useState("");
    const [systemVersion, setSystemVersion] = useState("");
    const [defaultLanguage, setDefaultLanguage] = useState("es");
    const [timezone, setTimezone] = useState("Europe/Madrid");
    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

    // Notificaciones
    const [notificationEmail, setNotificationEmail] = useState("");
    const [enableEmailNotifications, setEnableEmailNotifications] = useState(true);
    const [enableTaskNotifications, setEnableTaskNotifications] = useState(true);
    const [enableSystemNotifications, setEnableSystemNotifications] = useState(true);

    // Seguridad
    const [sessionTimeout, setSessionTimeout] = useState("60");
    const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
    const [require2FA, setRequire2FA] = useState(false);
    const [minPasswordLength, setMinPasswordLength] = useState("8");
    const [requireSpecialChars, setRequireSpecialChars] = useState(true);

    // Mantenimiento
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState("");
    const [autoBackup, setAutoBackup] = useState(true);
    const [backupFrequency, setBackupFrequency] = useState("daily");

    // Rendimiento
    const [enableCache, setEnableCache] = useState(true);
    const [cacheTimeout, setCacheTimeout] = useState("3600");
    const [enableCompression, setEnableCompression] = useState(true);
    const [maxUploadSize, setMaxUploadSize] = useState("10");

    // Cargar configuraciones existentes
    useState(() => {
        const getConfig = (key: string, fallback: any = '') => {
            const value = configs.find(c => c.key === key)?.value;
            return value !== undefined && value !== null ? String(value) : fallback;
        };

        setSystemName(getConfig('system_name', 'EGEA Main Control'));
        setSystemVersion(getConfig('system_version', '2.0.0'));
        setDefaultLanguage(getConfig('default_language', 'es'));
        setTimezone(getConfig('timezone', 'Europe/Madrid'));
        setDateFormat(getConfig('date_format', 'DD/MM/YYYY'));

        setNotificationEmail(getConfig('notification_email'));
        setEnableEmailNotifications(getConfig('enable_email_notifications', true) === 'true');
        setEnableTaskNotifications(getConfig('enable_task_notifications', true) === 'true');
        setEnableSystemNotifications(getConfig('enable_system_notifications', true) === 'true');

        setSessionTimeout(getConfig('session_timeout', '60'));
        setMaxLoginAttempts(getConfig('max_login_attempts', '5'));
        setRequire2FA(getConfig('require_2fa', false) === 'true');
        setMinPasswordLength(getConfig('min_password_length', '8'));
        setRequireSpecialChars(getConfig('require_special_chars', true) === 'true');

        setMaintenanceMode(getConfig('maintenance_mode', false) === 'true');
        setMaintenanceMessage(getConfig('maintenance_message'));
        setAutoBackup(getConfig('auto_backup', true) === 'true');
        setBackupFrequency(getConfig('backup_frequency', 'daily'));

        setEnableCache(getConfig('enable_cache', true) === 'true');
        setCacheTimeout(getConfig('cache_timeout', '3600'));
        setEnableCompression(getConfig('enable_compression', true) === 'true');
        setMaxUploadSize(getConfig('max_upload_size', '10'));
    });

    const handleSaveGeneral = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'system_name', value: systemName }),
                updateConfig.mutateAsync({ key: 'system_version', value: systemVersion }),
                updateConfig.mutateAsync({ key: 'default_language', value: defaultLanguage }),
                updateConfig.mutateAsync({ key: 'timezone', value: timezone }),
                updateConfig.mutateAsync({ key: 'date_format', value: dateFormat }),
            ]);
            toast.success('Configuración general guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    const handleSaveNotifications = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'notification_email', value: notificationEmail }),
                updateConfig.mutateAsync({ key: 'enable_email_notifications', value: enableEmailNotifications }),
                updateConfig.mutateAsync({ key: 'enable_task_notifications', value: enableTaskNotifications }),
                updateConfig.mutateAsync({ key: 'enable_system_notifications', value: enableSystemNotifications }),
            ]);
            toast.success('Configuración de notificaciones guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    const handleSaveSecurity = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'session_timeout', value: sessionTimeout }),
                updateConfig.mutateAsync({ key: 'max_login_attempts', value: maxLoginAttempts }),
                updateConfig.mutateAsync({ key: 'require_2fa', value: require2FA }),
                updateConfig.mutateAsync({ key: 'min_password_length', value: minPasswordLength }),
                updateConfig.mutateAsync({ key: 'require_special_chars', value: requireSpecialChars }),
            ]);
            toast.success('Configuración de seguridad guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    const handleSaveMaintenance = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'maintenance_mode', value: maintenanceMode }),
                updateConfig.mutateAsync({ key: 'maintenance_message', value: maintenanceMessage }),
                updateConfig.mutateAsync({ key: 'auto_backup', value: autoBackup }),
                updateConfig.mutateAsync({ key: 'backup_frequency', value: backupFrequency }),
            ]);
            toast.success('Configuración de mantenimiento guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    const handleSavePerformance = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'enable_cache', value: enableCache }),
                updateConfig.mutateAsync({ key: 'cache_timeout', value: cacheTimeout }),
                updateConfig.mutateAsync({ key: 'enable_compression', value: enableCompression }),
                updateConfig.mutateAsync({ key: 'max_upload_size', value: maxUploadSize }),
            ]);
            toast.success('Configuración de rendimiento guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    return (
        <div className="space-y-6">
            {/* General */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Configuración General
                    </CardTitle>
                    <CardDescription>Parámetros básicos del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="systemName">Nombre del Sistema</Label>
                            <Input
                                id="systemName"
                                value={systemName}
                                onChange={(e) => setSystemName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="systemVersion">Versión</Label>
                            <Input
                                id="systemVersion"
                                value={systemVersion}
                                onChange={(e) => setSystemVersion(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="language">Idioma por Defecto</Label>
                            <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                                <SelectTrigger id="language">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="ca">Català</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timezone">Zona Horaria</Label>
                            <Select value={timezone} onValueChange={setTimezone}>
                                <SelectTrigger id="timezone">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
                                    <SelectItem value="Europe/London">Europa/Londres</SelectItem>
                                    <SelectItem value="America/New_York">América/Nueva York</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateFormat">Formato de Fecha</Label>
                            <Select value={dateFormat} onValueChange={setDateFormat}>
                                <SelectTrigger id="dateFormat">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveGeneral}>Guardar General</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notificaciones */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notificaciones
                    </CardTitle>
                    <CardDescription>Gestiona las notificaciones del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="notificationEmail">Email de Notificaciones</Label>
                        <Input
                            id="notificationEmail"
                            type="email"
                            value={notificationEmail}
                            onChange={(e) => setNotificationEmail(e.target.value)}
                            placeholder="notificaciones@empresa.com"
                        />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notificaciones por Email</Label>
                                <p className="text-sm text-muted-foreground">
                                    Enviar notificaciones importantes por correo
                                </p>
                            </div>
                            <Switch
                                checked={enableEmailNotifications}
                                onCheckedChange={setEnableEmailNotifications}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notificaciones de Tareas</Label>
                                <p className="text-sm text-muted-foreground">
                                    Alertas sobre tareas asignadas y vencimientos
                                </p>
                            </div>
                            <Switch
                                checked={enableTaskNotifications}
                                onCheckedChange={setEnableTaskNotifications}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Notificaciones del Sistema</Label>
                                <p className="text-sm text-muted-foreground">
                                    Avisos sobre actualizaciones y mantenimiento
                                </p>
                            </div>
                            <Switch
                                checked={enableSystemNotifications}
                                onCheckedChange={setEnableSystemNotifications}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveNotifications}>Guardar Notificaciones</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Seguridad */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Seguridad
                    </CardTitle>
                    <CardDescription>Políticas de seguridad y acceso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sessionTimeout">Tiempo de Sesión (minutos)</Label>
                            <Input
                                id="sessionTimeout"
                                type="number"
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="maxLoginAttempts">Intentos de Login Máximos</Label>
                            <Input
                                id="maxLoginAttempts"
                                type="number"
                                value={maxLoginAttempts}
                                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Requerir Autenticación de Dos Factores (2FA)</Label>
                                <p className="text-sm text-muted-foreground">
                                    Obligatorio para todos los usuarios
                                </p>
                            </div>
                            <Switch
                                checked={require2FA}
                                onCheckedChange={setRequire2FA}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <Label>Políticas de Contraseñas</Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minPasswordLength">Longitud Mínima</Label>
                                <Input
                                    id="minPasswordLength"
                                    type="number"
                                    value={minPasswordLength}
                                    onChange={(e) => setMinPasswordLength(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-6">
                                <Label>Requerir Caracteres Especiales</Label>
                                <Switch
                                    checked={requireSpecialChars}
                                    onCheckedChange={setRequireSpecialChars}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveSecurity}>Guardar Seguridad</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Mantenimiento */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Mantenimiento
                    </CardTitle>
                    <CardDescription>Modo mantenimiento y backups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Label>Modo Mantenimiento</Label>
                                {maintenanceMode && <Badge variant="destructive">Activo</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Bloquea el acceso al sistema excepto para administradores
                            </p>
                        </div>
                        <Switch
                            checked={maintenanceMode}
                            onCheckedChange={setMaintenanceMode}
                        />
                    </div>

                    {maintenanceMode && (
                        <div className="space-y-2">
                            <Label htmlFor="maintenanceMessage">Mensaje de Mantenimiento</Label>
                            <Textarea
                                id="maintenanceMessage"
                                value={maintenanceMessage}
                                onChange={(e) => setMaintenanceMessage(e.target.value)}
                                placeholder="El sistema está en mantenimiento. Volveremos pronto."
                                rows={3}
                            />
                        </div>
                    )}

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Backup Automático</Label>
                                <p className="text-sm text-muted-foreground">
                                    Realizar copias de seguridad automáticas
                                </p>
                            </div>
                            <Switch
                                checked={autoBackup}
                                onCheckedChange={setAutoBackup}
                            />
                        </div>

                        {autoBackup && (
                            <div className="space-y-2">
                                <Label htmlFor="backupFrequency">Frecuencia de Backup</Label>
                                <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                                    <SelectTrigger id="backupFrequency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hourly">Cada hora</SelectItem>
                                        <SelectItem value="daily">Diario</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveMaintenance}>Guardar Mantenimiento</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Rendimiento */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Rendimiento
                    </CardTitle>
                    <CardDescription>Optimización y límites del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Activar Caché</Label>
                                <p className="text-sm text-muted-foreground">
                                    Mejora el rendimiento almacenando datos temporalmente
                                </p>
                            </div>
                            <Switch
                                checked={enableCache}
                                onCheckedChange={setEnableCache}
                            />
                        </div>

                        {enableCache && (
                            <div className="space-y-2">
                                <Label htmlFor="cacheTimeout">Tiempo de Caché (segundos)</Label>
                                <Input
                                    id="cacheTimeout"
                                    type="number"
                                    value={cacheTimeout}
                                    onChange={(e) => setCacheTimeout(e.target.value)}
                                />
                            </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Compresión</Label>
                                <p className="text-sm text-muted-foreground">
                                    Comprime las respuestas para reducir el uso de ancho de banda
                                </p>
                            </div>
                            <Switch
                                checked={enableCompression}
                                onCheckedChange={setEnableCompression}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="maxUploadSize">Tamaño Máximo de Carga (MB)</Label>
                            <Input
                                id="maxUploadSize"
                                type="number"
                                value={maxUploadSize}
                                onChange={(e) => setMaxUploadSize(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSavePerformance}>Guardar Rendimiento</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
