/**
 * Image compression and optimization utility
 * Resizes and compresses images before upload to reduce storage usage and improve page load times
 */

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0 to 1
  outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_PROFILE_OPTIONS: CompressionOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.85,
  outputType: 'image/webp',
};

const DEFAULT_GALLERY_OPTIONS: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.80,
  outputType: 'image/webp',
};

/**
 * Compress and resize an image file
 * @param file The original image file
 * @param type The type of image (profile or gallery) - determines compression settings
 * @returns A Promise resolving to the compressed image as a Blob
 */
export const compressImage = async (
  file: File,
  type: 'profile' | 'gallery'
): Promise<Blob> => {
  const options = type === 'profile' ? DEFAULT_PROFILE_OPTIONS : DEFAULT_GALLERY_OPTIONS;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not create canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > options.maxWidth || height > options.maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, options.maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, options.maxHeight);
          width = height * aspectRatio;
        }
      }
      
      // Round to integers
      width = Math.round(width);
      height = Math.round(height);
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        options.outputType,
        options.quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Create object URL for the file
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get the file extension for the output type
 */
export const getOutputExtension = (type: 'profile' | 'gallery'): string => {
  const options = type === 'profile' ? DEFAULT_PROFILE_OPTIONS : DEFAULT_GALLERY_OPTIONS;
  return options.outputType === 'image/webp' ? 'webp' : 'jpg';
};

/**
 * Format file size to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Calculate compression ratio
 */
export const getCompressionRatio = (originalSize: number, compressedSize: number): number => {
  return Math.round((1 - compressedSize / originalSize) * 100);
};
