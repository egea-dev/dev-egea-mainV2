// Integración de Email de Presupuesto en OrderDetailModal
// Añadir este código en la sección de Email Presupuesto (línea 743-785)

import { generatePresupuestoApprovalEmail } from '@/utils/email-templates';

// Reemplazar el contenido del div "Email Presupuesto" con:

<div className="bg-[#2F3135] p-5 rounded-2xl border border-[#3B3D41] shadow-sm">
    <h4 className="font-bold text-white mb-4 flex items-center">
        <FileText className="w-4 h-4 mr-2 text-[#14CC7F]" /> Email Presupuesto para Aprobación
    </h4>
    <div className="bg-[#1F2225] rounded-xl p-4 mb-4 border border-[#3B3D41] max-h-[400px] overflow-y-auto custom-scrollbar">
        <div className="text-xs text-[#8B8D90]">
            <div className="mb-2 pb-2 border-b border-[#3B3D41]">
                <p className="text-white font-semibold">Para: {formData.email || '{EMAIL_CLIENTE}'}</p>
                <p className="text-[#8B8D90]">Asunto: ✅ Presupuesto Listo - Pedido {formData.order_number} - EGEA</p>
            </div>
            <div className="space-y-2 font-mono">
                <p>📋 <strong>Ref:</strong> {formData.order_number}</p>
                <p>👤 <strong>Cliente:</strong> {formData.customer_company || formData.customer_name}</p>
                <p>📍 <strong>Región:</strong> {formData.delivery_region || formData.region}</p>
                <p>📅 <strong>Entrega:</strong> {formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString('es-ES') : 'Pendiente'}</p>
                <p>📦 <strong>Total:</strong> {formData.quantity_total || 0} uds</p>
                <p>📏 <strong>Líneas:</strong> {formData.lines?.length || 0} medidas</p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#3B3D41]">
                <p className="text-[#14CC7F]">✅ Email profesional con logo EGEA</p>
                <p className="text-[#14CC7F]">✅ Tabla de medidas completa</p>
                <p className="text-[#14CC7F]">✅ Instrucciones de aprobación</p>
            </div>
        </div>
    </div>
    <div className="flex items-center justify-end gap-2">
        <Button
            onClick={() => {
                const emailHTML = generatePresupuestoApprovalEmail({
                    orderNumber: formData.order_number,
                    customerName: formData.customer_name,
                    customerCompany: formData.customer_company,
                    customerCIF: formData.customer_code,
                    contactName: formData.contact_name,
                    phone: formData.phone,
                    email: formData.email,
                    deliveryAddress: formData.delivery_address,
                    deliveryRegion: formData.delivery_region || formData.region,
                    lines: formData.lines || [],
                    totalAmount: formData.quantity_total || 0
                });
                const win = window.open('', '_blank');
                if (win) {
                    win.document.write(emailHTML);
                    win.document.close();
                }
            }}
            variant="outline"
            className="border-[#3B3D41] text-[#8B8D90] hover:bg-[#3B3D41] hover:text-white"
        >
            👁️ Vista Previa
        </Button>
        <Button
            onClick={() => {
                const emailHTML = generatePresupuestoApprovalEmail({
                    orderNumber: formData.order_number,
                    customerName: formData.customer_name,
                    customerCompany: formData.customer_company,
                    customerCIF: formData.customer_code,
                    contactName: formData.contact_name,
                    phone: formData.phone,
                    email: formData.email,
                    deliveryAddress: formData.delivery_address,
                    deliveryRegion: formData.delivery_region || formData.region,
                    lines: formData.lines || [],
                    totalAmount: formData.quantity_total || 0
                });
                navigator.clipboard.writeText(emailHTML);
                alert('✅ HTML del email copiado al portapapeles\n\nPuedes pegarlo directamente en tu cliente de correo.');
            }}
            className="bg-[#14CC7F] hover:bg-[#11A366] text-white"
        >
            <Copy className="w-4 h-4 mr-2" />
            Copiar HTML
        </Button>
    </div>
</div>
