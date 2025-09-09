/**
 * Enhanced Logging System
 * 
 * Production-ready logging utility that provides structured logging,
 * multiple output targets, and performance monitoring capabilities.
 * 
 * Features:
 * 1. Structured JSON logging with metadata
 * 2. Multiple log levels with proper filtering
 * 3. Component-based logging for better organization
 * 4. Performance timing utilities
 * 5. Error tracking and stack trace capture
 * 6. Client-side safe logging (no server logs)
 * 7. Development vs production mode handling
 */

// Log levels enum for type safety
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
  };
  sessionId: string;
  userId?: string;
}

// Performance timer interface
interface PerformanceTimer {
  start: number;
  component: string;
  operation: string;
}

/**
 * Enhanced Logger Class
 */
class EnhancedLogger {
  private currentLogLevel: LogLevel;
  private isDevelopment: boolean;
  private sessionId: string;
  private userId?: string;
  private performanceTimers: Map<string, PerformanceTimer> = new Map();
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.currentLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    this.sessionId = this.generateSessionId();
    
    // Initialize user ID from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          this.userId = storedUserId;
        }
      } catch {
        // Ignore localStorage access errors
      }
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `session-${timestamp}-${random}`;
  }
  
  /**
   * Set user ID for logging context
   */
  setUserId(userId: string): void {
    this.userId = userId;
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('userId', userId);
      } catch {
        // Ignore localStorage access errors
      }
    }
  }
  
  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }
  
  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }
  
  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata: Record<string, unknown> = {},
    component: string = 'System',
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      component,
      message,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    // Add error information if provided
    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }
    
    // Add performance information if available
    if (typeof window !== 'undefined' && window.performance) {
      entry.performance = {
        memory: (window.performance as any).memory?.usedJSHeapSize
      };
    }
    
    return entry;
  }
  
  /**
   * Output log entry to appropriate targets
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(LogLevel[entry.level as keyof typeof LogLevel])) {
      return;
    }
    
    if (this.isDevelopment) {
      // Development: Use console with colors and formatting
      const color = this.getConsoleColor(entry.level);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      
      console.group(`%c[${timestamp}] ${entry.level} - ${entry.component}`, color);
      console.log(entry.message);
      
      if (entry.metadata) {
        console.log('Metadata:', entry.metadata);
      }
      
      if (entry.error) {
        console.error('Error:', entry.error);
      }
      
      if (entry.performance) {
        console.log('Performance:', entry.performance);
      }
      
      console.groupEnd();
    } else {
      // Production: Use structured JSON logging
      const logOutput = JSON.stringify(entry);
      
      switch (entry.level) {
        case 'ERROR':
          console.error(logOutput);
          break;
        case 'WARN':
          console.warn(logOutput);
          break;
        case 'INFO':
          console.info(logOutput);
          break;
        case 'DEBUG':
          console.debug(logOutput);
          break;
      }
    }
    
    // In production, you might want to send logs to an external service
    if (!this.isDevelopment) {
      this.sendToExternalService(entry);
    }
  }
  
  /**
   * Get console color for log level
   */
  private getConsoleColor(level: string): string {
    switch (level) {
      case 'ERROR':
        return 'color: #ff6b6b; font-weight: bold;';
      case 'WARN':
        return 'color: #ffa500; font-weight: bold;';
      case 'INFO':
        return 'color: #4ecdc4; font-weight: bold;';
      case 'DEBUG':
        return 'color: #95a5a6; font-weight: normal;';
      default:
        return 'color: #333; font-weight: normal;';
    }
  }
  
  /**
   * Send logs to external service (production)
   */
  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Examples: DataDog, Sentry, CloudWatch, etc.
    
    // For now, just store in browser for debugging if needed
    if (typeof window !== 'undefined') {
      try {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push(entry);
        
        // Keep only last 100 logs to prevent storage bloat
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('app_logs', JSON.stringify(logs));
      } catch {
        // Ignore localStorage errors in production
      }
    }
  }
  
  // ==================== Public Logging Methods ====================
  
  /**
   * Log error message
   */
  error(
    message: string,
    metadata: Record<string, unknown> = {},
    component: string = 'System',
    error?: Error
  ): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, component, error);
    this.output(entry);
  }
  
  /**
   * Log warning message
   */
  warn(
    message: string,
    metadata: Record<string, unknown> = {},
    component: string = 'System'
  ): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata, component);
    this.output(entry);
  }
  
  /**
   * Log info message
   */
  info(
    message: string,
    metadata: Record<string, unknown> = {},
    component: string = 'System'
  ): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata, component);
    this.output(entry);
  }
  
  /**
   * Log debug message
   */
  debug(
    message: string,
    metadata: Record<string, unknown> = {},
    component: string = 'System'
  ): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata, component);
    this.output(entry);
  }
  
  // ==================== Performance Monitoring ====================
  
  /**
   * Start performance timer
   */
  startTimer(operation: string, component: string = 'System'): string {
    const timerId = `${component}_${operation}_${Date.now()}`;
    
    this.performanceTimers.set(timerId, {
      start: performance.now(),
      component,
      operation
    });
    
    this.debug(`Started timer for ${operation}`, { timerId }, component);
    return timerId;
  }
  
  /**
   * End performance timer and log duration
   */
  endTimer(timerId: string): number | null {
    const timer = this.performanceTimers.get(timerId);
    if (!timer) {
      this.warn('Timer not found', { timerId });
      return null;
    }
    
    const duration = performance.now() - timer.start;
    this.performanceTimers.delete(timerId);
    
    const entry = this.createLogEntry(
      LogLevel.INFO,
      `Operation ${timer.operation} completed`,
      { operation: timer.operation },
      timer.component
    );
    
    entry.performance = { duration };
    this.output(entry);
    
    return duration;
  }
  
  /**
   * Time an async operation
   */
  async timeAsync<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string = 'System'
  ): Promise<T> {
    const timerId = this.startTimer(operationName, component);
    
    try {
      const result = await operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      this.error(
        `Operation ${operationName} failed`,
        { operationName },
        component,
        error as Error
      );
      throw error;
    }
  }
  
  /**
   * Time a synchronous operation
   */
  time<T>(
    operation: () => T,
    operationName: string,
    component: string = 'System'
  ): T {
    const timerId = this.startTimer(operationName, component);
    
    try {
      const result = operation();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      this.error(
        `Operation ${operationName} failed`,
        { operationName },
        component,
        error as Error
      );
      throw error;
    }
  }
  
  // ==================== Utility Methods ====================
  
  /**
   * Get stored logs (for debugging)
   */
  getStoredLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }
  
  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('app_logs');
    } catch {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Log system information
   */
  logSystemInfo(): void {
    if (typeof window === 'undefined') return;
    
    const systemInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: (window.performance as any).memory ? {
        used: (window.performance as any).memory.usedJSHeapSize,
        total: (window.performance as any).memory.totalJSHeapSize,
        limit: (window.performance as any).memory.jsHeapSizeLimit
      } : undefined
    };
    
    this.info('System information logged', systemInfo, 'SystemInfo');
  }
}

// Create and export singleton instance
export const log = new EnhancedLogger();

// Export types and enums
export type { LogEntry };
// LogLevel already exported above as enum

// Export logger class for advanced usage
export { EnhancedLogger };

// Auto-log system info in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Delay system info logging to avoid blocking initial load
  setTimeout(() => {
    log.logSystemInfo();
  }, 1000);
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    log.error(
      'Global error caught',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      'GlobalErrorHandler',
      event.error
    );
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    log.error(
      'Unhandled promise rejection',
      { reason: event.reason },
      'GlobalErrorHandler'
    );
  });
}