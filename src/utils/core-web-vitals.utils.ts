/**
 * Core Web Vitals Optimization Utilities
 *
 * Provides utilities for monitoring and optimizing Core Web Vitals:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 */

import { log } from '@/lib/logger';

/**
 * Core Web Vitals thresholds
 */
export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

/**
 * Core Web Vitals metric data
 */
export interface CoreWebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
  value: number;
  timestamp: number;
  url: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  connectionType?: string;
}

/**
 * Performance observer for Core Web Vitals
 */
export class CoreWebVitalsObserver {
  private observers: PerformanceObserver[] = [];
  private metrics: CoreWebVitalsMetric[] = [];
  private maxMetrics: number = 100;

  /**
   * Start observing Core Web Vitals
   */
  startObserving(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      log.warn('PerformanceObserver not supported', {}, 'CoreWebVitalsObserver');
      return;
    }

    try {
      // Observe Largest Contentful Paint
      this.observeLCP();

      // Observe First Input Delay
      this.observeFID();

      // Observe Cumulative Layout Shift
      this.observeCLS();

      // Observe First Contentful Paint
      this.observeFCP();

      log.info('Core Web Vitals observation started', {}, 'CoreWebVitalsObserver');
    } catch (error) {
      log.error('Failed to start Core Web Vitals observation', { error }, 'CoreWebVitalsObserver');
    }
  }

  /**
   * Stop observing
   */
  stopObserving(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    log.info('Core Web Vitals observation stopped', {}, 'CoreWebVitalsObserver');
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.recordMetric({
            name: 'LCP',
            value: entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            deviceType: this.getDeviceType(),
            connectionType: this.getConnectionType(),
          });
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      log.warn('LCP observation failed', { error }, 'CoreWebVitalsObserver');
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const fidEntry = entry as any;
          this.recordMetric({
            name: 'FID',
            value: fidEntry.processingStart - entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            deviceType: this.getDeviceType(),
            connectionType: this.getConnectionType(),
          });
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      log.warn('FID observation failed', { error }, 'CoreWebVitalsObserver');
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }

        // Record CLS periodically or on significant changes
        if (clsValue > 0) {
          this.recordMetric({
            name: 'CLS',
            value: clsValue,
            timestamp: Date.now(),
            url: window.location.href,
            deviceType: this.getDeviceType(),
            connectionType: this.getConnectionType(),
          });
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      log.warn('CLS observation failed', { error }, 'CoreWebVitalsObserver');
    }
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.recordMetric({
            name: 'FCP',
            value: entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            deviceType: this.getDeviceType(),
            connectionType: this.getConnectionType(),
          });
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      log.warn('FCP observation failed', { error }, 'CoreWebVitalsObserver');
    }
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: CoreWebVitalsMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant performance issues
    const threshold = CORE_WEB_VITALS_THRESHOLDS[metric.name];
    if (threshold && metric.value > threshold.needsImprovement) {
      log.warn(`Poor ${metric.name} detected`, {
        value: metric.value,
        threshold: threshold.needsImprovement,
        url: metric.url
      }, 'CoreWebVitalsObserver');
    }

    // Dispatch custom event for real-time monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('core-web-vitals-metric', {
        detail: metric
      }));
    }
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get collected metrics
   */
  getMetrics(): CoreWebVitalsMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const summary = {
      LCP: { values: [] as number[], avg: 0, min: 0, max: 0 },
      FID: { values: [] as number[], avg: 0, min: 0, max: 0 },
      CLS: { values: [] as number[], avg: 0, min: 0, max: 0 },
      FCP: { values: [] as number[], avg: 0, min: 0, max: 0 },
      TTFB: { values: [] as number[], avg: 0, min: 0, max: 0 },
    };

    // Group metrics by type
    this.metrics.forEach(metric => {
      if (summary[metric.name]) {
        summary[metric.name].values.push(metric.value);
      }
    });

    // Calculate statistics
    Object.keys(summary).forEach(key => {
      const metric = summary[key as keyof typeof summary];
      if (metric.values.length > 0) {
        metric.avg = metric.values.reduce((a, b) => a + b, 0) / metric.values.length;
        metric.min = Math.min(...metric.values);
        metric.max = Math.max(...metric.values);
      }
    });

    return summary;
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Layout shift prevention utilities
 */
export class LayoutShiftPreventer {
  private static reservedSpace = new Map<string, { width: number; height: number }>();

  /**
   * Reserve space for an element to prevent layout shift
   */
  static reserveSpace(elementId: string, width: number, height: number): void {
    this.reservedSpace.set(elementId, { width, height });

    const element = document.getElementById(elementId);
    if (element) {
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.contain = 'layout style paint';
    }
  }

  /**
   * Remove reserved space
   */
  static removeReservedSpace(elementId: string): void {
    this.reservedSpace.delete(elementId);

    const element = document.getElementById(elementId);
    if (element) {
      element.style.width = '';
      element.style.height = '';
      element.style.contain = '';
    }
  }

  /**
   * Apply layout containment to prevent shifts
   */
  static applyLayoutContainment(selector: string): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      (element as HTMLElement).style.contain = 'layout style paint';
    });
  }

  /**
   * Optimize font loading to prevent layout shifts
   */
  static optimizeFontLoading(): void {
    // Create font face observer for web fonts
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      link.as = 'style';
      document.head.appendChild(link);

      // Add font-display: swap to CSS
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'Inter';
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Preload critical resources
   */
  static preloadCriticalResources(resources: Array<{ href: string; as: string; type?: string }>): void {
    if (typeof document === 'undefined') return;

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) {
        link.type = resource.type;
      }
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
}

/**
 * Resource loading optimizer
 */
export class ResourceLoaderOptimizer {
  /**
   * Load scripts with priority
   */
  static loadScript(src: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = priority === 'low';

      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

      document.head.appendChild(script);
    });
  }

  /**
   * Load styles with priority
   */
  static loadStyle(href: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;

      if (priority === 'high') {
        link.rel = 'preload';
        link.as = 'style';
        link.onload = () => {
          link.rel = 'stylesheet';
          resolve();
        };
      } else {
        link.onload = () => resolve();
      }

      link.onerror = () => reject(new Error(`Failed to load style: ${href}`));
      document.head.appendChild(link);
    });
  }

  /**
   * Defer non-critical resources
   */
  static deferNonCriticalResources(): void {
    if (typeof window === 'undefined') return;

    // Defer non-critical scripts
    const scripts = document.querySelectorAll('script[data-defer]');
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      newScript.src = (script as HTMLScriptElement).src;
      newScript.defer = true;
      document.body.appendChild(newScript);
      script.remove();
    });

    // Defer non-critical styles
    const styles = document.querySelectorAll('link[data-defer]');
    styles.forEach(style => {
      const newStyle = document.createElement('link');
      newStyle.rel = 'stylesheet';
      newStyle.href = (style as HTMLLinkElement).href;
      newStyle.media = 'print';
      newStyle.onload = () => {
        newStyle.media = 'all';
      };
      document.head.appendChild(newStyle);
      style.remove();
    });
  }

  /**
   * Optimize image loading
   */
  static optimizeImageLoading(): void {
    if (typeof window === 'undefined') return;

    // Add native lazy loading to images
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });

    // Add decoding async to images
    const allImages = document.querySelectorAll('img:not([decoding])');
    allImages.forEach(img => {
      img.setAttribute('decoding', 'async');
    });
  }
}

/**
 * Performance monitoring dashboard
 */
export class PerformanceDashboard {
  private metrics: CoreWebVitalsMetric[] = [];
  private observer: CoreWebVitalsObserver;

  constructor() {
    this.observer = new CoreWebVitalsObserver();
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    this.observer.startObserving();

    // Listen for metric events
    if (typeof window !== 'undefined') {
      window.addEventListener('core-web-vitals-metric', (event) => {
        const metric = (event as CustomEvent).detail;
        this.metrics.push(metric);
        this.updateDashboard();
      });
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.observer.stopObserving();
  }

  /**
   * Get performance score
   */
  getPerformanceScore(): number {
    const summary = this.observer.getMetricsSummary();
    let score = 100;

    // Deduct points for poor metrics
    if (summary.LCP.avg > CORE_WEB_VITALS_THRESHOLDS.LCP.needsImprovement) {
      score -= 30;
    } else if (summary.LCP.avg > CORE_WEB_VITALS_THRESHOLDS.LCP.good) {
      score -= 10;
    }

    if (summary.FID.avg > CORE_WEB_VITALS_THRESHOLDS.FID.needsImprovement) {
      score -= 30;
    } else if (summary.FID.avg > CORE_WEB_VITALS_THRESHOLDS.FID.good) {
      score -= 10;
    }

    if (summary.CLS.avg > CORE_WEB_VITALS_THRESHOLDS.CLS.needsImprovement) {
      score -= 30;
    } else if (summary.CLS.avg > CORE_WEB_VITALS_THRESHOLDS.CLS.good) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get recommendations for improvement
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.observer.getMetricsSummary();

    if (summary.LCP.avg > CORE_WEB_VITALS_THRESHOLDS.LCP.good) {
      recommendations.push('Optimize Largest Contentful Paint by improving server response times and resource loading');
    }

    if (summary.FID.avg > CORE_WEB_VITALS_THRESHOLDS.FID.good) {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }

    if (summary.CLS.avg > CORE_WEB_VITALS_THRESHOLDS.CLS.good) {
      recommendations.push('Fix Cumulative Layout Shift by reserving space for dynamic content');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Keep monitoring for any regressions.');
    }

    return recommendations;
  }

  /**
   * Update dashboard (would be implemented in UI)
   */
  private updateDashboard(): void {
    // This would update a UI dashboard component
    const score = this.getPerformanceScore();
    log.info('Performance score updated', { score }, 'PerformanceDashboard');
  }

  /**
   * Export metrics data
   */
  exportMetrics(): CoreWebVitalsMetric[] {
    return [...this.metrics];
  }
}

// Export singleton instances
export const coreWebVitalsObserver = new CoreWebVitalsObserver();
export const layoutShiftPreventer = LayoutShiftPreventer;
export const resourceLoaderOptimizer = ResourceLoaderOptimizer;
export const performanceDashboard = new PerformanceDashboard();

// Auto-start monitoring on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    coreWebVitalsObserver.startObserving();
    LayoutShiftPreventer.optimizeFontLoading();
    ResourceLoaderOptimizer.optimizeImageLoading();
    performanceDashboard.startMonitoring();
  });
}