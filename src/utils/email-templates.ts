// Plantillas de email para el sistema de pedidos

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerCompany: string;
  customerCIF: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  deliveryRegion: 'PENINSULA' | 'BALEARES' | 'CANARIAS';
  lines: Array<{
    width: string | number;
    height: string | number;
    material?: string;
    quantity: number;
  }>;
  totalAmount: number;
  presupuestoUrl?: string;
}

/**
 * Genera el HTML del email de envío de presupuesto para aprobación
 */
export function generatePresupuestoApprovalEmail(data: OrderEmailData): string {
  const regionNames = {
    PENINSULA: 'Península',
    BALEARES: 'Baleares',
    CANARIAS: 'Canarias'
  };

  const linesHTML = data.lines.map((line, index) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${line.width}cm x ${line.height}cm</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${line.material || 'N/A'}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${line.quantity}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #803746, #a05252); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="https://egea-cortinas-two.vercel.app/image/egea-evolucio-g.png" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">PRESUPUESTO PARA APROBACIÓN</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
      </div>

      <!-- Main Content -->
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #803746; margin: 0 0 10px 0;">Tu Presupuesto está Listo</h2>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">Hemos preparado tu presupuesto detallado. Por favor, revísalo y confírmanos si deseas proceder con el pedido.</p>
        </div>

        <!-- Reference Number -->
        <div style="background: #f9fafb; border: 2px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Número de Pedido:</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.customerCIF}</p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Conserva este número para cualquier consulta y para realizar el pago</p>
        </div>

        <!-- Professional Data -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Profesional</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razón Social:</p>
              <p style="margin: 0; font-weight: 500;">${data.customerCompany || data.customerName}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">CIF:</p>
              <p style="margin: 0; font-weight: 500;">${data.customerCIF || 'N/A'}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Contacto:</p>
              <p style="margin: 0; font-weight: 500;">${data.contactName || data.customerName}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Teléfono:</p>
              <p style="margin: 0; font-weight: 500;">${data.phone || 'N/A'}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Dirección:</p>
              <p style="margin: 0; font-weight: 500;">${data.deliveryAddress}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona:</p>
              <p style="margin: 0; font-weight: 500;">${regionNames[data.deliveryRegion]}</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
            <p style="margin: 0; font-weight: 500;">${data.email}</p>
          </div>
        </div>

        <!-- Measurements -->
        <div style="margin-bottom: 25px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📄 <strong>Presupuesto adjunto en PDF</strong> con el detalle completo de medidas y especificaciones técnicas.
          </p>
        </div>

        <!-- Total -->
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <p style="margin: 0; font-size: 16px; color: #374151;">Total del Presupuesto:</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746;">${data.totalAmount.toFixed(2)} €</p>
          </div>
        </div>

        ${data.presupuestoUrl ? `
        <!-- Download Button -->
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${data.presupuestoUrl}" style="display: inline-block; background: #803746; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            📄 Descargar Presupuesto PDF
          </a>
        </div>
        ` : ''}

        <!-- Approval Instructions -->
        <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #166534; margin: 0 0 10px 0;">✅ Para Aprobar este Presupuesto</h4>
          <ol style="margin: 0; padding-left: 20px; color: #374151;">
            <li style="margin-bottom: 8px;"><strong>Revisa</strong> el presupuesto adjunto en PDF con todos los detalles y medidas</li>
            <li style="margin-bottom: 8px;"><strong>Responde a este email</strong> confirmando tu aprobación e indicando el número de pedido <strong>${data.customerCIF}</strong></li>
            <li style="margin-bottom: 8px;"><strong>Realiza el pago</strong> y adjunta el comprobante de pago al correo de respuesta con la referencia <strong>${data.customerCIF}</strong></li>
            <li>Una vez recibido el comprobante de pago, <strong>procesaremos tu pedido inmediatamente</strong></li>
          </ol>
        </div>

        <!-- Payment Instructions -->
        <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
          <p style="margin: 0; color: #374151; font-size: 14px;">
            💳 <strong>Para solicitar los datos de pago:</strong> Escribe a <strong>pedidos@decoracionesegea.com</strong> indicando el número de pedido <strong>${data.customerCIF}</strong>. Te enviaremos los datos bancarios.
          </p>
        </div>

        <!-- Important Notice -->
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⚠️ Importante:</strong> Este presupuesto tiene una validez de <strong>15 días naturales</strong>. 
            Los precios pueden variar según disponibilidad de materiales y condiciones del mercado. 
            El pedido se procesará únicamente tras la confirmación del pago.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #374151; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">¿Tienes dudas o necesitas asesoramiento?</p>
        <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px;">Nuestro equipo de atención al cliente está aquí para ayudarte:</p>
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: 500;">📧 Email: pedidos@decoracionesegea.com</p>
          <p style="margin: 0; color: #fbbf24; font-weight: 500;">📞 Teléfono: +34 601 904 680</p>
        </div>
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">Horario de atención: Lunes a Viernes, 9:00-14:00h</p>
        <hr style="border: 1px solid #4b5563; margin: 15px 0;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 10px;">Este correo ha sido generado automáticamente. Por favor, responde a pedidos@decoracionesegea.com para cualquier consulta.</p>
      </div>

    </div>
  `;
}

/**
 * Genera el subject del email
 */
export function generatePresupuestoApprovalSubject(orderNumber: string): string {
  return `✅ Presupuesto Listo para Aprobación - Pedido ${orderNumber} - EGEA`;
}
