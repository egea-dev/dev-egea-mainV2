import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/use-system-config";
import { useTheme } from "@/components/theme-provider";

export default function AppearanceSettings() {
    const { data: configs = [] } = useSystemConfig();
    const updateConfig = useUpdateSystemConfig();
    const { theme, setTheme } = useTheme();

    const [primaryColor, setPrimaryColor] = useState("#3b82f6");
    const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
    const [fontSize, setFontSize] = useState("medium");
    const [borderRadius, setBorderRadius] = useState("medium");

    // Cargar configuraciones existentes
    useState(() => {
        const getConfig = (key: string) => configs.find(c => c.key === key)?.value;

        setPrimaryColor(String(getConfig('theme_primary_color') || '#3b82f6'));
        setSecondaryColor(String(getConfig('theme_secondary_color') || '#8b5cf6'));
        setFontSize(String(getConfig('theme_font_size') || 'medium'));
        setBorderRadius(String(getConfig('theme_border_radius') || 'medium'));
    });

    const colorPresets = [
        { name: 'Azul', primary: '#3b82f6', secondary: '#8b5cf6' },
        { name: 'Verde', primary: '#10b981', secondary: '#14b8a6' },
        { name: 'Naranja', primary: '#f97316', secondary: '#f59e0b' },
        { name: 'Rosa', primary: '#ec4899', secondary: '#a855f7' },
        { name: 'Rojo', primary: '#ef4444', secondary: '#f97316' },
    ];

    const handleSaveAppearance = async () => {
        try {
            await Promise.all([
                updateConfig.mutateAsync({ key: 'theme_primary_color', value: primaryColor }),
                updateConfig.mutateAsync({ key: 'theme_secondary_color', value: secondaryColor }),
                updateConfig.mutateAsync({ key: 'theme_font_size', value: fontSize }),
                updateConfig.mutateAsync({ key: 'theme_border_radius', value: borderRadius }),
            ]);

            // Aplicar colores al documento
            document.documentElement.style.setProperty('--primary', primaryColor);
            document.documentElement.style.setProperty('--secondary', secondaryColor);

            toast.success('Configuración de apariencia guardada');
        } catch (error) {
            toast.error('Error al guardar configuración');
        }
    };

    return (
        <div className="space-y-6">
            {/* Tema */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Tema
                    </CardTitle>
                    <CardDescription>Configura el modo de visualización</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Modo de Tema</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                className="flex flex-col items-center gap-2 h-auto py-4"
                                onClick={() => setTheme('light')}
                            >
                                <Sun className="h-6 w-6" />
                                <span>Claro</span>
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                className="flex flex-col items-center gap-2 h-auto py-4"
                                onClick={() => setTheme('dark')}
                            >
                                <Moon className="h-6 w-6" />
                                <span>Oscuro</span>
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'outline'}
                                className="flex flex-col items-center gap-2 h-auto py-4"
                                onClick={() => setTheme('system')}
                            >
                                <Monitor className="h-6 w-6" />
                                <span>Sistema</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Colores */}
            <Card>
                <CardHeader>
                    <CardTitle>Colores</CardTitle>
                    <CardDescription>Personaliza la paleta de colores del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Label>Esquemas Predefinidos</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {colorPresets.map((preset) => (
                                <Button
                                    key={preset.name}
                                    variant="outline"
                                    className="h-auto flex-col gap-2 p-4"
                                    onClick={() => {
                                        setPrimaryColor(preset.primary);
                                        setSecondaryColor(preset.secondary);
                                    }}
                                >
                                    <div className="flex gap-2">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-background"
                                            style={{ backgroundColor: preset.primary }}
                                        />
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-background"
                                            style={{ backgroundColor: preset.secondary }}
                                        />
                                    </div>
                                    <span className="text-xs">{preset.name}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="primaryColor">Color Primario</Label>
                            <div className="flex gap-2">
                                <input
                                    id="primaryColor"
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="h-10 w-20 rounded border cursor-pointer"
                                />
                                <div className="flex-1 flex items-center px-3 border rounded bg-muted">
                                    <span className="text-sm font-mono">{primaryColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="secondaryColor">Color Secundario</Label>
                            <div className="flex gap-2">
                                <input
                                    id="secondaryColor"
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="h-10 w-20 rounded border cursor-pointer"
                                />
                                <div className="flex-1 flex items-center px-3 border rounded bg-muted">
                                    <span className="text-sm font-mono">{secondaryColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-2">
                        <Label>Vista Previa</Label>
                        <div className="flex gap-2">
                            <Button style={{ backgroundColor: primaryColor }}>
                                Botón Primario
                            </Button>
                            <Button variant="outline" style={{ borderColor: secondaryColor, color: secondaryColor }}>
                                Botón Secundario
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tipografía */}
            <Card>
                <CardHeader>
                    <CardTitle>Tipografía</CardTitle>
                    <CardDescription>Ajusta el tamaño de fuente del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fontSize">Tamaño de Fuente</Label>
                        <Select value={fontSize} onValueChange={setFontSize}>
                            <SelectTrigger id="fontSize">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small">Pequeño</SelectItem>
                                <SelectItem value="medium">Mediano</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Layout */}
            <Card>
                <CardHeader>
                    <CardTitle>Layout</CardTitle>
                    <CardDescription>Personaliza el diseño visual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="borderRadius">Bordes Redondeados</Label>
                        <Select value={borderRadius} onValueChange={setBorderRadius}>
                            <SelectTrigger id="borderRadius">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin redondeo</SelectItem>
                                <SelectItem value="small">Pequeño</SelectItem>
                                <SelectItem value="medium">Mediano</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        setPrimaryColor('#3b82f6');
                        setSecondaryColor('#8b5cf6');
                        setFontSize('medium');
                        setBorderRadius('medium');
                        toast.success('Valores restaurados por defecto');
                    }}
                >
                    Restaurar Valores por Defecto
                </Button>
                <Button onClick={handleSaveAppearance} size="lg">
                    Guardar Apariencia
                </Button>
            </div>
        </div>
    );
}
