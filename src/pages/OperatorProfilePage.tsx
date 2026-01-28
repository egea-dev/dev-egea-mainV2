import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/use-supabase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Settings,
    Bell,
    Moon,
    LogOut
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";


export default function OperatorProfilePage() {
    const { data: profile, isLoading } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
    });

    // Inicializar datos del formulario cuando se carga el perfil
    useState(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name ?? "",
                phone: profile.phone ?? "",
            });
        }
    });

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            toast.success("Sesión cerrada correctamente");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            toast.error("Error al cerrar sesión");
        }
    };

    const handleSaveProfile = async () => {
        if (!profile?.id) return;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                })
                .eq("id", profile.id);

            if (error) {
                toast.error("Error al guardar cambios");
                console.error("Error updating profile:", error);
            } else {
                toast.success("Perfil actualizado correctamente");
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Error al guardar cambios");
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 md:pb-6">
            {/* Header con Avatar */}
            <Card className="border bg-gradient-to-br from-card to-card/50">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <Avatar className="h-24 w-24 border-4 border-primary/20">
                            <AvatarImage src={profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                {getInitials(profile?.full_name ?? "U")}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold">{profile?.full_name ?? "Usuario"}</h1>
                            <Badge variant="secondary" className="capitalize">
                                {profile?.role ?? "operario"}
                            </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Miembro desde {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy", { locale: es }) : "N/D"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Información Personal */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Información Personal
                        </CardTitle>
                        <Button
                            variant={isEditing ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                if (isEditing) {
                                    handleSaveProfile();
                                } else {
                                    setFormData({
                                        full_name: profile?.full_name ?? "",
                                        phone: profile?.phone ?? "",
                                    });
                                    setIsEditing(true);
                                }
                            }}
                        >
                            {isEditing ? "Guardar" : "Editar"}
                        </Button>
                    </div>
                    <CardDescription>
                        Tu información personal y de contacto
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nombre completo</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Tu nombre completo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Tu número de teléfono"
                                />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Nombre</p>
                                    <p className="font-medium">{profile?.full_name ?? "Sin nombre"}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-medium">{profile?.email ?? "Sin email"}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Teléfono</p>
                                    <p className="font-medium">{profile?.phone ?? "Sin teléfono"}</p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Estadísticas de Trabajo */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Estadísticas de Trabajo
                    </CardTitle>
                    <CardDescription>
                        Resumen de tu actividad laboral
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">--</p>
                            <p className="text-xs text-emerald-600">Tareas completadas</p>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                            <Calendar className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">--</p>
                            <p className="text-xs text-blue-600">Días trabajados</p>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                            <Clock className="h-6 w-6 mx-auto text-amber-600 mb-2" />
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">--</p>
                            <p className="text-xs text-amber-600">Horas totales</p>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                            <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
                            <p className="text-2xl font-bold text-red-700 dark:text-red-300">--</p>
                            <p className="text-xs text-red-600">Incidencias</p>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                        Las estadísticas detalladas estarán disponibles próximamente
                    </p>
                </CardContent>
            </Card>

            {/* Configuración */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Configuración
                    </CardTitle>
                    <CardDescription>
                        Preferencias y ajustes de la aplicación
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Notificaciones</p>
                                <p className="text-xs text-muted-foreground">Recibir alertas de tareas</p>
                            </div>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Moon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Tema oscuro</p>
                                <p className="text-xs text-muted-foreground">Cambiar apariencia</p>
                            </div>
                        </div>
                        <Switch />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Mostrar calendario</p>
                                <p className="text-xs text-muted-foreground">Ver calendario en Mi Jornada</p>
                            </div>
                        </div>
                        <Switch
                            defaultChecked={
                                localStorage.getItem('workday-show-calendar')
                                    ? JSON.parse(localStorage.getItem('workday-show-calendar')!)
                                    : true
                            }
                            onCheckedChange={(checked) => {
                                localStorage.setItem('workday-show-calendar', JSON.stringify(checked));
                                toast.success(checked ? "Calendario visible" : "Calendario oculto");
                            }}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Ubicación</p>
                                <p className="text-xs text-muted-foreground">Compartir ubicación</p>
                            </div>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Cerrar Sesión */}
            <Card className="border-destructive/50">
                <CardContent className="pt-6">
                    <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
