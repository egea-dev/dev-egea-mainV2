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
        win.focus();
        win.print();
      })
      .finally(() => cleanup());
  };

  iframe.srcdoc = htmlContent;
  document.body.appendChild(iframe);
};
