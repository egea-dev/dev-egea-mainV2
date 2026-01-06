import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Clock, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SlaConfig() {
    const handleSave = () => {
        toast.success('Configuración SLA guardada correctamente');
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Configuración de Service Level Agreements (SLA)
                    </CardTitle>
                    <CardDescription>
                        Define los tiempos de respuesta y resolución esperados para cada etapa del proceso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Tiempos de Producción */}
                        <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-slate-900/40">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-400" />
                                Tiempos de Producción
                            </h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Tiempo máximo en "Pendiente" (horas)</Label>
                                    <Input type="number" defaultValue={24} className="bg-slate-950/50 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Tiempo máximo en "Fabricación" (horas)</Label>
                                    <Input type="number" defaultValue={48} className="bg-slate-950/50 border-white/10" />
                                </div>
                            </div>
                        </div>

                        {/* Tiempos de Envío */}
                        <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-slate-900/40">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-cyan-400" />
                                Tiempos de Logística
                            </h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Margen de preparación (horas)</Label>
                                    <Input type="number" defaultValue={8} className="bg-slate-950/50 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Entrega estimada standard (días)</Label>
                                    <Input type="number" defaultValue={5} className="bg-slate-950/50 border-white/10" />
                                </div>
                            </div>
                        </div>

                        {/* Alertas y Notificaciones */}
                        <div className="md:col-span-2 space-y-4 p-4 rounded-xl border border-white/5 bg-slate-900/40">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                Alertas de Incumplimiento
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-white/5">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Notificar al Manager</Label>
                                        <p className="text-[10px] text-slate-500">Enviar alerta cuando se supere el 80% del SLA</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-white/5">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Escalado Automático</Label>
                                        <p className="text-[10px] text-slate-500">Marcar como "Urgente" automáticamente al expirar</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} className="gap-2">
                            <Save className="h-4 w-4" />
                            Guardar Configuración SLA
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
