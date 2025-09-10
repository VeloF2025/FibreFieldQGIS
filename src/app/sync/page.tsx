'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Database,
  Upload,
  Download,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOfflineContext } from '@/components/providers/offline-provider';
import { localDB, initializeDatabase } from '@/lib/database';
import { offlineSyncService } from '@/services/offline-sync.service';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

interface SyncStats {
  installations: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
  };
  photos: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    totalSize: number; // in MB
  };
  queue: {
    total: number;
    processing: number;
    failed: number;
  };
}

export default function SyncStatusPage() {
  const router = useRouter();
  const { isInitialized } = useOfflineContext();
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState<SyncStats>({
    installations: { total: 0, synced: 0, pending: 0, failed: 0 },
    photos: { total: 0, synced: 0, pending: 0, failed: 0, totalSize: 0 },
    queue: { total: 0, processing: 0, failed: 0 }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync statistics
  const loadStats = async () => {
    try {
      setIsRefreshing(true);

      // Ensure database is initialized
      await initializeDatabase();

      // Get installations from pole installations table
      const installations = await localDB.poleInstallations.toArray();
      const installationStats = {
        total: installations.length,
        synced: installations.filter(i => !i.isOffline).length,
        pending: installations.filter(i => i.isOffline && i.syncAttempts === 0).length,
        failed: installations.filter(i => i.isOffline && i.syncAttempts > 0).length
      };

      // Get photos
      const photos = await localDB.photos.toArray();
      const photoStats = {
        total: photos.length,
        synced: photos.filter(p => !p.uploaded).length,
        pending: photos.filter(p => !p.uploaded && !p.localPath).length,
        failed: photos.filter(p => !p.uploaded && p.localPath).length,
        totalSize: photos.reduce((total, p) => total + (p.size || 0), 0) / (1024 * 1024) // Convert to MB
      };

      // Get sync queue from offline queue
      const queueItems = await localDB.offlineQueue.toArray();
      const queueStats = {
        total: queueItems.length,
        processing: queueItems.filter(q => q.status === 'processing').length,
        failed: queueItems.filter(q => q.status === 'failed').length
      };

      setStats({
        installations: installationStats,
        photos: photoStats,
        queue: queueStats
      });
    } catch (error) {
      log.error('Failed to load sync stats:', {}, "Page", error);
      
      // Set empty stats on error - no fake data
      const emptyStats = {
        installations: {
          total: 0,
          synced: 0,
          pending: 0,
          failed: 0
        },
        photos: {
          total: 0,
          synced: 0,
          pending: 0,
          failed: 0,
          totalSize: 0
        },
        queue: {
          total: 0,
          processing: 0,
          failed: 0
        }
      };
      
      setStats(emptyStats);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Force sync all pending items
  const forceSyncAll = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please connect to the internet.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Start sync and monitor progress
      await offlineSyncService.syncAll();
      
      // Simulate progress for demo (in real implementation, this would be reported by the sync service)
      for (let i = 0; i <= 100; i += 10) {
        setSyncProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Reload stats after sync
      await loadStats();
    } catch (error) {
      log.error('Sync failed:', {}, "Page", error);
      alert('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  // Clear all local data (with confirmation)
  const clearLocalData = async () => {
    const confirmed = confirm(
      'Are you sure you want to clear all local data? This will delete installations and photos that haven\'t been synced to the server.'
    );
    
    if (!confirmed) return;

    try {
      await initializeDatabase();
      
      // Clear all data from the database
      await localDB.poleInstallations.clear();
      await localDB.photos.clear();
      await localDB.offlineQueue.clear();
      
      // Also clear related tables
      await localDB.poleCaptures.clear();
      await localDB.polePhotos.clear();
      
      await loadStats();
      alert('Local data cleared successfully.');
    } catch (error) {
      log.error('Failed to clear local data:', {}, "Page", error);
      alert('Failed to clear local data.');
    }
  };

  // Load stats on mount and refresh periodically
  useEffect(() => {
    if (isInitialized) {
      loadStats();
      
      // Refresh stats every 30 seconds
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Initializing sync status...</p>
        </div>
      </div>
    );
  }

  const totalPendingItems = stats.installations.pending + stats.photos.pending + stats.queue.total;
  const overallSyncProgress = stats.installations.total + stats.photos.total > 0 
    ? ((stats.installations.synced + stats.photos.synced) / (stats.installations.total + stats.photos.total)) * 100 
    : 100;

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sync Status</h1>
              <p className="text-gray-600">Monitor offline data synchronization</p>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={isOnline ? "secondary" : "destructive"}
                className={cn(
                  "flex items-center gap-1",
                  isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                )}
              >
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {totalPendingItems > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {totalPendingItems} Pending
                </Badge>
              )}
            </div>
          </div>

          {/* Overall Status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Overall Sync Status
              </CardTitle>
              <CardDescription>
                {overallSyncProgress === 100 ? 'All data synced' : `${overallSyncProgress.toFixed(1)}% synced`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={overallSyncProgress} className="mb-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.installations.synced + stats.photos.synced}
                  </div>
                  <div className="text-sm text-gray-600">Items Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {totalPendingItems}
                  </div>
                  <div className="text-sm text-gray-600">Items Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installations Status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Installation Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">{stats.installations.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{stats.installations.synced}</div>
                  <div className="text-xs text-gray-600">Synced</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">{stats.installations.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{stats.installations.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Photo Uploads
              </CardTitle>
              <CardDescription>
                {stats.photos.totalSize.toFixed(1)} MB total storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">{stats.photos.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{stats.photos.synced}</div>
                  <div className="text-xs text-gray-600">Uploaded</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">{stats.photos.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{stats.photos.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Queue Status */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sync Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">{stats.queue.total}</div>
                  <div className="text-xs text-gray-600">Queued</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">{stats.queue.processing}</div>
                  <div className="text-xs text-gray-600">Processing</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{stats.queue.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Progress */}
          {isSyncing && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Syncing Data...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={syncProgress} className="mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  {syncProgress}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={loadStats}
              disabled={isRefreshing}
              className="w-full bg-[#005cbb] hover:bg-[#004a96]"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>

            {isOnline && totalPendingItems > 0 && (
              <Button
                onClick={forceSyncAll}
                disabled={isSyncing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSyncing ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Sync All Pending Items
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={clearLocalData}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Local Data
            </Button>
          </div>

          {/* Alerts */}
          {!isOnline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Offline Mode</AlertTitle>
              <AlertDescription>
                You&apos;re currently offline. Data will be synced automatically when connection is restored.
              </AlertDescription>
            </Alert>
          )}

          {stats.installations.failed > 0 || stats.photos.failed > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sync Failures Detected</AlertTitle>
              <AlertDescription>
                Some items failed to sync. Check your internet connection and try syncing again.
              </AlertDescription>
            </Alert>
          )}

          {isOnline && totalPendingItems === 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>All Data Synced</AlertTitle>
              <AlertDescription>
                All installations and photos have been successfully uploaded to the server.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}