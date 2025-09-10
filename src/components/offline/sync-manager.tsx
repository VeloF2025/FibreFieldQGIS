// Sync Manager component for background queue management
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSync, useOfflineQueue } from '@/hooks/useOfflineData';
import { useOfflineStore } from '@/stores/offline-store';
import { setupAutoSync } from '@/utils/offline-utils';
import { cn } from '@/lib/utils';

interface SyncManagerProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncManager({ className, showDetails = false }: SyncManagerProps) {
  const { isOnline, inProgress, pendingCount, lastSync, error, triggerSync } = useSync();
  const { failedItems, retryFailedItem, clearCompletedItems } = useOfflineQueue();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncCleanup, setSyncCleanup] = useState<(() => void) | null>(null);

  // Initialize auto-sync
  useEffect(() => {
    if (autoSyncEnabled) {
      const cleanup = setupAutoSync(5); // 5-minute intervals
      setSyncCleanup(() => cleanup);
      
      return cleanup;
    } else {
      if (syncCleanup) {
        syncCleanup();
        setSyncCleanup(null);
      }
    }
  }, [autoSyncEnabled]);

  const handleManualSync = async () => {
    try {
      await triggerSync();
    } catch (error) {
      log.error('Manual sync failed:', {}, "Syncmanager", error);
    }
  };

  const handleRetryFailed = async () => {
    for (const item of failedItems) {
      if (item.id) {
        await retryFailedItem(item.id);
      }
    }
  };

  const getStatusIcon = () => {
    if (inProgress) return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    if (!isOnline) return <WifiOff className="h-5 w-5 text-red-500" />;
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (pendingCount > 0) return <Clock className="h-5 w-5 text-orange-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (inProgress) return 'Syncing...';
    if (!isOnline) return 'Offline';
    if (error) return 'Sync Error';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Up to date';
  };

  const getStatusColor = () => {
    if (inProgress) return 'text-blue-600';
    if (!isOnline) return 'text-red-600';
    if (error) return 'text-red-600';
    if (pendingCount > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <CardDescription className={cn('text-xs', getStatusColor())}>
                {getStatusText()}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={inProgress}
              >
                <RefreshCw className={cn('h-4 w-4', inProgress && 'animate-spin')} />
                Sync
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Last Sync */}
          {lastSync && (
            <div className="text-sm text-gray-600">
              Last sync: {lastSync.toLocaleString()}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Sync Error</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Pending Items */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <Clock className="h-4 w-4 text-orange-500" />
              <div className="text-sm text-orange-700">
                <p className="font-medium">{pendingCount} items waiting to sync</p>
                <p className="text-xs mt-1">
                  Will sync automatically when online
                </p>
              </div>
            </div>
          )}

          {/* Failed Items */}
          {failedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="flex-1 text-sm text-red-700">
                  <p className="font-medium">{failedItems.length} failed items</p>
                  <p className="text-xs mt-1">
                    These items failed to sync and need attention
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryFailed}
                  disabled={!isOnline}
                  className="text-xs"
                >
                  Retry All
                </Button>
              </div>
            </div>
          )}

          {/* Auto-sync Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">
              <p className="font-medium">Auto-sync</p>
              <p className="text-xs text-gray-500">
                Sync every 5 minutes when online
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Management Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={clearCompletedItems}
              className="text-xs"
            >
              Clear Completed
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Compact version for status bar
export function SyncStatusIndicator({ className }: { className?: string }) {
  const { isOnline, inProgress, pendingCount, error } = useSync();

  const getIndicatorColor = () => {
    if (error) return 'bg-red-500';
    if (!isOnline) return 'bg-gray-500';
    if (inProgress) return 'bg-blue-500';
    if (pendingCount > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full', getIndicatorColor())} />
      {inProgress && <RefreshCw className="h-3 w-3 animate-spin" />}
      {pendingCount > 0 && !inProgress && (
        <span className="text-xs text-orange-600">{pendingCount}</span>
      )}
    </div>
  );
}