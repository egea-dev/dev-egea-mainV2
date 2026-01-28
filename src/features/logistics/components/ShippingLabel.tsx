import React from 'react';
import { QRCodeSVG } from "qrcode.react";
import { Package, Truck, Calendar } from 'lucide-react';
import { InventoryItem } from '../hooks/use-logistics';

interface ShippingLabelProps {
    item: InventoryItem;
}

const ShippingLabel: React.FC<ShippingLabelProps> = ({ item }) => {
    return (
        <div className="shipping-label-container bg-white text-black p-8 w-[400px] border-2 border-dashed border-slate-300 mx-auto font-sans print:border-none print:shadow-none shadow-xl rounded-lg">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">EGEA INDUSTRIAL</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Planta de Confección v3.0</p>
                </div>
                <Package className="w-10 h-10" />
            </div>

            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 border border-slate-100 rounded-2xl mb-6">
                <div className="bg-white border-2 border-black p-2">
                    <QRCodeSVG
                        value={item.order_number}
                        size={170}
                        level="H"
                        className="w-[170px] h-[170px] print:w-[40mm] print:h-[40mm]"
                    />
                </div>
                <p className="mt-4 font-black text-2xl tracking-[0.2em]">{item.order_number}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase mb-6">
                <div className="bg-slate-100 p-3 rounded-xl">
                    <p className="text-slate-400 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Tipo Bulto</p>
                    <p className="text-sm">{item.packaging_type || 'ESTÁNDAR'}</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-xl">
                    <p className="text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</p>
                    <p className="text-sm">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="border-t-2 border-black pt-4 flex justify-between items-center italic text-[9px] text-slate-500">
                <span>ID DE TRAZABILIDAD: {item.id.slice(0, 18).toUpperCase()}</span>
                <span className="font-bold">MOD. {item.status}</span>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden; }
          .shipping-label-container, .shipping-label-container * { visibility: visible; }
          .shipping-label-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: auto;
            border: none;
            padding: 0;
          }
        }
      `}} />
        </div>
    );
};

export default ShippingLabel;
