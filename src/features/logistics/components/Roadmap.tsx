import React from 'react';
import { Truck, MapPin, Package, FileText, User, Calendar } from 'lucide-react';
import { Shipment, InventoryItem } from '../hooks/use-logistics';

interface RoadmapProps {
    shipment: Shipment;
    items: InventoryItem[];
}

const Roadmap: React.FC<RoadmapProps> = ({ shipment, items }) => {
    return (
        <div className="roadmap-container bg-white text-black p-10 w-[800px] mx-auto font-sans print:shadow-none shadow-2xl rounded-sm border border-slate-200">
            {/* HEADER LOGÍSTICO */}
            <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">HOJA DE RUTA</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">DESPACHO DE MERCANCÍA / EXPEDICIÓN</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-black">{shipment.tracking_number || `EXP-${shipment.id.slice(0, 8).toUpperCase()}`}</h2>
                    <p className="text-xs font-bold text-slate-500 flex items-center justify-end gap-1 uppercase">
                        <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* DATOS DE ENTREGA */}
            <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="bg-black text-white p-2 rounded-lg">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinatario y Dirección</p>
                            <p className="text-lg font-black leading-tight mt-1">{shipment.recipient_name || 'PENDIENTE DE ASIGNAR'}</p>
                            <p className="text-sm font-medium text-slate-600">{shipment.delivery_address}</p>
                            <p className="text-sm font-bold text-black uppercase">{shipment.delivery_city}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transportista</p>
                            <p className="text-sm font-bold">{shipment.carrier_name || 'Reparto Propio'}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center">
                    <Package className="w-12 h-12 text-slate-300 mb-2" />
                    <h3 className="text-4xl font-black">{items.length}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bultos Totales</p>
                </div>
            </div>

            {/* TABLA DE BULTOS */}
            <div className="mb-10">
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Contenido de la Expedición
                </h3>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="py-3 px-2">Bulto ID</th>
                            <th className="py-3 px-2 text-right">Referencia</th>
                            <th className="py-3 px-2 text-right">Embalaje</th>
                            <th className="py-3 px-2 text-right">Peso (Kg)</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs font-bold divide-y divide-slate-100">
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="py-4 px-2 text-slate-500">{item.id.slice(0, 13).toUpperCase()}</td>
                                <td className="py-4 px-2 text-right text-lg">{item.order_number}</td>
                                <td className="py-4 px-2 text-right uppercase">{item.packaging_type || 'ESTÁNDAR'}</td>
                                <td className="py-4 px-2 text-right">{item.weight_kg || '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* NOTAS Y FIRMAS */}
            <div className="grid grid-cols-2 gap-10 mt-auto border-t-2 border-slate-100 pt-10">
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</p>
                        <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-4 text-[10px] text-slate-500 italic">
                            {shipment.status === 'INCIDENCIA' ? '⚠️ Envío con incidencias reportadas.' : 'Sin observaciones adicionales para el reparto.'}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="border-b border-slate-300 pb-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-8">Firma Salida Almacén</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-300">
                            <User className="w-3 h-3" /> Responsable de Logística
                        </div>
                    </div>
                    <div className="border-b border-slate-300 pb-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-8">Conformidad del Transportista / Receptor</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-300">
                            <User className="w-3 h-3" /> Nombre y DNI
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em]">
                EGEA INDUSTRIAL - DOCUMENTO GENERADO AUTOMÁTICAMENTE - © {new Date().getFullYear()}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden; }
          .roadmap-container, .roadmap-container * { visibility: visible; }
          .roadmap-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none;
            padding: 0;
            box-shadow: none;
          }
        }
      `}} />
        </div>
    );
};

export default Roadmap;
