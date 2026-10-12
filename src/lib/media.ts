/** Utilitários de mídia do chat Kira — compressão e validação de anexos. */

export interface PendingAttachment {
  file: File;
  kind: "image" | "video";
  name: string;
  mimeType: string;
  previewUrl: string;
  /** Imagem comprimida (gerada no cliente para economizar tokens/custos). */
  compressed?: Blob;
}

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB antes da compressão
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB para vídeos
export const MAX_ATTACHMENTS = 4;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Redimensiona/comprime uma imagem no cliente (máx. 1024px, JPEG ~82%).
 * Isso reduz custos de tokens de imagem e o tamanho do upload.
 */
export async function compressImage(
  file: File,
  maxDim = 1024,
  quality = 0.82,
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não consegui abrir esta imagem."));
      el.src = objectUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // GIFs animados etc.: se a conversão falhar, mantém o original.
    return blob ?? file;
  } catch (error) {
    if (error instanceof Error) throw error;
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Valida um arquivo enviado e retorna o motivo de recusa, se houver. */
export function validateAttachment(file: File): string | null {
  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return `A imagem "${file.name}" é grande demais (máx. 12 MB).`;
    }
    return null;
  }
  if (isVideoFile(file)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return `O vídeo "${file.name}" é grande demais (máx. 30 MB).`;
    }
    return null;
  }
  return `O arquivo "${file.name}" não é uma imagem nem um vídeo.`;
}
