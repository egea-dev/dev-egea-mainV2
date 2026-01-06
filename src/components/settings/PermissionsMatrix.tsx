import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const permissionsData = [
    { resource: 'dashboard', label: 'Dashboard Principal', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'View', production: 'View', shipping: 'View', warehouse: 'View', comercial: 'View' },
    { resource: 'users', label: 'Usuarios', admin: 'CRUD', manager: 'CRU (No Delete)', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'vehicles', label: 'Vehículos', admin: 'CRUD', manager: 'CRUD', responsable: 'CRU (No Delete)', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'installations', label: 'Instalaciones', admin: 'CRUD', manager: 'CRUD', responsable: 'CRU (No Delete)', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'screens', label: 'Pantallas', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'templates', label: 'Plantillas', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'communications', label: 'Comunicaciones', admin: 'CRUD', manager: 'CRUD', responsable: 'View, Create, Edit', operario: 'DESHABILITADO', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'archive', label: 'Historial/Archivo', admin: 'CRUD', manager: 'Read (No Create/Delete)', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'admin', label: 'Administración', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'comercial', label: 'Comercial', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'View', comercial: 'CRUD' },
    { resource: 'production', label: 'Producción', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'CRUD', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'warehouse', label: 'Almacén', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'CRUD', comercial: 'No Access' },
    { resource: 'envios', label: 'Envíos', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'View', shipping: 'CRUD', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'kiosk', label: 'Kiosko', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'calendario-global', label: 'Calendario Global', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'View', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'gestion', label: 'Gestión', admin: 'CRUD', manager: 'CRUD', responsable: 'View', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'data', label: 'Gestión de Datos', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'settings', label: 'Configuración', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'sla-config', label: 'Configuración SLA', admin: 'CRUD', manager: 'CRUD', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
    { resource: 'system-log', label: 'Log del Sistema', admin: 'CRUD', manager: 'View Only', responsable: 'No Access', operario: 'No Access', production: 'No Access', shipping: 'No Access', warehouse: 'No Access', comercial: 'No Access' },
];

const PermissionCell = ({ value }: { value: string }) => {
    if (value === 'CRUD') return <Badge className="bg-green-600/20 text-green-400 border-green-600/50">Total (CRUD)</Badge>;
    if (value === 'View') return <Badge variant="outline" className="border-blue-500/50 text-blue-400">Solo Ver</Badge>;
    if (value === 'No Access') return <Badge variant="destructive" className="opacity-40">Sin Acceso</Badge>;
    if (value === 'DESHABILITADO') return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">En Desarrollo</Badge>;

    return <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">{value}</Badge>;
};

export default function PermissionsMatrix() {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Matriz de Permisos del Sistema</CardTitle>
                <CardDescription>
                    Visualización detallada de los niveles de acceso base por rol y recurso.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="w-[180px] text-slate-300">Recurso</TableHead>
                                    <TableHead className="text-center font-bold text-purple-400">Admin</TableHead>
                                    <TableHead className="text-center font-bold text-blue-400">Manager</TableHead>
                                    <TableHead className="text-center font-bold text-green-400">Resp.</TableHead>
                                    <TableHead className="text-center font-bold text-slate-400">Oper.</TableHead>
                                    <TableHead className="text-center font-bold text-orange-400">Prod.</TableHead>
                                    <TableHead className="text-center font-bold text-cyan-400">Ship.</TableHead>
                                    <TableHead className="text-center font-bold text-amber-400">Ware.</TableHead>
                                    <TableHead className="text-center font-bold text-pink-400">Comer.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissionsData.map((row) => (
                                    <TableRow key={row.resource} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium text-slate-200">
                                            <div className="text-sm">{row.label}</div>
                                            <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{row.resource}</div>
                                        </TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.admin} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.manager} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.responsable} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.operario} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.production} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.shipping} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.warehouse} /></TableCell>
                                        <TableCell className="text-center"><PermissionCell value={row.comercial} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
