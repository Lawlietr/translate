import browserImageCompression from "browser-image-compression";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const MAX_SIZE_MB = 0.5;
const MAX_DIMENSION = 3000;
const INITIAL_QUALITY = 0.8;

export async function compressImageForVision(file: File): Promise<File> {
  try {
    return await browserImageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      initialQuality: INITIAL_QUALITY,
      preserveExif: false,
    });
  } catch {
    return file;
  }
}
