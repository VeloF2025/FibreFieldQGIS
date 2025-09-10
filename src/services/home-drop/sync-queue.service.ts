import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import { liveQuery } from 'dexie';
import type {
  HomeDropCapture,
  HomeDropSyncQueueItem,
  HomeDropSyncStatus,
  HomeDropServiceConfig
} from '@/types/home-drop.types';
import { coreHomeDropService } from './core-home-drop.service';

/**
 * Home Drop Sync Queue Service
 * 
 * Manages background synchronization queue for offline-first functionality.
 * Handles batch processing, retry logic, and sync status management.
 * 
 * Line count target: <200 lines
 */
export class HomeDropSyncService {
  private get config(): HomeDropServiceConfig {
    return coreHomeDropService.config;
  }

  // Sync processing state
  private isSyncing = false;
  private syncAbortController: AbortController | null = null;

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    homeDropId: string,
    action: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    await coreHomeDropService.ensureDatabase();

    const queueItem: HomeDropSyncQueueItem = {
      id: `${homeDropId}_${action}_${Date.now()}`,
      homeDropId,
      action,
      data: data || {},
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastAttemptAt: null,
      errorMessage: null
    };

    await (db as any).homeDropSyncQueue.add(queueItem);
    log.info('✅ Added to sync queue', { homeDropId, action }, "HomeDropSyncService");
  }

  /**
   * Get all pending sync queue items
   */
  async getSyncQueue(): Promise<HomeDropSyncQueueItem[]> {
    await coreHomeDropService.ensureDatabase();
    return await (db as any).homeDropSyncQueue
      .where('status')
      .anyOf(['pending', 'retrying'])
      .sortBy('createdAt');
  }

  /**
   * Process sync queue with batch processing
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) {
      log.info('Sync already in progress', {}, "HomeDropSyncService");
      return;
    }

    this.isSyncing = true;
    this.syncAbortController = new AbortController();

    try {
      const queue = await this.getSyncQueue();
      if (queue.length === 0) {
        log.info('No items in sync queue', {}, "HomeDropSyncService");
        return;
      }

      // Process in batches
      const batches = this.chunkArray(queue, this.config.syncBatchSize);
      log.info(`Processing ${queue.length} items in ${batches.length} batches`, {}, "HomeDropSyncService");

      for (const batch of batches) {
        if (this.syncAbortController.signal.aborted) {
          log.info('Sync aborted', {}, "HomeDropSyncService");
          break;
        }

        await Promise.allSettled(batch.map(item => this.processSyncItem(item)));
        
        // Brief pause between batches to prevent overwhelming the server
        await this.sleep(1000);
      }

      log.info('✅ Sync queue processing completed', {}, "HomeDropSyncService");
    } catch (error) {
      log.error('❌ Sync queue processing failed:', {}, "HomeDropSyncService", error);
    } finally {
      this.isSyncing = false;
      this.syncAbortController = null;
    }
  }

  /**
   * Process individual sync queue item
   */
  private async processSyncItem(item: HomeDropSyncQueueItem): Promise<void> {
    try {
      // Update attempt counter
      await (db as any).homeDropSyncQueue.update(item.id, {
        attempts: item.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
        status: 'syncing'
      });

      // Simulate API call based on action
      switch (item.action) {
        case 'create':
          await this.syncCreateAction(item);
          break;
        case 'update':
          await this.syncUpdateAction(item);
          break;
        case 'delete':
          await this.syncDeleteAction(item);
          break;
        default:
          throw new Error(`Unknown sync action: ${item.action}`);
      }

      // Mark as completed
      await (db as any).homeDropSyncQueue.update(item.id, {
        status: 'completed',
        errorMessage: null
      });

      // Update home drop sync status
      await coreHomeDropService.updateHomeDropCapture(item.homeDropId, {
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString()
      });

      log.info('✅ Sync item processed successfully', { itemId: item.id, action: item.action }, "HomeDropSyncService");

    } catch (error: any) {
      const attempts = item.attempts + 1;
      const shouldRetry = attempts < this.config.maxSyncRetries;

      await (db as any).homeDropSyncQueue.update(item.id, {
        status: shouldRetry ? 'retrying' : 'failed',
        errorMessage: error.message || 'Unknown sync error',
        nextRetryAt: shouldRetry 
          ? new Date(Date.now() + this.config.syncRetryDelay).toISOString()
          : null
      });

      if (!shouldRetry) {
        // Update home drop with error status
        await coreHomeDropService.updateHomeDropCapture(item.homeDropId, {
          syncStatus: 'error',
          syncError: error.message || 'Sync failed after maximum retries'
        });
      }

      log.error(`❌ Sync item failed (attempt ${attempts}/${this.config.maxSyncRetries}):`, 
        { itemId: item.id, action: item.action }, "HomeDropSyncService", error);
    }
  }

  /**
   * Handle create action sync
   */
  private async syncCreateAction(item: HomeDropSyncQueueItem): Promise<void> {
    // TODO: Replace with actual API call
    const response = await fetch('/api/home-drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Handle update action sync
   */
  private async syncUpdateAction(item: HomeDropSyncQueueItem): Promise<void> {
    // TODO: Replace with actual API call
    const response = await fetch(`/api/home-drops/${item.homeDropId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Handle delete action sync
   */
  private async syncDeleteAction(item: HomeDropSyncQueueItem): Promise<void> {
    // TODO: Replace with actual API call
    const response = await fetch(`/api/home-drops/${item.homeDropId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Clear completed sync queue items
   */
  async clearCompletedSyncItems(): Promise<void> {
    await coreHomeDropService.ensureDatabase();
    const deleted = await (db as any).homeDropSyncQueue
      .where('status')
      .equals('completed')
      .delete();

    log.info(`✅ Cleared ${deleted} completed sync items`, {}, "HomeDropSyncService");
  }

  /**
   * Get sync queue statistics
   */
  async getSyncStatistics(): Promise<{
    pending: number;
    syncing: number;
    retrying: number;
    completed: number;
    failed: number;
    totalItems: number;
  }> {
    await coreHomeDropService.ensureDatabase();
    const items = await (db as any).homeDropSyncQueue.toArray();

    const stats = {
      pending: 0,
      syncing: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
      totalItems: items.length
    };

    for (const item of items) {
      stats[item.status as keyof typeof stats]++;
    }

    return stats;
  }

  /**
   * Watch sync queue changes with live query
   */
  watchSyncQueue() {
    return liveQuery(() => this.getSyncQueue());
  }

  /**
   * Stop current sync process
   */
  abortSync(): void {
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      log.info('Sync process aborted', {}, "HomeDropSyncService");
    }
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const homeDropSyncService = new HomeDropSyncService();