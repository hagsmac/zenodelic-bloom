function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to capture canvas blob."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  baseName = "mirroring-glass"
): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const filename = `${baseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({ title: "The Mirroring Glass", text: "Synthetic mandala capture", files: [file] });
    return;
  }
  downloadBlob(blob, filename);
}
