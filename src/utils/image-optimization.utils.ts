/**
 * Image Optimization Utilities
 *
 * Provides utilities for optimizing images, implementing lazy loading,
 * and managing image caching strategies for better performance.
 */

import { log } from '@/lib/logger';

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  lazy: boolean;
}

/**
 * Default optimization settings
 */
export const DEFAULT_IMAGE_CONFIG: ImageOptimizationConfig = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'webp',
  lazy: true,
};

/**
 * Optimize image dimensions while maintaining aspect ratio
 */
export function optimizeImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = DEFAULT_IMAGE_CONFIG.maxWidth,
  maxHeight: number = DEFAULT_IMAGE_CONFIG.maxHeight
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let newWidth = originalWidth;
  let newHeight = originalHeight;

  // Scale down if width exceeds max
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  // Scale down if height exceeds max
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

/**
 * Generate responsive image sources
 */
export function generateResponsiveSources(
  src: string,
  config: Partial<ImageOptimizationConfig> = {}
): { src: string; srcSet: string; sizes: string } {
  const finalConfig = { ...DEFAULT_IMAGE_CONFIG, ...config };

  // Generate multiple sizes for responsive images
  const sizes = [320, 640, 1024, 1920];
  const srcSet = sizes
    .map(size => `${src}?w=${size}&q=${finalConfig.quality * 100}&f=${finalConfig.format} ${size}w`)
    .join(', ');

  const sizesAttr = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return {
    src: `${src}?w=640&q=${finalConfig.quality * 100}&f=${finalConfig.format}`,
    srcSet,
    sizes: sizesAttr,
  };
}

/**
 * Lazy load images with intersection observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Map<Element, string> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );
  }

  /**
   * Add image to lazy loading queue
   */
  addImage(img: HTMLImageElement, src: string): void {
    if (!this.observer) {
      // Fallback: load immediately
      img.src = src;
      return;
    }

    // Store original src
    this.images.set(img, src);

    // Set placeholder or data-src
    img.dataset.src = src;
    img.classList.add('lazy-loading');

    // Start observing
    this.observer.observe(img);
  }

  /**
   * Load image when it comes into view
   */
  private loadImage(img: HTMLImageElement): void {
    const src = this.images.get(img);
    if (!src) return;

    // Create new image to preload
    const newImg = new Image();

    newImg.onload = () => {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');

      // Remove from tracking
      this.images.delete(img);
      this.observer?.unobserve(img);

      log.info('Image lazy loaded successfully', { src }, 'LazyImageLoader');
    };

    newImg.onerror = () => {
      log.error('Failed to lazy load image', { src }, 'LazyImageLoader');
      // Remove from tracking on error
      this.images.delete(img);
      this.observer?.unobserve(img);
    };

    newImg.src = src;
  }

  /**
   * Disconnect observer and clean up
   */
  destroy(): void {
    this.observer?.disconnect();
    this.images.clear();
  }
}

/**
 * Preload critical images
 */
export function preloadCriticalImages(sources: string[]): void {
  if (typeof window === 'undefined') return;

  sources.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });

  log.info('Critical images preloaded', { count: sources.length }, 'ImageOptimization');
}

/**
 * Image caching utilities
 */
export class ImageCache {
  private static readonly CACHE_NAME = 'fibrefield-images-v1';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Cache image blob
   */
  static async cacheImage(url: string, blob: Blob): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = new Response(blob);
      await cache.put(url, response);
    } catch (error) {
      log.warn('Failed to cache image', { url, error }, 'ImageCache');
    }
  }

  /**
   * Get cached image
   */
  static async getCachedImage(url: string): Promise<Response | null> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      return response || null;
    } catch (error) {
      log.warn('Failed to get cached image', { url, error }, 'ImageCache');
      return null;
    }
  }

  /**
   * Clean up old cache entries
   */
  static async cleanup(): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();

      if (keys.length > 100) {
        // Remove oldest entries
        const entriesToDelete = keys.slice(0, keys.length - 100);
        await Promise.all(
          entriesToDelete.map(key => cache.delete(key))
        );

        log.info('Cleaned up old image cache entries', {
          deleted: entriesToDelete.length,
          remaining: keys.length - entriesToDelete.length
        }, 'ImageCache');
      }
    } catch (error) {
      log.warn('Failed to cleanup image cache', { error }, 'ImageCache');
    }
  }
}

/**
 * Compress image using Canvas API
 */
export async function compressImage(
  file: File,
  config: Partial<ImageOptimizationConfig> = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const finalConfig = { ...DEFAULT_IMAGE_CONFIG, ...config };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate optimal dimensions
        const { width, height } = optimizeImageDimensions(
          img.width,
          img.height,
          finalConfig.maxWidth,
          finalConfig.maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${finalConfig.format}`,
          finalConfig.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Export singleton lazy loader instance
export const lazyImageLoader = new LazyImageLoader();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    lazyImageLoader.destroy();
  });
}