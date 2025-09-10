/**
 * Mobile Performance Optimization Utilities
 *
 * Provides mobile-specific performance optimizations for the FibreField PWA,
 * focusing on battery life, memory usage, and mobile network conditions.
 */

import { log } from '@/lib/logger';

/**
 * Mobile performance configuration
 */
export interface MobilePerformanceConfig {
  enableTouchOptimizations: boolean;
  enableBatteryOptimizations: boolean;
  enableNetworkOptimizations: boolean;
  enableMemoryOptimizations: boolean;
  targetBatteryLevel: number;
  maxConcurrentRequests: number;
  imageQuality: 'low' | 'medium' | 'high';
}

/**
 * Default mobile performance settings
 */
export const DEFAULT_MOBILE_CONFIG: MobilePerformanceConfig = {
  enableTouchOptimizations: true,
  enableBatteryOptimizations: true,
  enableNetworkOptimizations: true,
  enableMemoryOptimizations: true,
  targetBatteryLevel: 20, // 20%
  maxConcurrentRequests: 3,
  imageQuality: 'medium',
};

/**
 * Touch event optimization utilities
 */
export class TouchOptimizer {
  private static touchHandlers = new Map<HTMLElement, { handler: EventListener; options?: AddEventListenerOptions }>();

  /**
   * Optimize touch event handling
   */
  static optimizeTouchEvents(element: HTMLElement): void {
    // Remove existing passive listeners and re-add with optimizations
    const existingHandler = this.touchHandlers.get(element);
    if (existingHandler) {
      element.removeEventListener('touchstart', existingHandler.handler, existingHandler.options);
      element.removeEventListener('touchmove', existingHandler.handler, existingHandler.options);
      element.removeEventListener('touchend', existingHandler.handler, existingHandler.options);
    }

    // Add optimized touch event listeners
    const optimizedHandler = this.createOptimizedTouchHandler();

    const options: AddEventListenerOptions = {
      passive: true, // Improves scrolling performance
      capture: false,
    };

    element.addEventListener('touchstart', optimizedHandler, options);
    element.addEventListener('touchmove', optimizedHandler, options);
    element.addEventListener('touchend', optimizedHandler, options);

    this.touchHandlers.set(element, { handler: optimizedHandler, options });
  }

  /**
   * Create optimized touch handler
   */
  private static createOptimizedTouchHandler(): EventListener {
    let startTime = 0;
    let startX = 0;
    let startY = 0;

    return (event: Event) => {
      const touchEvent = event as TouchEvent;

      switch (event.type) {
        case 'touchstart':
          startTime = Date.now();
          if (touchEvent.touches.length > 0) {
            startX = touchEvent.touches[0].clientX;
            startY = touchEvent.touches[0].clientY;
          }
          break;

        case 'touchmove':
          // Prevent default only if it's a significant gesture
          if (this.isSignificantGesture(touchEvent, startX, startY)) {
            event.preventDefault();
          }
          break;

        case 'touchend':
          const duration = Date.now() - startTime;
          if (duration < 300 && !this.isSignificantGesture(touchEvent, startX, startY)) {
            // This was a tap, not a scroll
            this.handleTap(event.target as HTMLElement);
          }
          break;
      }
    };
  }

  /**
   * Check if gesture is significant (not just a tap)
   */
  private static isSignificantGesture(event: TouchEvent, startX: number, startY: number): boolean {
    if (event.touches.length === 0) return false;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);

    return deltaX > 10 || deltaY > 10; // 10px threshold
  }

  /**
   * Handle tap events
   */
  private static handleTap(element: HTMLElement): void {
    // Add visual feedback for taps
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);

    // Trigger click for accessibility
    element.click();
  }

  /**
   * Optimize scrolling performance
   */
  static optimizeScrolling(container: HTMLElement): void {
    // Use transform-based scrolling for better performance
    container.style.willChange = 'transform';
    container.style.transform = 'translateZ(0)'; // Force hardware acceleration

    // Optimize scroll event handling
    let ticking = false;
    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Handle scroll logic here
          this.handleScroll(container);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', optimizedScrollHandler, { passive: true });
  }

  /**
   * Handle scroll events
   */
  private static handleScroll(container: HTMLElement): void {
    // Implement scroll-based optimizations like lazy loading
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Trigger lazy loading when approaching bottom
    if (scrollTop + clientHeight > scrollHeight - 200) {
      this.loadMoreContent(container);
    }
  }

  /**
   * Load more content (placeholder for lazy loading)
   */
  private static loadMoreContent(container: HTMLElement): void {
    // Dispatch custom event for lazy loading
    const event = new CustomEvent('loadMoreContent', {
      detail: { container }
    });
    container.dispatchEvent(event);
  }
}

/**
 * Battery optimization utilities
 */
export class BatteryOptimizer {
  private static batteryManager: any = null;
  private static batteryLevel = 100;
  private static isCharging = true;

  /**
   * Initialize battery monitoring
   */
  static async initialize(): Promise<void> {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
      log.warn('Battery API not supported', {}, 'BatteryOptimizer');
      return;
    }

    try {
      this.batteryManager = await (navigator as any).getBattery();

      // Set initial values
      this.batteryLevel = this.batteryManager.level * 100;
      this.isCharging = this.batteryManager.charging;

      // Listen for battery changes
      this.batteryManager.addEventListener('levelchange', this.handleBatteryLevelChange.bind(this));
      this.batteryManager.addEventListener('chargingchange', this.handleChargingChange.bind(this));

      log.info('Battery monitoring initialized', {
        level: this.batteryLevel,
        charging: this.isCharging
      }, 'BatteryOptimizer');

    } catch (error) {
      log.error('Failed to initialize battery monitoring', { error }, 'BatteryOptimizer');
    }
  }

  /**
   * Handle battery level changes
   */
  private static handleBatteryLevelChange(): void {
    if (!this.batteryManager) return;

    const newLevel = this.batteryManager.level * 100;
    const oldLevel = this.batteryLevel;

    this.batteryLevel = newLevel;

    // Apply battery optimizations when level is low
    if (newLevel <= DEFAULT_MOBILE_CONFIG.targetBatteryLevel && oldLevel > DEFAULT_MOBILE_CONFIG.targetBatteryLevel) {
      this.applyBatteryOptimizations();
    }

    // Restore normal performance when charging or battery is sufficient
    if ((newLevel > DEFAULT_MOBILE_CONFIG.targetBatteryLevel + 10) || this.isCharging) {
      this.restoreNormalPerformance();
    }

    log.info('Battery level changed', {
      oldLevel,
      newLevel,
      charging: this.isCharging
    }, 'BatteryOptimizer');
  }

  /**
   * Handle charging status changes
   */
  private static handleChargingChange(): void {
    if (!this.batteryManager) return;

    this.isCharging = this.batteryManager.charging;

    if (this.isCharging) {
      this.restoreNormalPerformance();
    } else if (this.batteryLevel <= DEFAULT_MOBILE_CONFIG.targetBatteryLevel) {
      this.applyBatteryOptimizations();
    }

    log.info('Charging status changed', {
      charging: this.isCharging,
      level: this.batteryLevel
    }, 'BatteryOptimizer');
  }

  /**
   * Apply battery optimizations
   */
  private static applyBatteryOptimizations(): void {
    log.info('Applying battery optimizations', {}, 'BatteryOptimizer');

    // Reduce animation frame rates
    this.reduceAnimationFrameRate();

    // Disable non-essential features
    this.disableNonEssentialFeatures();

    // Reduce background sync frequency
    this.reduceBackgroundSync();

    // Optimize image loading
    this.optimizeImagesForBattery();

    // Dispatch event for other components to optimize
    window.dispatchEvent(new CustomEvent('batteryOptimizationEnabled'));
  }

  /**
   * Restore normal performance
   */
  private static restoreNormalPerformance(): void {
    log.info('Restoring normal performance', {}, 'BatteryOptimizer');

    // Restore animation frame rates
    this.restoreAnimationFrameRate();

    // Re-enable features
    this.enableFeatures();

    // Restore background sync
    this.restoreBackgroundSync();

    // Dispatch event for other components to restore
    window.dispatchEvent(new CustomEvent('batteryOptimizationDisabled'));
  }

  /**
   * Reduce animation frame rate
   */
  private static reduceAnimationFrameRate(): void {
    // Store original requestAnimationFrame
    const originalRAF = window.requestAnimationFrame;

    let lastFrameTime = 0;
    const targetFPS = 30; // Reduce to 30 FPS
    const frameInterval = 1000 / targetFPS;

    window.requestAnimationFrame = (callback) => {
      const currentTime = Date.now();

      if (currentTime - lastFrameTime >= frameInterval) {
        lastFrameTime = currentTime;
        return originalRAF(callback);
      } else {
        // Schedule for next available frame
        return originalRAF(callback);
      }
    };
  }

  /**
   * Restore animation frame rate
   */
  private static restoreAnimationFrameRate(): void {
    // Restore original requestAnimationFrame
    window.requestAnimationFrame = (window as any).originalRequestAnimationFrame || window.requestAnimationFrame;
  }

  /**
   * Disable non-essential features
   */
  private static disableNonEssentialFeatures(): void {
    // Disable expensive animations
    document.documentElement.style.setProperty('--animation-duration', '0s');

    // Reduce visual effects
    const elements = document.querySelectorAll('[data-battery-intensive]');
    elements.forEach(element => {
      (element as HTMLElement).style.display = 'none';
    });
  }

  /**
   * Enable features
   */
  private static enableFeatures(): void {
    // Restore animations
    document.documentElement.style.removeProperty('--animation-duration');

    // Restore visual effects
    const elements = document.querySelectorAll('[data-battery-intensive]');
    elements.forEach(element => {
      (element as HTMLElement).style.display = '';
    });
  }

  /**
   * Reduce background sync frequency
   */
  private static reduceBackgroundSync(): void {
    // Dispatch event to reduce sync frequency
    window.dispatchEvent(new CustomEvent('reduceBackgroundSync'));
  }

  /**
   * Restore background sync
   */
  private static restoreBackgroundSync(): void {
    // Dispatch event to restore sync frequency
    window.dispatchEvent(new CustomEvent('restoreBackgroundSync'));
  }

  /**
   * Optimize images for battery saving
   */
  private static optimizeImagesForBattery(): void {
    // Reduce image quality
    document.documentElement.style.setProperty('--image-quality', '0.7');

    // Disable auto-playing videos
    const videos = document.querySelectorAll('video[autoplay]');
    videos.forEach(video => {
      (video as HTMLVideoElement).pause();
    });
  }

  /**
   * Get current battery status
   */
  static getBatteryStatus(): { level: number; charging: boolean; optimized: boolean } {
    return {
      level: this.batteryLevel,
      charging: this.isCharging,
      optimized: this.batteryLevel <= DEFAULT_MOBILE_CONFIG.targetBatteryLevel && !this.isCharging,
    };
  }
}

/**
 * Network optimization utilities
 */
export class NetworkOptimizer {
  private static connection: any = null;
  private static concurrentRequests = 0;
  private static requestQueue: Array<() => Promise<any>> = [];

  /**
   * Initialize network monitoring
   */
  static async initialize(): Promise<void> {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      log.warn('Network Information API not supported', {}, 'NetworkOptimizer');
      return;
    }

    this.connection = (navigator as any).connection;

    // Listen for connection changes
    this.connection.addEventListener('change', this.handleConnectionChange.bind(this));

    log.info('Network monitoring initialized', {
      type: this.connection.effectiveType,
      downlink: this.connection.downlink,
      rtt: this.connection.rtt
    }, 'NetworkOptimizer');
  }

  /**
   * Handle connection changes
   */
  private static handleConnectionChange(): void {
    if (!this.connection) return;

    const connectionType = this.connection.effectiveType;
    const downlink = this.connection.downlink;

    log.info('Network connection changed', {
      type: connectionType,
      downlink,
      rtt: this.connection.rtt
    }, 'NetworkOptimizer');

    // Adjust request limits based on connection
    this.adjustRequestLimits(connectionType, downlink);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('networkChange', {
      detail: {
        type: connectionType,
        downlink,
        rtt: this.connection.rtt
      }
    }));
  }

  /**
   * Adjust request limits based on connection quality
   */
  private static adjustRequestLimits(connectionType: string, downlink: number): void {
    let maxConcurrent = DEFAULT_MOBILE_CONFIG.maxConcurrentRequests;

    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        maxConcurrent = 1;
        break;
      case '3g':
        maxConcurrent = 2;
        break;
      case '4g':
        maxConcurrent = 3;
        break;
      default:
        maxConcurrent = 5;
    }

    // Also consider downlink speed
    if (downlink < 1) {
      maxConcurrent = Math.max(1, maxConcurrent - 1);
    }

    this.maxConcurrentRequests = maxConcurrent;
    log.info('Request limits adjusted', { maxConcurrent }, 'NetworkOptimizer');
  }

  /**
   * Queue network request with concurrency control
   */
  static async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  private static async processQueue(): Promise<void> {
    if (this.concurrentRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
      return;
    }

    this.concurrentRequests++;
    const request = this.requestQueue.shift();

    if (request) {
      try {
        await request();
      } catch (error) {
        log.error('Queued request failed', { error }, 'NetworkOptimizer');
      } finally {
        this.concurrentRequests--;
        // Process next request
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Optimize resource loading based on network
   */
  static optimizeResourceLoading(): void {
    if (!this.connection) return;

    const connectionType = this.connection.effectiveType;

    // Adjust image quality based on connection
    let imageQuality = DEFAULT_MOBILE_CONFIG.imageQuality;

    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        imageQuality = 'low';
        break;
      case '3g':
        imageQuality = 'medium';
        break;
      default:
        imageQuality = 'high';
    }

    // Apply image quality
    document.documentElement.style.setProperty('--image-quality', imageQuality === 'low' ? '0.6' : imageQuality === 'medium' ? '0.8' : '1.0');

    log.info('Resource loading optimized', { connectionType, imageQuality }, 'NetworkOptimizer');
  }

  /**
   * Get current network status
   */
  static getNetworkStatus(): {
    type: string;
    downlink: number;
    rtt: number;
    optimized: boolean;
  } | null {
    if (!this.connection) return null;

    return {
      type: this.connection.effectiveType,
      downlink: this.connection.downlink,
      rtt: this.connection.rtt,
      optimized: this.connection.effectiveType === 'slow-2g' || this.connection.effectiveType === '2g',
    };
  }

  private static maxConcurrentRequests = DEFAULT_MOBILE_CONFIG.maxConcurrentRequests;
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static garbageCollectionInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize memory monitoring
   */
  static initialize(): void {
    // Monitor memory usage
    this.startMemoryMonitoring();

    // Set up garbage collection hints
    this.setupGarbageCollection();

    log.info('Memory optimization initialized', {}, 'MemoryOptimizer');
  }

  /**
   * Start memory monitoring
   */
  private static startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const checkMemoryUsage = () => {
      const memInfo = (performance as any).memory;
      const usedPercent = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100;

      if (usedPercent > 80) {
        log.warn('High memory usage detected', {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          percent: usedPercent
        }, 'MemoryOptimizer');

        // Trigger cleanup
        this.performCleanup();
      }
    };

    // Check every 30 seconds
    setInterval(checkMemoryUsage, 30000);
  }

  /**
   * Setup garbage collection hints
   */
  private static setupGarbageCollection(): void {
    // Suggest garbage collection every 5 minutes
    this.garbageCollectionInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
        log.info('Manual garbage collection triggered', {}, 'MemoryOptimizer');
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Perform memory cleanup
   */
  private static performCleanup(): void {
    // Clear unused caches
    this.clearUnusedCaches();

    // Remove unused DOM elements
    this.removeUnusedElements();

    // Clear event listeners
    this.clearEventListeners();

    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }

    log.info('Memory cleanup performed', {}, 'MemoryOptimizer');
  }

  /**
   * Clear unused caches
   */
  private static clearUnusedCaches(): void {
    // Clear image cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }

    // Clear localStorage items older than 24 hours
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.timestamp && now - item.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Remove unused DOM elements
   */
  private static removeUnusedElements(): void {
    // Remove elements that are not visible and not needed
    const elements = document.querySelectorAll('[data-temp], [data-unused]');
    elements.forEach(element => {
      element.remove();
    });
  }

  /**
   * Clear event listeners (simplified approach)
   */
  private static clearEventListeners(): void {
    // This is a simplified approach - in practice, you'd need to track listeners
    const elements = document.querySelectorAll('[data-has-listeners]');
    elements.forEach(element => {
      // Clone and replace to remove all listeners
      const clone = element.cloneNode(true);
      element.parentNode?.replaceChild(clone, element);
    });
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    used: number;
    total: number;
    percent: number;
    available: boolean;
  } | null {
    if (typeof window === 'undefined' || !('memory' in performance)) return null;

    const memInfo = (performance as any).memory;
    const usedPercent = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100;

    return {
      used: memInfo.usedJSHeapSize,
      total: memInfo.totalJSHeapSize,
      percent: usedPercent,
      available: true,
    };
  }

  /**
   * Cleanup on page unload
   */
  static cleanup(): void {
    if (this.garbageCollectionInterval) {
      clearInterval(this.garbageCollectionInterval);
    }
  }
}

/**
 * Mobile performance manager
 */
export class MobilePerformanceManager {
  private config: MobilePerformanceConfig;

  constructor(config: Partial<MobilePerformanceConfig> = {}) {
    this.config = { ...DEFAULT_MOBILE_CONFIG, ...config };
  }

  /**
   * Initialize all mobile optimizations
   */
  async initialize(): Promise<void> {
    log.info('Initializing mobile performance optimizations', {}, 'MobilePerformanceManager');

    if (this.config.enableTouchOptimizations) {
      this.initializeTouchOptimizations();
    }

    if (this.config.enableBatteryOptimizations) {
      await BatteryOptimizer.initialize();
    }

    if (this.config.enableNetworkOptimizations) {
      await NetworkOptimizer.initialize();
    }

    if (this.config.enableMemoryOptimizations) {
      MemoryOptimizer.initialize();
    }

    this.applyMobileOptimizations();
  }

  /**
   * Initialize touch optimizations
   */
  private initializeTouchOptimizations(): void {
    // Optimize touch events on key elements
    const touchElements = document.querySelectorAll('button, a, [role="button"], input, textarea');
    touchElements.forEach(element => {
      TouchOptimizer.optimizeTouchEvents(element as HTMLElement);
    });

    // Optimize scrolling containers
    const scrollContainers = document.querySelectorAll('[data-scroll-container]');
    scrollContainers.forEach(container => {
      TouchOptimizer.optimizeScrolling(container as HTMLElement);
    });

    log.info('Touch optimizations initialized', {}, 'MobilePerformanceManager');
  }

  /**
   * Apply mobile-specific optimizations
   */
  private applyMobileOptimizations(): void {
    // Add mobile-specific CSS
    this.addMobileCSS();

    // Optimize viewport
    this.optimizeViewport();

    // Setup passive event listeners
    this.setupPassiveListeners();

    log.info('Mobile optimizations applied', {}, 'MobilePerformanceManager');
  }

  /**
   * Add mobile-specific CSS
   */
  private addMobileCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Mobile performance optimizations */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      /* Re-enable selection for inputs */
      input, textarea, [contenteditable] {
        -webkit-user-select: text;
        -khtml-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }

      /* Optimize scrolling */
      .mobile-scroll {
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
      }

      /* Reduce motion for battery saving */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize viewport settings
   */
  private optimizeViewport(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  /**
   * Setup passive event listeners
   */
  private setupPassiveListeners(): void {
    // Add passive listeners to scrollable elements
    const scrollableElements = document.querySelectorAll('[data-scrollable]');
    scrollableElements.forEach(element => {
      element.addEventListener('scroll', () => {}, { passive: true });
      element.addEventListener('touchmove', () => {}, { passive: true });
    });
  }

  /**
   * Get mobile performance status
   */
  getStatus(): {
    battery: any;
    network: any;
    memory: any;
    touch: boolean;
  } {
    return {
      battery: BatteryOptimizer.getBatteryStatus(),
      network: NetworkOptimizer.getNetworkStatus(),
      memory: MemoryOptimizer.getMemoryStats(),
      touch: this.config.enableTouchOptimizations,
    };
  }
}

// Export singleton instance
export const mobilePerformanceManager = new MobilePerformanceManager();

// Auto-initialize on mobile devices
if (typeof window !== 'undefined') {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    window.addEventListener('load', () => {
      mobilePerformanceManager.initialize();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      MemoryOptimizer.cleanup();
    });
  }
}