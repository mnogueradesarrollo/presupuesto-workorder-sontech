// src/lib/print.ts
export async function printElement(el: HTMLElement, opts?: { pageStyle?: string; title?: string }) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(n => (n as HTMLElement).outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${opts?.title ?? document.title}</title>
        ${opts?.pageStyle ? `<style>${opts.pageStyle}</style>` : ''}
        ${styles}
      </head>
      <body>${el.outerHTML}</body>
    </html>
  `);
  doc.close();

  // Esperar imágenes para evitar que salgan en blanco
  await new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images);
    if (imgs.length === 0) return resolve();
    let pending = imgs.length;
    imgs.forEach(img => {
      const done = () => { if (--pending === 0) resolve(); };
      if ((img as HTMLImageElement).complete) done();
      else { img.onload = done; img.onerror = done; }
    });
    // fallback por si algún evento no dispara
    setTimeout(resolve, 800);
  });

  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
}
