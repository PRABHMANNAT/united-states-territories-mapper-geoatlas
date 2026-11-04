export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function csv(rows: (string | number | undefined | null)[][]) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(",")).join("\r\n") + "\r\n";
}

export function downloadCsv(rows: (string | number | undefined | null)[][], name: string) {
  download(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }), name);
}

export async function exportSvg(markup: string, name: string, format: "svg" | "png", width: number, height: number) {
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  if (format === "svg") {
    download(blob, `${name}.svg`);
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    if (!png) throw new Error("PNG creation failed");
    download(png, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copyLink(url = window.location.href) {
  await navigator.clipboard.writeText(url);
}
