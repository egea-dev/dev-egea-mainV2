
import React, { useState } from 'react';
import { Plus, Package, Eye, Printer, Lock, Archive, LayoutList, History } from 'lucide-react';
import { Order, OrderStatus, Role } from '../../types';
import { getStatusBadge } from '../../utils';
import OrderDetailModal from '../OrderDetailModal';
import CalendarModule from './CalendarModule';

interface CommercialModuleProps {
  orders: Order[];
  setOrders: (order: Order) => void;
  addOrder: (newOrder: Partial<Order>) => void;
  addLog: (order_number: string, action: string, user_role: Role) => void;
  role: Role; 
}

const CommercialModule: React.FC<CommercialModuleProps> = ({ orders, setOrders, addOrder, addLog, role }) => {
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const activeOrders = orders.filter(o => o.status !== 'ENVIADO' && o.status !== 'CANCELADO');
  const archivedOrders = orders.filter(o => o.status === 'ENVIADO' || o.status === 'CANCELADO');

  const displayedOrders = viewMode === 'ACTIVE' ? activeOrders : archivedOrders;

  const handleCreateOrder = () => {
    const orderNum = `INT-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const order: Partial<Order> = {
      order_number: orderNum, 
      admin_code: '', 
      customer_name: 'Cliente Nuevo', 
      region: 'PENINSULA',
      fabric: 'Lino', 
      color: 'Por definir', 
      quantity_total: 0, 
      quantity_shipped: 0, 
      status: 'PENDIENTE_PAGO',
      needs_shipping_validation: false, 
      qr_payload: `${orderNum}|Cliente Nuevo|PENDIENTE`, 
      lines: [], 
      documents: []
    };
    addOrder(order);
    setNewOrderModal(false);
    addLog(orderNum, 'Pedido Creado en DB', 'COMERCIAL');
  };

  const validateOrderReadyForProduction = (order: Order): { valid: boolean, error?: string } => {
    if (!order.admin_code || order.admin_code.trim() === '') return { valid: false, error: 'Falta el Número de Pedido (Ref. Administración).' };
    const hasPresupuesto = order.documents.some(d => d.type === 'PRESUPUESTO');
    const hasPedido = order.documents.some(d => d.type === 'PEDIDO_ACEPTADO');
    if (!hasPresupuesto || !hasPedido) return { valid: false, error: 'Falta subir Presupuesto o Pedido Aceptado.' };
    if (order.lines.length === 0) return { valid: false, error: 'El desglose de medidas está vacío.' };
    return { valid: true };
  };

  const changeStatus = (order: Order, newStatus: OrderStatus) => {
    if (!comment) return alert('Comentario obligatorio');
    
    if (newStatus === 'PAGADO') {
      const check = validateOrderReadyForProduction(order);
      if (!check.valid && role !== 'ADMIN') {
        alert(`NO SE PUEDE ENVIAR A PRODUCCIÓN:\n${check.error}`);
        return;
      }
    }

    setOrders({ ...order, status: newStatus });
    addLog(order.order_number, `Cambio estado a ${newStatus}: ${comment}`, 'COMERCIAL');
    setComment('');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#FFFFFF] tracking-tight">Gestión Comercial</h2>
          <p className="text-[#8B8D90]">Administración de pedidos y clientes</p>
        </div>
        <button onClick={() => setNewOrderModal(true)} className="bg-[#14CC7F] text-white px-5 py-2.5 rounded-xl hover:bg-[#11A366] shadow-lg shadow-[#14CC7F]/20 flex items-center transition-all hover:scale-105">
          <Plus className="w-5 h-5 mr-2" /> Nuevo Pedido
        </button>
      </div>

      <div className="mb-8 bg-[#323438] p-4 rounded-xl border border-[#45474A] shadow-sm">
         <CalendarModule orders={activeOrders} embedded onOrderClick={setSelectedOrder} />
      </div>

      <div className="flex items-center gap-4 mb-6 border-b border-[#45474A]">
          <button onClick={() => setViewMode('ACTIVE')} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${viewMode === 'ACTIVE' ? 'border-[#14CC7F] text-[#14CC7F]' : 'border-transparent text-[#8B8D90] hover:text-[#FFFFFF]'}`}>
              <LayoutList className="w-4 h-4" />
              <span className="font-bold text-sm">Pedidos Activos</span>
          </button>
          <button onClick={() => setViewMode('ARCHIVED')} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${viewMode === 'ARCHIVED' ? 'border-[#14CC7F] text-[#14CC7F]' : 'border-transparent text-[#8B8D90] hover:text-[#FFFFFF]'}`}>
              <History className="w-4 h-4" />
              <span className="font-bold text-sm">Historial</span>
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedOrders.map(order => (
            <div key={order.id} className="bg-[#323438] rounded-xl border border-[#45474A] shadow-sm flex flex-col hover:border-[#6E6F71] transition-all">
                <div className="p-5 border-b border-[#45474A] flex justify-between items-start">
                    <div>
                        <span className="font-mono font-bold text-lg text-[#FFFFFF]">{order.order_number}</span>
                        <div className={`text-xs mt-0.5 font-bold ${order.admin_code ? 'text-[#8B8D90]' : 'text-red-400'}`}>
                            {order.admin_code || 'FALTA REF. ADMIN'}
                        </div>
                    </div>
                    <span className={getStatusBadge(order.status)}>{order.status.replace('_', ' ')}</span>
                </div>
                
                <div className="p-5 flex-1">
                    <p className="text-xs text-[#8B8D90] uppercase font-bold">Cliente</p>
                    <p className="font-medium text-[#B5B8BA] truncate">{order.customer_name}</p>
                </div>

                <div className="p-4 bg-[#1A1D1F]/50 rounded-b-xl border-t border-[#45474A] flex items-center justify-between gap-2">
                    <button onClick={() => setSelectedOrder(order)} className="text-[#14CC7F] hover:text-[#11A366] text-sm font-medium flex items-center">
                        <Eye className="w-4 h-4 mr-1.5" /> Ver / Editar
                    </button>
                    {order.status === 'PENDIENTE_PAGO' && (
                        <div className="flex gap-2">
                            <input type="text" placeholder="Nota..." className="w-20 text-xs bg-[#1A1D1F] border border-[#45474A] text-white rounded px-2 outline-none" value={comment} onChange={(e) => setComment(e.target.value)} />
                            <button onClick={() => changeStatus(order, 'PAGADO')} className="bg-[#14CC7F] text-white text-[10px] px-2 py-1 rounded font-bold">VALIDAR</button>
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {newOrderModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#323438] border border-[#45474A] p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="w-12 h-12 bg-[#14CC7F]/20 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-6 h-6 text-[#14CC7F]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#FFFFFF] mb-2">Crear Nuevo Pedido</h3>
                  <p className="text-[#8B8D90] text-sm mb-6">Se insertará un nuevo registro en la base de datos industrial de EgeaOS.</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setNewOrderModal(false)} className="px-4 py-2 text-[#8B8D90] hover:text-white">Cancelar</button>
                      <button onClick={handleCreateOrder} className="px-6 py-2 bg-[#14CC7F] text-white rounded-lg font-bold">Crear en DB</button>
                  </div>
              </div>
          </div>
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} role={role} onClose={() => setSelectedOrder(null)} onSave={setOrders} />
      )}
    </div>
  );
};

export default CommercialModule;
