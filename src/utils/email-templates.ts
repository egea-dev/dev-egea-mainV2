// Email templates for order communications

const embeddedLogoUrl = '/logo-placeholder.png';
const embeddedLogoColorUrl = '/logo-placeholder.png';

interface OrderEmailData {
  adminCode: string;           // Numero de Pedido (admin_code)
  customerName: string;
  customerCompany: string;
  customerCIF: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  deliveryRegion: 'PENINSULA' | 'BALEARES' | 'CANARIAS';
  totalAmount: number;
  logoUrl?: string;
}

const normalizeLogoUrl = (logoUrl?: string) => {
  if (!logoUrl) return embeddedLogoUrl;
  return logoUrl.replace('logo-placeholder.jpg.png', 'logo-placeholder.png');
};

const regionNames = {
  PENINSULA: 'Peninsular',
  BALEARES: 'Baleares',
  CANARIAS: 'Canarias'
} as const;

const formatAmount = (amount: number) => {
  if (!amount) return '0';
  try {
    return amount.toLocaleString('es-ES');
  } catch {
    return String(amount);
  }
};

/**
 * Genera el HTML del email de envio de presupuesto para aprobacion
 */
export function generatePresupuestoApprovalEmail(data: OrderEmailData): string {
  const logoUrl = normalizeLogoUrl(data.logoUrl);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Presupuesto para Aprobacion</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 0; border-radius: 10px 10px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#803746" style="background-color: #803746;">
                      <tr>
                        <td align="center" style="padding: 30px; text-align: center;">
                          <img src="${logoUrl}" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
                          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">PRESUPUESTO PARA APROBACION</h1>
                          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Tu Presupuesto esta Listo</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Hemos preparado tu presupuesto detallado. Por favor, revisalo y confirmamos si deseas proceder con el pedido.</p>
                    </div>

                    <div style="background: #f9fafb; border: 2px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.adminCode}</p>
                      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Conserva este numero para cualquier consulta y para realizar el pago</p>
                    </div>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Profesional</h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
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
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                          <p style="margin: 0; font-weight: 500;">${data.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion:</p>
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

                    <div style="margin-bottom: 25px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        Presupuesto adjunto en PDF con el detalle completo de medidas y especificaciones tecnicas.
                      </p>
                    </div>

                    <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="color: #166534; margin: 0 0 10px 0;">Para aprobar este presupuesto</h4>
                      <ol style="margin: 0; padding-left: 20px; color: #374151;">
                        <li style="margin-bottom: 8px;"><strong>Revisa</strong> el presupuesto adjunto en PDF con todos los detalles y medidas</li>
                        <li style="margin-bottom: 8px;"><strong>Responde a este email</strong> confirmando tu aprobacion e indicando el numero de pedido <strong>${data.adminCode}</strong></li>
                        <li style="margin-bottom: 8px;"><strong>Realiza el pago</strong> y adjunta el comprobante de pago al correo de respuesta con la referencia <strong>${data.adminCode}</strong></li>
                        <li>Una vez recibido el comprobante de pago, <strong>procesaremos tu pedido inmediatamente</strong></li>
                      </ol>
                    </div>

                    <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
                      <p style="margin: 0; color: #374151; font-size: 14px;">
                        <strong>Para solicitar los datos de pago:</strong> Escribe a <strong>pedidos@decoracionesegea.com</strong> indicando el numero de pedido <strong>${data.adminCode}</strong>. Te enviaremos los datos bancarios.
                      </p>
                    </div>

                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>Importante:</strong> Este presupuesto tiene una validez de <strong>15 dias naturales</strong>. Los precios pueden variar segun disponibilidad de materiales y condiciones del mercado. El pedido se procesara unicamente tras la confirmacion del pago.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Necesitas hacer alguna consulta?</p>
                    <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px;">Nuestro equipo esta disponible para ayudarte:</p>
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: 500;">Email: pedidos@decoracionesegea.com</p>
                      <p style="margin: 0; color: #fbbf24; font-weight: 500;">Telefono: +34 601 904 680</p>
                    </div>
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">Horario de atencion: Lunes a Viernes, 9:00-14:00h</p>
                    <hr style="border: 1px solid #4b5563; margin: 15px 0;">
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" style="height: 24px; margin: 10px auto; display: block;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Genera el subject del email
 */
export function generatePresupuestoApprovalSubject(adminCode: string): string {
  return `Presupuesto listo para aprobacion - Pedido ${adminCode} - EGEA`;
}

/**
 * Genera el HTML del email de inicio de produccion
 */
export function generateProduccionInicioEmail(data: OrderEmailData): string {
  const logoUrl = normalizeLogoUrl(data.logoUrl);
  const deliveryDays = {
    BALEARES: '7 dias laborables',
    PENINSULA: '10 dias laborables',
    CANARIAS: '20 dias laborables'
  } as const;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Inicio de Produccion</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 0; border-radius: 10px 10px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#803746" style="background-color: #803746;">
                      <tr>
                        <td align="center" style="padding: 30px; text-align: center;">
                          <img src="${logoUrl}" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
                          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">PEDIDO EN PRODUCCION</h1>
                          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Pago Recibido Correctamente</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Gracias, hemos recibido tu pago y tu pedido ya esta en proceso de produccion.</p>
                    </div>

                    <div style="background: #f9fafb; border: 2px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.adminCode}</p>
                    </div>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Pedido</h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
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
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                          <p style="margin: 0; font-weight: 500;">${data.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
                          <p style="margin: 0; font-weight: 500;">${data.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona:</p>
                          <p style="margin: 0; font-weight: 500;">${regionNames[data.deliveryRegion]}</p>
                        </div>
                        <div style="grid-column: span 2;">
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion de Entrega:</p>
                          <p style="margin: 0; font-weight: 500;">${data.deliveryAddress}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Total:</p>
                          <p style="margin: 0; font-weight: 500;">${formatAmount(data.totalAmount)}</p>
                        </div>
                      </div>
                    </div>

                    <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="color: #166534; margin: 0 0 15px 0;">Estado de tu Pedido</h4>
                      <p style="margin: 0 0 6px 0; color: #374151;">Pago confirmado</p>
                      <p style="margin: 0 0 6px 0; color: #374151;">Pedido en produccion</p>
                      <p style="margin: 0; color: #6b7280;">Pendiente de envio</p>
                    </div>

                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                      <h4 style="color: #374151; margin: 0 0 10px 0;">Plazo de Entrega Estimado</h4>
                      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #803746;">${deliveryDays[data.deliveryRegion]}</p>
                      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">El plazo comienza a contar desde hoy. Te notificaremos cuando el pedido este listo para envio.</p>
                    </div>

                    <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="color: #1e40af; margin: 0 0 10px 0;">Proximos Pasos</h4>
                      <ol style="margin: 0; padding-left: 20px; color: #374151;">
                        <li style="margin-bottom: 8px;">Nuestro equipo de produccion esta trabajando en tu pedido</li>
                        <li style="margin-bottom: 8px;">Recibiras una notificacion cuando el pedido este listo para envio</li>
                        <li style="margin-bottom: 8px;">Te enviaremos el numero de seguimiento una vez despachado</li>
                        <li>Podras consultar el estado en cualquier momento escribiendonos</li>
                      </ol>
                    </div>

                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>Nota:</strong> Los plazos de entrega son estimados y pueden variar segun la carga de trabajo y disponibilidad de materiales. Te mantendremos informado de cualquier cambio.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Necesitas hacer alguna consulta?</p>
                    <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px;">Nuestro equipo esta disponible para ayudarte:</p>
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: 500;">Email: pedidos@decoracionesegea.com</p>
                      <p style="margin: 0; color: #fbbf24; font-weight: 500;">Telefono: +34 601 904 680</p>
                    </div>
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">Horario de atencion: Lunes a Viernes, 9:00-14:00h</p>
                    <hr style="border: 1px solid #4b5563; margin: 15px 0;">
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" style="height: 24px; margin: 10px auto; display: block;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Genera el subject del email de inicio de produccion
 */
export function generateProduccionInicioSubject(adminCode: string): string {
  return `Pedido ${adminCode} en Produccion - EGEA`;
}

/**
 * Genera el HTML del email de notificacion de envio
 */
export function generateShippingEmail(data: OrderEmailData): string {
  const logoUrl = normalizeLogoUrl(data.logoUrl);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tu pedido ha sido enviado</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 0; border-radius: 10px 10px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#803746" style="background-color: #803746;">
                      <tr>
                        <td align="center" style="padding: 30px; text-align: center;">
                          <img src="${logoUrl}" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
                          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">TU PEDIDO VA EN CAMINO</h1>
                          <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Pedido Despachado</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Excelentes noticias, tu pedido ha sido validado y ya ha salido de nuestras instalaciones. Gracias por confiar en EGEA.</p>
                    </div>

                    <div style="background: #f9fafb; border: 2px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                      <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.adminCode}</p>
                    </div>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Pedido</h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
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
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                          <p style="margin: 0; font-weight: 500;">${data.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
                          <p style="margin: 0; font-weight: 500;">${data.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona de Entrega:</p>
                          <p style="margin: 0; font-weight: 500;">${regionNames[data.deliveryRegion]}</p>
                        </div>
                        <div style="grid-column: span 2;">
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion de Destino:</p>
                          <p style="margin: 0; font-weight: 500;">${data.deliveryAddress}</p>
                        </div>
                        <div>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Total:</p>
                          <p style="margin: 0; font-weight: 500;">${formatAmount(data.totalAmount)}</p>
                        </div>
                      </div>
                    </div>

                    <div style="background: #f9f2f3; border: 1px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                      <h4 style="color: #803746; margin: 0 0 10px 0;">Seguimiento del Envio</h4>
                      <p style="margin: 0; color: #374151; font-size: 14px;">
                        Tu pedido esta siendo gestionado por nuestra agencia de transporte habitual. En un plazo de 24-48h deberias recibir un SMS o email de la agencia con el enlace de seguimiento directo.
                      </p>
                    </div>

                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>Recomendacion:</strong> Al recibir el paquete, verifica que el embalaje este en perfectas condiciones. Si observas algun dano externo, hazlo constar en el albaran del transportista.
                      </p>
                    </div>

                    <div style="text-align: center;">
                      <p style="color: #6b7280; font-size: 14px;">
                        Gracias por confiar en EGEA para tus proyectos.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 15px 0; color: #fbbf24; font-weight: 500;">Email: pedidos@decoracionesegea.com</p>
                    <p style="margin: 0; color: #fbbf24; font-weight: 500;">Telefono: +34 601 904 680</p>
                    <hr style="border: 1px solid #4b5563; margin: 15px 0;">
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" style="height: 24px; margin: 10px auto; display: block;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Genera el subject del email de notificacion de envio
 */
export function generateShippingSubject(adminCode: string): string {
  return `Pedido ${adminCode} enviado correctamente - EGEA`;
}
