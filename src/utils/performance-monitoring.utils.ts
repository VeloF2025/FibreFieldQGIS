/**
 * Performance Monitoring and Alerting Utilities
 *
 * Provides comprehensive performance monitoring, alerting, and reporting
 * capabilities for the FibreField application.
 */

import { log } from '@/lib/logger';
import { performanceDashboard, CORE_WEB_VITALS_THRESHOLDS } from './core-web-vitals.utils';
import { queryOptimizer } from './database-optimization.utils';

/**
 * Performance alert configuration
 */
export interface PerformanceAlertConfig {
  enabled: boolean;
  thresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    bundleSize: number;
  };
  notificationChannels: ('console' | 'localStorage' | 'api')[];
  alertCooldown: number; // minutes
}

/**
 * Performance alert data
 */
export interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'core-web-vitals' | 'network' | 'memory' | 'bundle' | 'database';
  title: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  url: string;
  userAgent: string;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Performance report data
 */
export interface PerformanceReport {
  id: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    coreWebVitals: {
      lcp: { avg: number; p95: number; status: 'good' | 'needs-improvement' | 'poor' };
      fid: { avg: number; p95: number; status: 'good' | 'needs-improvement' | 'poor' };
      cls: { avg: number; p95: number; status: 'good' | 'needs-improvement' | 'poor' };
    };
    network: {
      averageResponseTime: number;
      errorRate: number;
      cacheHitRate: number;
    };
    memory: {
      averageUsage: number;
      peakUsage: number;
      garbageCollections: number;
    };
    database: {
      queryCount: number;
      averageQueryTime: number;
      cacheHitRate: number;
    };
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  overallScore: number;
}

/**
 * Performance monitoring service
 */
export class PerformanceMonitoringService {
  private alerts: PerformanceAlert[] = [];
  private reports: PerformanceReport[] = [];
  private config: PerformanceAlertConfig;
  private alertCooldowns = new Map<string, number>();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PerformanceAlertConfig> = {}) {
    this.config = {
      enabled: true,
      thresholds: {
        responseTime: 3000, // 3 seconds
        errorRate: 0.05, // 5%
        memoryUsage: 100 * 1024 * 1024, // 100MB
        bundleSize: 2 * 1024 * 1024, // 2MB
      },
      notificationChannels: ['console', 'localStorage'],
      alertCooldown: 5, // 5 minutes
      ...config,
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (!this.config.enabled) return;

    log.info('Starting performance monitoring', {}, 'PerformanceMonitoringService');

    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();

    // Monitor network requests
    this.monitorNetworkRequests();

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor database performance
    this.monitorDatabasePerformance();

    // Start periodic reporting
    this.startPeriodicReporting();

    // Set up error monitoring
    this.setupErrorMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    log.info('Performance monitoring stopped', {}, 'PerformanceMonitoringService');
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    // Listen for Core Web Vitals metrics
    if (typeof window !== 'undefined') {
      window.addEventListener('core-web-vitals-metric', (event) => {
        const metric = (event as CustomEvent).detail;

        // Check thresholds and create alerts
        const threshold = CORE_WEB_VITALS_THRESHOLDS[metric.name as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
        if (threshold && metric.value > threshold.needsImprovement) {
          this.createAlert({
            type: metric.value > threshold.needsImprovement ? 'error' : 'warning',
            category: 'core-web-vitals',
            title: `Poor ${metric.name} Detected`,
            message: `${metric.name} of ${metric.value.toFixed(2)} exceeds recommended threshold`,
            value: metric.value,
            threshold: threshold.needsImprovement,
            url: metric.url,
            userAgent: navigator.userAgent,
          });
        }
      });
    }
  }

  /**
   * Monitor network requests
   */
  private monitorNetworkRequests(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;

          // Monitor navigation timing
          if (navEntry.entryType === 'navigation') {
            const responseTime = navEntry.responseEnd - navEntry.requestStart;

            if (responseTime > this.config.thresholds.responseTime) {
              this.createAlert({
                type: 'warning',
                category: 'network',
                title: 'Slow Network Response',
                message: `Page load took ${responseTime.toFixed(0)}ms`,
                value: responseTime,
                threshold: this.config.thresholds.responseTime,
                url: window.location.href,
                userAgent: navigator.userAgent,
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      log.warn('Network monitoring failed', { error }, 'PerformanceMonitoringService');
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const checkMemoryUsage = () => {
      const memInfo = (performance as any).memory;

      if (memInfo.usedJSHeapSize > this.config.thresholds.memoryUsage) {
        this.createAlert({
          type: 'warning',
          category: 'memory',
          title: 'High Memory Usage',
          message: `JavaScript heap usage: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
          value: memInfo.usedJSHeapSize,
          threshold: this.config.thresholds.memoryUsage,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      }
    };

    // Check memory usage every 30 seconds
    setInterval(checkMemoryUsage, 30000);
  }

  /**
   * Monitor database performance
   */
  private monitorDatabasePerformance(): void {
    // Monitor query performance through our optimizer
    const originalExecute = queryOptimizer.executeCachedQuery;
    const self = this;

    // Monkey patch to monitor queries
    (queryOptimizer as any).executeCachedQuery = async function(
      cacheKey: string,
      queryFn: () => Promise<any>,
      ttl?: number
    ) {
      const startTime = Date.now();
      try {
        const result = await originalExecute.call(this, cacheKey, queryFn, ttl);
        const duration = Date.now() - startTime;

        // Alert on slow queries
        if (duration > 1000) { // 1 second
          self.createAlert({
            type: 'warning',
            category: 'database',
            title: 'Slow Database Query',
            message: `Query took ${duration}ms to execute`,
            value: duration,
            threshold: 1000,
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        self.createAlert({
          type: 'error',
          category: 'database',
          title: 'Database Query Failed',
          message: `Query failed after ${duration}ms`,
          value: duration,
          threshold: 0,
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        throw error;
      }
    };
  }

  /**
   * Setup error monitoring
   */
  private setupErrorMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor JavaScript errors
    window.addEventListener('error', (event) => {
      this.createAlert({
        type: 'error',
        category: 'core-web-vitals',
        title: 'JavaScript Error',
        message: `${event.message} at ${event.filename}:${event.lineno}`,
        value: 1,
        threshold: 0,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.createAlert({
        type: 'error',
        category: 'core-web-vitals',
        title: 'Unhandled Promise Rejection',
        message: `Promise rejected: ${event.reason}`,
        value: 1,
        threshold: 0,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alertId = `${alertData.category}-${alertData.title}-${Date.now()}`;

    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertId);
    if (lastAlert && Date.now() - lastAlert < this.config.alertCooldown * 60 * 1000) {
      return; // Still in cooldown
    }

    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);
    this.alertCooldowns.set(alertId, Date.now());

    // Send notifications
    this.sendNotifications(alert);

    log.warn('Performance alert created', {
      id: alert.id,
      type: alert.type,
      category: alert.category,
      title: alert.title,
      value: alert.value
    }, 'PerformanceMonitoringService');
  }

  /**
   * Send alert notifications
   */
  private sendNotifications(alert: PerformanceAlert): void {
    this.config.notificationChannels.forEach(channel => {
      switch (channel) {
        case 'console':
          console.warn(`🚨 Performance Alert: ${alert.title}`, alert);
          break;
        case 'localStorage':
          this.storeAlertLocally(alert);
          break;
        case 'api':
          this.sendAlertToAPI(alert);
          break;
      }
    });
  }

  /**
   * Store alert in localStorage
   */
  private storeAlertLocally(alert: PerformanceAlert): void {
    try {
      const alerts = JSON.parse(localStorage.getItem('performance-alerts') || '[]');
      alerts.push(alert);
      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts.splice(0, alerts.length - 100);
      }
      localStorage.setItem('performance-alerts', JSON.stringify(alerts));
    } catch (error) {
      log.warn('Failed to store alert locally', { error }, 'PerformanceMonitoringService');
    }
  }

  /**
   * Send alert to API (placeholder)
   */
  private sendAlertToAPI(alert: PerformanceAlert): void {
    // In a real implementation, this would send to a monitoring service
    log.info('Alert would be sent to API', { alert }, 'PerformanceMonitoringService');
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    // Generate report every hour
    this.monitoringInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const report: PerformanceReport = {
      id: `report-${Date.now()}`,
      timestamp: now,
      period: {
        start: oneHourAgo,
        end: now,
      },
      metrics: {
        coreWebVitals: {
          lcp: { avg: 0, p95: 0, status: 'good' },
          fid: { avg: 0, p95: 0, status: 'good' },
          cls: { avg: 0, p95: 0, status: 'good' },
        },
        network: {
          averageResponseTime: 0,
          errorRate: 0,
          cacheHitRate: 0,
        },
        memory: {
          averageUsage: 0,
          peakUsage: 0,
          garbageCollections: 0,
        },
        database: {
          queryCount: 0,
          averageQueryTime: 0,
          cacheHitRate: 0,
        },
      },
      alerts: this.alerts.filter(alert =>
        alert.timestamp >= oneHourAgo && alert.timestamp <= now
      ),
      recommendations: this.generateRecommendations(),
      overallScore: performanceDashboard.getPerformanceScore(),
    };

    // Calculate metrics from collected data
    const summary = (performanceDashboard as any).getMetricsSummary ? (performanceDashboard as any).getMetricsSummary() : {
      LCP: { avg: 0, min: 0, max: 0 },
      FID: { avg: 0, min: 0, max: 0 },
      CLS: { avg: 0, min: 0, max: 0 },
      FCP: { avg: 0, min: 0, max: 0 },
      TTFB: { avg: 0, min: 0, max: 0 },
    };
    report.metrics.coreWebVitals = {
      lcp: {
        avg: summary.LCP.avg,
        p95: summary.LCP.max, // Approximation
        status: this.getMetricStatus(summary.LCP.avg, CORE_WEB_VITALS_THRESHOLDS.LCP),
      },
      fid: {
        avg: summary.FID.avg,
        p95: summary.FID.max,
        status: this.getMetricStatus(summary.FID.avg, CORE_WEB_VITALS_THRESHOLDS.FID),
      },
      cls: {
        avg: summary.CLS.avg,
        p95: summary.CLS.max,
        status: this.getMetricStatus(summary.CLS.avg, CORE_WEB_VITALS_THRESHOLDS.CLS),
      },
    };

    this.reports.push(report);

    log.info('Performance report generated', {
      id: report.id,
      score: report.overallScore,
      alerts: report.alerts.length
    }, 'PerformanceMonitoringService');

    return report;
  }

  /**
   * Get metric status
   */
  private getMetricStatus(value: number, thresholds: { good: number; needsImprovement: number }): 'good' | 'needs-improvement' | 'poor' {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Generate recommendations based on current performance
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const score = performanceDashboard.getPerformanceScore();

    if (score < 50) {
      recommendations.push('Critical: Multiple performance issues detected. Immediate optimization required.');
    } else if (score < 80) {
      recommendations.push('Moderate: Performance needs improvement. Focus on Core Web Vitals.');
    }

    const existingRecommendations = performanceDashboard.getRecommendations();
    recommendations.push(...existingRecommendations);

    return recommendations;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      log.info('Alert resolved', { alertId }, 'PerformanceMonitoringService');
    }
  }

  /**
   * Get performance reports
   */
  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    alerts: PerformanceAlert[];
    reports: PerformanceReport[];
    config: PerformanceAlertConfig;
  } {
    return {
      alerts: [...this.alerts],
      reports: [...this.reports],
      config: { ...this.config },
    };
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Auto-start monitoring on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitoringService.startMonitoring();
  });
}