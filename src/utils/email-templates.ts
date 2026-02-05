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
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Presupuesto para Aprobacion</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td, p, h1, h2, h3, h4, span, a { font-family: Arial, sans-serif !important; }
          table { border-collapse: collapse; }
          td { padding: 0; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <!--[if mso]>
              <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <img src="${logoUrl}" alt="EGEA" height="50" style="height: 50px; margin: 0 auto 15px; display: block; border: 0;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">PRESUPUESTO PARA APROBACION</h1>
                    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Tu Presupuesto esta Listo</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Hemos preparado tu presupuesto detallado. Por favor, revisalo y confirmamos si deseas proceder con el pedido.</p>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #803746; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace, Courier, monospace;">${data.adminCode}</p>
                          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Conserva este numero para cualquier consulta y para realizar el pago</p>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Profesional</h3>
                      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCompany || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">CIF:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCIF || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Contacto:</p>
                            <p style="margin: 0; font-weight: bold;">${data.contactName || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                            <p style="margin: 0; font-weight: bold;">${data.phone || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion:</p>
                            <p style="margin: 0; font-weight: bold;">${data.deliveryAddress}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona:</p>
                            <p style="margin: 0; font-weight: bold;">${regionNames[data.deliveryRegion]}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
                            <p style="margin: 0; font-weight: bold;">${data.email}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-bottom: 25px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        Presupuesto adjunto en PDF con el detalle completo de medidas y especificaciones tecnicas.
                      </p>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <h4 style="color: #166534; margin: 0 0 10px 0;">Para aprobar este presupuesto</h4>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr><td style="padding-bottom: 8px; color: #374151;">1. <strong>Revisa</strong> el presupuesto adjunto en PDF</td></tr>
                            <tr><td style="padding-bottom: 8px; color: #374151;">2. <strong>Responde a este email</strong> confirmando tu aprobacion con el numero <strong>${data.adminCode}</strong></td></tr>
                            <tr><td style="padding-bottom: 8px; color: #374151;">3. <strong>Realiza el pago</strong> y adjunta el comprobante</td></tr>
                            <tr><td style="color: #374151;">4. <strong>Procesaremos tu pedido</strong> inmediatamente tras recibir el pago</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="16" cellspacing="0" style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #374151; font-size: 14px;">
                            <strong>Para solicitar los datos de pago:</strong> Escribe a <strong>pedidos@decoracionesegea.com</strong> indicando el numero de pedido <strong>${data.adminCode}</strong>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Importante:</strong> Este presupuesto tiene una validez de <strong>15 dias naturales</strong>. El pedido se procesara unicamente tras la confirmacion del pago.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: #ffffff; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Necesitas hacer alguna consulta?</p>
                    <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px;">Nuestro equipo esta disponible para ayudarte:</p>
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: bold;">Email: pedidos@decoracionesegea.com</p>
                      <p style="margin: 0; color: #fbbf24; font-weight: bold;">Telefono: +34 601 904 680</p>
                    </div>
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">Horario de atencion: Lunes a Viernes, 9:00-14:00h</p>
                    <hr style="border: 0; border-top: 1px solid #4b5563; margin: 15px 0;" />
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" height="24" style="height: 24px; margin: 10px auto; display: block; border: 0;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td>
              </tr>
              </table>
              <![endif]-->
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
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Inicio de Produccion</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td, p, h1, h2, h3, h4, span, a { font-family: Arial, sans-serif !important; }
          table { border-collapse: collapse; }
          td { padding: 0; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <!--[if mso]>
              <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <img src="${logoUrl}" alt="EGEA" height="50" style="height: 50px; margin: 0 auto 15px; display: block; border: 0;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">PEDIDO EN PRODUCCION</h1>
                    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Pago Recibido Correctamente</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Gracias, hemos recibido tu pago y tu pedido ya esta en proceso de produccion.</p>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #803746; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace, Courier, monospace;">${data.adminCode}</p>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Pedido</h3>
                      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCompany || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">CIF:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCIF || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Contacto:</p>
                            <p style="margin: 0; font-weight: bold;">${data.contactName || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                            <p style="margin: 0; font-weight: bold;">${data.phone || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
                            <p style="margin: 0; font-weight: bold;">${data.email || 'N/A'}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona:</p>
                            <p style="margin: 0; font-weight: bold;">${regionNames[data.deliveryRegion]}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion de Entrega:</p>
                            <p style="margin: 0; font-weight: bold;">${data.deliveryAddress}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Total:</p>
                            <p style="margin: 0; font-weight: bold;">${formatAmount(data.totalAmount)}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <h4 style="color: #166534; margin: 0 0 15px 0;">Estado de tu Pedido</h4>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr><td style="padding-bottom: 6px; color: #374151;">&bull; Pago confirmado</td></tr>
                            <tr><td style="padding-bottom: 6px; color: #374151;">&bull; Pedido en produccion</td></tr>
                            <tr><td style="color: #6b7280;">&bull; Pendiente de envio</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <h4 style="color: #374151; margin: 0 0 10px 0;">Plazo de Entrega Estimado</h4>
                          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #803746;">${deliveryDays[data.deliveryRegion]}</p>
                          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">El plazo comienza a contar desde hoy. Te notificaremos cuando el pedido este listo para envio.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <h4 style="color: #1e40af; margin: 0 0 10px 0;">Proximos Pasos</h4>
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr><td style="padding-bottom: 8px; color: #374151;">1. Nuestro equipo de produccion esta trabajando en tu pedido</td></tr>
                            <tr><td style="padding-bottom: 8px; color: #374151;">2. Recibiras una notificacion cuando este listo para envio</td></tr>
                            <tr><td style="padding-bottom: 8px; color: #374151;">3. Te enviaremos el numero de seguimiento</td></tr>
                            <tr><td style="color: #374151;">4. Podras consultar el estado en cualquier momento</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Nota:</strong> Los plazos son estimados y pueden variar segun la carga de trabajo. Te mantendremos informado.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: #ffffff; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Necesitas hacer alguna consulta?</p>
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: bold;">Email: pedidos@decoracionesegea.com</p>
                      <p style="margin: 0; color: #fbbf24; font-weight: bold;">Telefono: +34 601 904 680</p>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #4b5563; margin: 15px 0;" />
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" height="24" style="height: 24px; margin: 10px auto; display: block; border: 0;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td>
              </tr>
              </table>
              <![endif]-->
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
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tu pedido ha sido enviado</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td, p, h1, h2, h3, h4, span, a { font-family: Arial, sans-serif !important; }
          table { border-collapse: collapse; }
          td { padding: 0; }
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 24px 0;">
              <!--[if mso]>
              <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <tr>
                  <td bgcolor="#803746" style="background-color: #803746; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <img src="${logoUrl}" alt="EGEA" height="50" style="height: 50px; margin: 0 auto 15px; display: block; border: 0;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">TU PEDIDO VA EN CAMINO</h1>
                    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #803746; margin: 0 0 10px 0;">Pedido Despachado</h2>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">Excelentes noticias, tu pedido ha sido validado y ya ha salido de nuestras instalaciones. Gracias por confiar en EGEA.</p>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #803746; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace, Courier, monospace;">${data.adminCode}</p>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Pedido</h3>
                      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Razon Social:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCompany || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">CIF:</p>
                            <p style="margin: 0; font-weight: bold;">${data.customerCIF || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Contacto:</p>
                            <p style="margin: 0; font-weight: bold;">${data.contactName || data.customerName}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Telefono:</p>
                            <p style="margin: 0; font-weight: bold;">${data.phone || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Email:</p>
                            <p style="margin: 0; font-weight: bold;">${data.email || 'N/A'}</p>
                          </td>
                          <td width="50%" valign="top" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona de Entrega:</p>
                            <p style="margin: 0; font-weight: bold;">${regionNames[data.deliveryRegion]}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-bottom: 15px;">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion de Destino:</p>
                            <p style="margin: 0; font-weight: bold;">${data.deliveryAddress}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2">
                            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Total:</p>
                            <p style="margin: 0; font-weight: bold;">${formatAmount(data.totalAmount)}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="20" cellspacing="0" style="background-color: #f9f2f3; border: 1px solid #803746; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <h4 style="color: #803746; margin: 0 0 10px 0;">Seguimiento del Envio</h4>
                          <p style="margin: 0; color: #374151; font-size: 14px;">
                            Tu pedido esta siendo gestionado por nuestra agencia. En 24-48h recibiras un SMS o email con el enlace de seguimiento.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" border="0" cellpadding="15" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 25px;">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>Recomendacion:</strong> Al recibir el paquete, verifica que el embalaje este bien. Si hay daños, hazlo constar en el albaran.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align: center;">
                      <p style="color: #6b7280; font-size: 14px;">
                        Gracias por confiar en EGEA para tus proyectos.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#374151" style="background-color: #374151; color: #ffffff; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="margin: 0 0 15px 0; color: #fbbf24; font-weight: bold;">Email: pedidos@decoracionesegea.com</p>
                    <p style="margin: 0; color: #fbbf24; font-weight: bold;">Telefono: +34 601 904 680</p>
                    <hr style="border: 0; border-top: 1px solid #4b5563; margin: 15px 0;" />
                    <img src="${embeddedLogoColorUrl}" alt="EGEA" height="24" style="height: 24px; margin: 10px auto; display: block; border: 0;" />
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td>
              </tr>
              </table>
              <![endif]-->
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
