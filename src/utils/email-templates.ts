// Plantilla de email para presupuesto de pedido
const embeddedLogoUrl = 'data:image/png;base64,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';
const embeddedLogoColorUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ4AAABQCAYAAADoZ8y/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE8GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDIgNzkuYTZhNjM5NiwgMjAyNC8wMy8xMi0wNzo0ODoyMyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjExIChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjUtMDUtMjNUMTI6MTQ6MTQrMDI6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI1LTA1LTIzVDEyOjU4OjM4KzAyOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI1LTA1LTIzVDEyOjU4OjM4KzAyOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3OTE3ZTkzZS02NTNiLTc0NGQtOGQ1NC0xZDY1ZGNjNDVlOTYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzkxN2U5M2UtNjUzYi03NDRkLThkNTQtMWQ2NWRjYzQ1ZTk2IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6NzkxN2U5M2UtNjUzYi03NDRkLThkNTQtMWQ2NWRjYzQ1ZTk2Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo3OTE3ZTkzZS02NTNiLTc0NGQtOGQ1NC0xZDY1ZGNjNDVlOTYiIHN0RXZ0OndoZW49IjIwMjUtMDUtMjNUMTI6MTQ6MTQrMDI6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNS4xMSAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Cv9mewAADadJREFUeJztnc114zgSx/+AfLcysDYCayNoUeq7tRFYE8FoImh1BKOOYOQIVn03SXne6+O+oSNYOoF9UgBi7UFFNUwBBEBSX2P+TjY/gBJQ+CBQVRBEhJaWUyPPLUDLx0ScW4BrI47jgfJvGgRBeiZRrppW8RyI47hLRHMAYwC3hdsvQohZEASrU8t1zTSueHEc9wF0AeDclVHonXLWQRAkHmn0iWgFIMmybP758+clX1sAuM+fI6JfRqPRooKMPQA94LzlpZbVKeSopXhxHPezLBsLIQYA+jjsDXJeiCghotXnz5+XdfIskaXLsoxZljvl9it2lXtbuJZkWbY0yZQrHRHNRqPRXL0XhuFcCPGres2mfHEc9wrldWd41CpbHZ6fn8dCiIEQog/gU8mjGwAJESUAEinlMgiCdRMyeCseV/BUCDHBz4J7IaKFlHKVz3m4kAdCiBneF/AbPztv4kfEcdwjohkOh8GDIVBRTieZoihKiGg1Go2mmjwTHDa0jRCiV/xdYRhOuLzySn4jopmUMsl7X0U29TkA2BDRvG55aeptQ0QLIlp1Op01gBTAGkA/y7IeN45HTVLfiWhZpXdX8VK8MAxnQogpfhb4Jsuyia1V6noHAG9Zlk3rtGiNPADchr0oihY4LNg3IcQkCIIVK8tMCNEvVngURQmUYdaUdxzHAx6S75T7vxV7T83vmggh/ihc3uh6Xheen5/HUsp5LgcRfXVRZG5gS+h/676sfOUBHBWPh5wl3vcSGyHEwHW+ZKhoENG3Yo/iIE+X5TkYJojo62g0mjnKtDKlIYSYENFcM8TqlOLdu1LKOSvcQ+Ge8zywJJ8XIcTYtfcrNnoXxVfhsl7B3NC86w9wWMcLw3BCRH+hMB/hH5+4ZjQcDicA3orXhRC/slI6oRSEbm7y5qp0nPfEcP0LgDsppU6uniXNfBguKt1Xn+GJn33S3PpERKs4jru2NKIoWhRGmjffHjMIgjUPuxvdfd/6yylVPBZc1+q+V+lisyybGm49ugpvaX1zH3l4Pvpqup9l2UxzeW1J9hGHHw1eDSKH56I67m3KZxhhUl8ZgJ3yWcrWuf5yjIpnGhoBgOdV3vB87qDXYx7DMJyVvc/3tUoHAFLKla9MPCRqEUL8WlyS4V5Q2/pL8pj5ygXsG8Z3w+17k+zPz89j6OuuW0UOAOA5YhmPYRhOndPTXeQEtEoH4LXOaj3PzbQIIb4Y1t4Qx3GPh0ATG5+hP0dKWfpOsXKVocfUgA7kqvMFWFZeAB6KlR3HcdcwRQCAe1P52uA5pXF0AHY9tMsUANAoXhzHAyHE76YXynoIF3ioLLs/N1yfWZJOqsjjMGW4C8NwUngnEUL0iegXIvpmeX9ZRa4cWy9erOwsy8Ywr6dW7n353VJZANyWTKfe8U7xlK9F8wsVhjOVTqdje/++WNFcsKYeOCetKhMsQycvSr8jCIL1aDRaCCF6Ze86VFYpPLqU9a63amM1fTApfOLdpSqsbQ845A+goHg8mTa2FlQczlS4y7ZV9Ez9f7vdDmzpElFaQ6zEcv9BN4TwsPVw8LRC3YbKpJb7j4p8PVti3Ct6w1/rNu5cFHuveDyHKi7yFnHJ2AVbOnfqXITnVOemX7zgMO3YNGG94tJrZlk2qZuPDd7hsJJl2cD2zF7xXMZ+R413IXXIa5L/zXuKZ6VYmDwdMO215iRHEucAZYhLT5WnCZf6ksDeQsI2hwIcxngXHIfFQRN5HQvHJaW0ibwch+t7ZYvLRlpLIDs92wMScB/zG+zxXLjjBnFx8BzGuJ6YU3Pe6c12u+07rDO+SSmXp5HIjATcv0Rcx/im2G63/VPm58op5lNVyA0aSra43nz2eWvQtz1ww0so1tZ7DniusERDQ3xN1vkfF/Kxc0AuVxAECZulTfBztyJt0p7OQtnKCADgZrvdDqQ8rc8PESVCuFtk8fOlyxbHJt/h8GmoDS2lVIIVbH6u/G3Ic3wxCiG6js/1AeAEc5Ku5f5G2eHoH1WSD8KNq+JJKdHpdOY/fvxY1810u932iAjb7bb0uXxyHgRBEkXRG0qWL2oOf7YebJn/wVbVTone3Nw0Ul4AsN1usd1uYfGDbiSvU3ADR4sFIgIRJVmWpQ3k2wPQtX0lq6ZERDQrM8CEwye8Dl6CKH1GCDGvknaD5ZWTENHadNPBggTA3lemD6DHW369wiMpN/pUSpkew/nnxvVB7qEW5/KEGo1GiyiKJjA7p9zFcdz1nTw79GBPhW3Crmva5yyvImz+PgYwJqJbzW9+xU6xU2Bn0ApgQET9KIpuAXzPsiz1mZuX4ax4lwCboycwfDXxeuTCM81Bye1NcaH4EnZRfMh9R1Di0SaEmJY1EO4hJ67Lbi5cleIFQZCyA80KGuXjglm4psdfqGPD7dynZO0v6Y4sy3pV361LmV+KwhO7JJTCPf40juMlEcVNyHd1sVPYFm4A/QLpJx9DR7Yd0/WeRkcmTzOnnsezjcHOWSnKle61qiV5E1yd4jFpicHo0sUsh4cgnUXzq4/33KWhRD4oXcTl4XV9EqE03GC3YVzWMi6G3CmZiKZCiJSIfgOwLsxhboloFYbhVGdyrjg2F5Xujf1WD94psK75M44Km2rZdg7ezv3Rc0NEjX2pHJPn5+cxES2EEAnvN66U2wv1qw3ArRDijyiKZgBWypdan4gGQgi1Yrw846WUyaXGFLQ5Q+U4WrAclRsp5YqIypxozk7u8VbmjMwebEvg/ToV8PNLNI8BgnrrU0mFd06C65ytrjl+E9wEQbCKosjpYa7M1TEFKsJKNxZC/HM4HCYu7/D8zOlZX4IgWEdR9AqHngU13Al9YZdG6+Y8AHQ6nfSowjiQf1yYfDeLdI8khxYeOh6JaHZJk33XHuOUa34+eV1CWUrAa8zvHk2SAoofrXfYhWNT4rd6Ni7VVMuEBPbWH1bv+FO24NwHpK4f7zHgHqPUuZnpH1eS60UC+9gYC4fne0eVhnH0oz0rjnFabl096xvgVPk0wn4BWUo5g73XuztFQare6DaH6XPByy8uYSz6x5Vk7997kVbkJvaK5xARCICbc3Ud4jjuFpYFHmt4vh8Vl01zFx/TutQJS3Eu3m2Zsf1b6dyFF2mPhm7lnXcinAPCnApeByxdEdCFv2gSDtrziYi+ur5TNXBPk43owDqFTY9WMK8JjZvKvAg7ST9gF5BQnePdCiG+ENEXtkROG8x2nRukElHS6XRSn+UGxVTLZHZ0H8dxr4mIAkV4X3bGUUgXrhsBVddjm2xE2r0yh3CrlULrl8GF+BcRfeNC/KvJ9D3ZYLfVtnTxzHLYmHcyP/JBCQC+Gg6HY8AcWlfD9/wdz/z+C+DFJY/hcFi6D6u1ThmNRgsi+sX0kk8cNBeUinsajUZT7nFc488dg1sAD0KIP4gotQ3zFlMtoOF5qlJeqTrPLIkgWuTB11me55EvTZlSGc2iLMp319T6mhJjean2Che0fpcP82lZxEub8hHRoonGqhjCrouGqjzn1MVN1skz88izD+CRTakSNNAplNrjcfy3APrCfKgSdDknjuNuFEVL7lW+FocidlxxWaQ9FbdCiN+jKDIqkKJ8OrnvyTFoto44jrthGM7ZAnhpso7mHsml3B6LcQhN+dLukJmv+dzXJfii7Xe6HjfQJU34fOaFzztIXdNie7gpdq3WeFaCq1HjGXg1VXwOn8FhMjQt9XFQ4fLK/SZARFo7w+I7Dmbv4PSMFj/cuy5RGI2A8hjZnK722IcwDKdSyoWXIR4LMoP+Bz1lWbbsdDqrYoUop/yMsVNe59NqLId8nBPrB4Ny6pCugg5OQ1Lf4wA8Y/w8sejJ12o4DMMpK6zVMJSIlsSn/GRZ1ue6+mRSIMCqfBsimvJ2bI/TnAG4E0IElSxAuSeaQn+a4f7H4HCJ4ZULe+Frdu3gLXVysiz7l8vJRNzwplyZJvnz6Yxanm9KeaVVZDQcAebCizKnM+JZL09id8xXWtv0mI0uB9g5B/eL9/OvL13LrpHfmPPqovzwvmPzNhwOez4v5L0/duU1KN7nJZK8vJL6IrrnjZ0vS35YXuqTduFgvj1kOIDv8m3ePYmVY0tdYBfEHrA3LerDQ5GPsab5EfjbKV4TOE4lcl6Gw+Hg2DL93WgVr4QSj7R32FbpWw5pC8yBWHMit4oQIji3u+C1ca0O3SfFsjDcUoFW8RxRYgsfKB9be7R40CqeB6x8Y3ie3thySKt4ngRBcBC3xXYCZMshreJVwDXyZouZVvEqwCvw35X/V2cT5kppFa8iSjSBl3PKca20ileRfF53CZGXrpFW8Sqy3W7/BwBE9J9zy3KNtIpXgTAMJ1LKPwFASvknO9m0eNBumXnC1r0pDn1/jZa8LYe0PZ4/fegjzo9PLskV0yqeP6nuou2Uopb3tIrnCVvmFl0IN+2ish+t4lWAnXx+5P8TUWWfiI9K+3FRAY4w/2/1mhDiH63yudP2eBXQDauXelz8pdIqnifsfX/gytfkAXMfgVbxPClZNrnzDYTzkWkVz5+B6cYpon/+XWgVzwP22TW6O15byP9z0iqeH93C/0X/i/5pxLh+WsXzQDOUrgv/X1pgoYulVTw/1pprL1Ccf6oGtv5oXNXR8OeGT7pUo2D1hsNhjwPW9AFACJGeS75r4v+puxFCwFpaAAAAAABJRU5ErkJggg==';

interface OrderEmailData {
  adminCode: string;           // Número de Pedido (admin_code)
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

/**
 * Genera el HTML del email de envío de presupuesto para aprobación
 */
export function generatePresupuestoApprovalEmail(data: OrderEmailData): string {
  const regionNames = {
    PENINSULA: 'Península',
    BALEARES: 'Baleares',
    CANARIAS: 'Canarias'
  };

  const normalizedLogoUrl = data.logoUrl?.replace(
    'logo-placeholder.jpg.png',
    'logo-placeholder.png'
  );
  const logoUrl = normalizedLogoUrl || embeddedLogoUrl; // Fallback

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #803746, #a05252); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="${logoUrl}" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
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
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.adminCode}</p>
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

        <!-- Presupuesto Adjunto -->
        <div style="margin-bottom: 25px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📄 <strong>Presupuesto adjunto en PDF</strong> con el detalle completo de medidas y especificaciones técnicas.
          </p>
        </div>


        <!-- Approval Instructions -->
        <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #166534; margin: 0 0 10px 0;">✅ Para Aprobar este Presupuesto</h4>
          <ol style="margin: 0; padding-left: 20px; color: #374151;">
            <li style="margin-bottom: 8px;"><strong>Revisa</strong> el presupuesto adjunto en PDF con todos los detalles y medidas</li>
            <li style="margin-bottom: 8px;"><strong>Responde a este email</strong> confirmando tu aprobación e indicando el número de pedido <strong>${data.adminCode}</strong></li>
            <li style="margin-bottom: 8px;"><strong>Realiza el pago</strong> y adjunta el comprobante de pago al correo de respuesta con la referencia <strong>${data.adminCode}</strong></li>
            <li>Una vez recibido el comprobante de pago, <strong>procesaremos tu pedido inmediatamente</strong></li>
          </ol>
        </div>

        <!-- Payment Instructions -->
        <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
          <p style="margin: 0; color: #374151; font-size: 14px;">
            💳 <strong>Para solicitar los datos de pago:</strong> Escribe a <strong>pedidos@decoracionesegea.com</strong> indicando el número de pedido <strong>${data.adminCode}</strong>. Te enviaremos los datos bancarios.
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
        <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">¿Necesitas hacer alguna consulta?</p>
        <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 14px;">Nuestro equipo está disponible para ayudarte:</p>
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #fbbf24; font-weight: 500;">Email: pedidos@decoracionesegea.com</p>
          <p style="margin: 0; color: #fbbf24; font-weight: 500;">Teléfono: +34 601 904 680</p>
        </div>
        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">Horario de atención: Lunes a Viernes, 9:00-14:00h</p>
        <hr style="border: 1px solid #4b5563; margin: 15px 0;">
        <img src="${embeddedLogoColorUrl}" alt="EGEA" style="height: 24px; margin: 10px auto; display: block;" />
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">(c) 2026 DECORACIONES EGEA S.L. - Todos los derechos reservados</p>
      </div>

    </div>
  `;
}


/**
 * Genera el subject del email
 */
export function generatePresupuestoApprovalSubject(adminCode: string): string {
  return `✅ Presupuesto Listo para Aprobación - Pedido ${adminCode} - EGEA`;
}

/**
 * Genera el HTML del email de inicio de producción
 */
export function generateProduccionInicioEmail(data: OrderEmailData): string {
  const regionNames = {
    PENINSULA: 'Península',
    BALEARES: 'Baleares',
    CANARIAS: 'Canarias'
  };

  // Plazos de entrega según región
  const deliveryDays = {
    BALEARES: '7 días laborables',
    PENINSULA: '10 días laborables',
    CANARIAS: '15 días laborables'
  };

  const normalizedLogoUrl = data.logoUrl?.replace(
    'logo-placeholder.jpg.png',
    'logo-placeholder.png'
  );
  const logoUrl = normalizedLogoUrl || embeddedLogoUrl; // Fallback

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #803746, #a05252); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="${logoUrl}" alt="EGEA" style="height: 50px; margin: 0 auto 15px; display: block;" />
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold;">PEDIDO EN PRODUCCION</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px;">Sistemas de cortinas para profesionales</p>
      </div>

      <!-- Main Content -->
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #803746; margin: 0 0 10px 0;">Pago Recibido Correctamente</h2>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">Gracias, hemos recibido tu pago y tu pedido ya esta en proceso de produccion.</p>
        </div>

        <!-- Reference Number -->
        <div style="background: #f9fafb; border: 2px solid #803746; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Numero de Pedido:</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #803746; font-family: monospace;">${data.adminCode}</p>
        </div>

        <!-- Professional Data -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">Datos del Pedido</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Cliente:</p>
              <p style="margin: 0; font-weight: 500;">${data.customerCompany || data.customerName}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Contacto:</p>
              <p style="margin: 0; font-weight: 500;">${data.contactName || data.customerName}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Direccion de Entrega:</p>
              <p style="margin: 0; font-weight: 500;">${data.deliveryAddress}</p>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Zona:</p>
              <p style="margin: 0; font-weight: 500;">${regionNames[data.deliveryRegion]}</p>
            </div>
          </div>
        </div>

        <!-- Estado de Produccion -->
        <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #166534; margin: 0 0 15px 0;">Estado de tu Pedido</h4>
          <p style="margin: 0 0 6px 0; color: #374151;">? Pago confirmado</p>
          <p style="margin: 0 0 6px 0; color: #374151;">? Pedido en produccion</p>
          <p style="margin: 0; color: #6b7280;">? Pendiente de envio</p>
        </div>

        <!-- Plazo de Entrega -->
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h4 style="color: #374151; margin: 0 0 10px 0;">Plazo de Entrega Estimado</h4>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #803746;">${deliveryDays[data.deliveryRegion]}</p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">El plazo comienza a contar desde hoy. Te notificaremos cuando el pedido este listo para envio.</p>
        </div>

        <!-- Proximos Pasos -->
        <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #1e40af; margin: 0 0 10px 0;">Proximos Pasos</h4>
          <ol style="margin: 0; padding-left: 20px; color: #374151;">
            <li style="margin-bottom: 8px;">Nuestro equipo de produccion esta trabajando en tu pedido</li>
            <li style="margin-bottom: 8px;">Recibiras una notificacion cuando el pedido este listo para envio</li>
            <li style="margin-bottom: 8px;">Te enviaremos el numero de seguimiento una vez despachado</li>
            <li>Podras consultar el estado en cualquier momento escribiendonos</li>
          </ol>
        </div>

        <!-- Important Notice -->
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Nota:</strong> Los plazos de entrega son estimados y pueden variar segun la carga de trabajo y disponibilidad de materiales. Te mantendremos informado de cualquier cambio.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #374151; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
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
      </div>

    </div>
  `;
}

/**
 * Genera el subject del email de inicio de producción
 */
export function generateProduccionInicioSubject(adminCode: string): string {
  return `Pedido ${adminCode} en Producción - EGEA`;
}
