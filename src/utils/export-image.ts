import { toBlob } from "html-to-image";

export async function captureElementAsBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
  if (!blob) throw new Error("No se pudo generar la imagen.");
  return blob;
}

export async function shareOrDownloadImage(blob: Blob, fileName: string, title: string) {
  const file = new File([blob], fileName, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], title });
    return "shared" as const;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded" as const;
}
