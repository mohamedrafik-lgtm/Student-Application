// ضغط الصور قبل الرفع إلى حجم مستهدف مع الحفاظ على الأبعاد الكاملة قدر الإمكان
// - يقلّل الجودة تدريجياً حتى الوصول للحجم المطلوب
// - يصغّر الأبعاد فقط إذا لم تكفِ الجودة (أو تجاوزت حد iOS الآمن)

export const MAX_CANVAS_PIXELS = 16_000_000; // حد iOS Safari الآمن

export interface CompressImageOptions {
  /** الحجم الأقصى للملف بالكيلوبايت (افتراضي 1.5MB) */
  maxSizeMB?: number;
  /** أقصى طول/عرض بالبكسل (افتراضي 4096) */
  maxWidthOrHeight?: number;
  /** جودة البداية (افتراضي 0.85) */
  initialQuality?: number;
  /** أقل جودة مسموحة (افتراضي 0.5) */
  minQuality?: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));

export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const {
    maxSizeMB = 1.5,
    maxWidthOrHeight = 4096,
    initialQuality = 0.85,
    minQuality = 0.5,
  } = options;

  const targetBytes = maxSizeMB * 1024 * 1024;
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    let width = img.width;
    let height = img.height;

    // 1) احترام حد canvas الآمن في iOS
    const area = width * height;
    if (area > MAX_CANVAS_PIXELS) {
      const scale = Math.sqrt(MAX_CANVAS_PIXELS / area);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    // 2) حد أقصى اختياري للأبعاد
    const longest = Math.max(width, height);
    if (longest > maxWidthOrHeight) {
      const scale = maxWidthOrHeight / longest;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    let quality = initialQuality;
    let blob: Blob | null = null;

    canvas.width = width;
    canvas.height = height;

    // 3) حلقة: قلّل الجودة ثم الأبعاد حتى الوصول للحجم المستهدف
    for (let attempt = 0; attempt < 12; attempt += 1) {
      ctx.clearRect(0, 0, width, height);
      // خلفية بيضاء للصور الشفافة (PNG) عند التحويل إلى JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      blob = await canvasToBlob(canvas, quality);
      if (!blob) break;
      if (blob.size <= targetBytes) break;

      if (quality > minQuality) {
        quality = Math.max(minQuality, quality - 0.1);
      } else if (width > 800 || height > 800) {
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
        canvas.width = width;
        canvas.height = height;
        quality = initialQuality;
      } else {
        break;
      }
    }

    if (!blob) return file;

    const outputName = file.name.replace(/\.(png|webp|gif|bmp|heic|heif|avif)$/i, '.jpg');
    return new File([blob], outputName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('فشل ضغط الصورة، سيتم رفع الملف الأصلي:', error);
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
