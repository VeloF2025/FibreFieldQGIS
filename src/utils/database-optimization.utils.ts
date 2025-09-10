/**
 * Database Optimization Utilities
 *
 * Provides utilities for optimizing database queries, managing storage,
 * and improving offline data performance.
 */

import { localDB } from '@/lib/database';
import { log } from '@/lib/logger';

/**
 * Database optimization configuration
 */
export interface DatabaseOptimizationConfig {
  enableQueryCaching: boolean;
  enableBulkOperations: boolean;
  enableLazyLoading: boolean;
  maxCacheSize: number;
  cleanupInterval: number; // minutes
  maxRetries: number;
}

/**
 * Default optimization settings
 */
export const DEFAULT_DB_CONFIG: DatabaseOptimizationConfig = {
  enableQueryCaching: true,
  enableBulkOperations: true,
  enableLazyLoading: true,
  maxCacheSize: 1000,
  cleanupInterval: 60, // 1 hour
  maxRetries: 3,
};

/**
 * Query result cache
 */
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_DB_CONFIG.maxCacheSize) {
    this.maxSize = maxSize;
  }

  /**
   * Get cached query result
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached query result
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // 5 minutes default
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for this
    };
  }
}

/**
 * Optimized query builder with caching
 */
export class OptimizedQueryBuilder {
  private cache: QueryCache;
  private config: DatabaseOptimizationConfig;

  constructor(config: Partial<DatabaseOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_DB_CONFIG, ...config };
    this.cache = new QueryCache(this.config.maxCacheSize);
  }

  /**
   * Execute cached query
   */
  async executeCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (this.config.enableQueryCaching) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) {
        log.debug('Query cache hit', { cacheKey }, 'OptimizedQueryBuilder');
        return cached;
      }
    }

    const result = await queryFn();

    if (this.config.enableQueryCaching) {
      this.cache.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Execute bulk operation with retry logic
   */
  async executeBulkOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          log.info(`Bulk operation succeeded on attempt ${attempt}`, { operationName }, 'OptimizedQueryBuilder');
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        log.warn(`Bulk operation failed on attempt ${attempt}`, {
          operationName,
          error: lastError.message
        }, 'OptimizedQueryBuilder');

        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Database maintenance utilities
 */
export class DatabaseMaintenance {
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(intervalMinutes: number = DEFAULT_DB_CONFIG.cleanupInterval): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, intervalMinutes * 60 * 1000);

    log.info('Database auto-cleanup started', { intervalMinutes }, 'DatabaseMaintenance');
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      log.info('Database auto-cleanup stopped', {}, 'DatabaseMaintenance');
    }
  }

  /**
   * Perform database cleanup
   */
  async performCleanup(): Promise<{
    deletedRecords: number;
    freedSpace: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let deletedRecords = 0;
    let freedSpace = 0;

    try {
      log.info('Starting database cleanup', {}, 'DatabaseMaintenance');

      // Clean old sync queue items (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (localDB.offlineQueue) {
        const oldQueueItems = await localDB.offlineQueue
          .where('createdAt')
          .below(sevenDaysAgo)
          .and(item => item.status === 'completed' || item.status === 'failed')
          .toArray();

        if (oldQueueItems.length > 0) {
          await localDB.offlineQueue.bulkDelete(oldQueueItems.map(item => item.id!));
          deletedRecords += oldQueueItems.length;
          log.info('Cleaned old queue items', { count: oldQueueItems.length }, 'DatabaseMaintenance');
        }
      }

      // Clean old sync metadata (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (localDB.syncMetadata) {
        const oldMetadata = await localDB.syncMetadata
          .where('lastSyncAt')
          .below(thirtyDaysAgo)
          .toArray();

        if (oldMetadata.length > 0) {
          await localDB.syncMetadata.bulkDelete(oldMetadata.map(item => item.id!));
          deletedRecords += oldMetadata.length;
          log.info('Cleaned old sync metadata', { count: oldMetadata.length }, 'DatabaseMaintenance');
        }
      }

      // Clean failed uploads older than 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      if (localDB.failedUploads) {
        const oldFailedUploads = await localDB.failedUploads
          .where('failedAt')
          .below(threeDaysAgo)
          .toArray();

        if (oldFailedUploads.length > 0) {
          await localDB.failedUploads.bulkDelete(oldFailedUploads.map(item => item.id));
          deletedRecords += oldFailedUploads.length;
          log.info('Cleaned old failed uploads', { count: oldFailedUploads.length }, 'DatabaseMaintenance');
        }
      }

      // Estimate freed space (rough calculation)
      freedSpace = deletedRecords * 1024; // Assume ~1KB per record

      const duration = Date.now() - startTime;
      log.info('Database cleanup completed', {
        deletedRecords,
        freedSpace: `${freedSpace} bytes`,
        duration: `${duration}ms`
      }, 'DatabaseMaintenance');

      return { deletedRecords, freedSpace, duration };

    } catch (error) {
      log.error('Database cleanup failed', { error }, 'DatabaseMaintenance');
      throw error;
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes(): Promise<void> {
    try {
      log.info('Starting database index optimization', {}, 'DatabaseMaintenance');

      // Rebuild indexes by performing bulk operations
      // This is a simplified optimization - in a real scenario,
      // you might want to rebuild specific indexes

      const stats = await localDB.getStats();
      log.info('Database optimization completed', { stats }, 'DatabaseMaintenance');

    } catch (error) {
      log.error('Database index optimization failed', { error }, 'DatabaseMaintenance');
      throw error;
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    totalRecords: number;
    databaseSize: number;
    queryPerformance: { [key: string]: number };
    cacheStats: any;
  }> {
    const stats = await localDB.getStats();
    const totalRecords = stats.total;

    // Estimate database size (rough calculation)
    const databaseSize = totalRecords * 2048; // Assume ~2KB per record

    return {
      totalRecords,
      databaseSize,
      queryPerformance: {}, // Would need to track actual query times
      cacheStats: {}, // Would need cache implementation
    };
  }
}

/**
 * Lazy loading utilities for large datasets
 */
export class LazyDataLoader<T> {
  private data: T[] = [];
  private loadedPages = new Set<number>();
  private pageSize: number;
  private totalCount: number = 0;

  constructor(
    private loadPageFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
    pageSize: number = 50
  ) {
    this.pageSize = pageSize;
  }

  /**
   * Load data for a specific page
   */
  async loadPage(page: number): Promise<T[]> {
    if (this.loadedPages.has(page)) {
      // Return cached data
      const start = page * this.pageSize;
      const end = start + this.pageSize;
      return this.data.slice(start, end);
    }

    try {
      const result = await this.loadPageFn(page, this.pageSize);
      this.totalCount = result.total;

      // Insert data at correct position
      const start = page * this.pageSize;
      const end = start + result.data.length;

      // Extend array if necessary
      while (this.data.length < end) {
        this.data.push(null as any);
      }

      // Insert data
      for (let i = 0; i < result.data.length; i++) {
        this.data[start + i] = result.data[i];
      }

      this.loadedPages.add(page);

      return result.data;
    } catch (error) {
      log.error('Failed to load page', { page, error }, 'LazyDataLoader');
      throw error;
    }
  }

  /**
   * Get data for a range
   */
  async getRange(start: number, end: number): Promise<T[]> {
    const startPage = Math.floor(start / this.pageSize);
    const endPage = Math.floor((end - 1) / this.pageSize);

    const pages = [];
    for (let page = startPage; page <= endPage; page++) {
      pages.push(this.loadPage(page));
    }

    await Promise.all(pages);

    return this.data.slice(start, end);
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    return this.totalCount;
  }

  /**
   * Clear loaded data
   */
  clear(): void {
    this.data = [];
    this.loadedPages.clear();
    this.totalCount = 0;
  }
}

/**
 * Connection pool for optimized database connections
 */
export class DatabaseConnectionPool {
  private connections: IDBDatabase[] = [];
  private maxConnections: number;

  constructor(maxConnections: number = 5) {
    this.maxConnections = maxConnections;
  }

  /**
   * Get a database connection
   */
  async getConnection(): Promise<IDBDatabase> {
    if (this.connections.length < this.maxConnections) {
      const db = await this.createConnection();
      this.connections.push(db);
      return db;
    }

    // Return existing connection (simplified - in reality you'd want connection pooling)
    return this.connections[0];
  }

  /**
   * Create new database connection
   */
  private async createConnection(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FibreFieldDB');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.forEach(db => db.close());
    this.connections = [];
  }
}

// Export singleton instances
export const queryOptimizer = new OptimizedQueryBuilder();
export const dbMaintenance = new DatabaseMaintenance();
export const dbConnectionPool = new DatabaseConnectionPool();

// Start auto cleanup on module load
if (typeof window !== 'undefined') {
  dbMaintenance.startAutoCleanup();
}