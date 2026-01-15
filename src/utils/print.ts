export const printHtmlToIframe = (htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      cleanup();
      return;
    }

    const images = Array.from(doc.images);
    const imagePromises = images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        })
    );

    const fontsReady = doc.fonts ? doc.fonts.ready.catch(() => undefined) : Promise.resolve();

    Promise.all([fontsReady, ...imagePromises])
      .then(() => {
        // Small delay helps browsers finish layout before print on first run.
        setTimeout(() => {
          win.focus();
          win.print();
        }, 250);
      })
      .finally(() => cleanup());
  };

  iframe.srcdoc = htmlContent;
  document.body.appendChild(iframe);
};

export const printZplToNetworkPrinter = async (zplParams: {
  ip: string;
  zpl: string;
  port?: number;
}) => {
  const { ip, zpl, port = 80 } = zplParams;
  const url = `http://${ip}:${port}/pstprnt`;

  console.log(`Intentando imprimir en ${url} via POST (no-cors)`);

  if (window.location.protocol === 'https:') {
    alert("⚠️ AVISO: Estás en una web segura (HTTPS) intentando acceder a una impresora local insegura (HTTP). El navegador probablemente bloqueará esta solicitud. Intenta usar la app desde HTTP o configura un proxy seguro.");
  }

  try {
    // Intentamos un fetch con un timeout manual porque no-cors no siempre falla rápido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: zpl,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('ZPL enviado (o al menos intentado) a:', ip);
    return true;
  } catch (error: any) {
    console.error('Error detallado imprimiendo:', error);

    let msg = `Error al conectar con la impresora (${ip}).\n`;
    if (error.name === 'AbortError') {
      msg += "La conexión ha tardado demasiado (Timeout). Verifica que el móvil esté en la misma WiFi que la impresora.";
    } else if (error.message.includes('Failed to fetch')) {
      msg += "El navegador ha bloqueado la conexión o la IP es inalcanzable.\n";
      msg += "- Asegúrate de estar en la misma red WiFi.\n";
      msg += "- Si estás en HTTPS, el navegador bloquea contenido HTTP local.";
    } else {
      msg += error.message;
    }

    alert(msg); // Usamos alert nativo para que se vea seguro en el móvil
    throw error;
  }
};
