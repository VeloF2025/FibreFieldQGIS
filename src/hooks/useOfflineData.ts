// Custom React hooks for offline data management
import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB, LocalPoleInstallation, LocalPlannedPole, LocalProject } from '@/lib/database';
import { useOfflineStore } from '@/stores/offline-store';
import { offlineSyncService } from '@/services/offline-sync.service';

// Hook for managing pole installations
export const usePoleInstallations = (filters?: {
  projectId?: string;
  status?: string;
  contractorId?: string;
}) => {
  const installations = useLiveQuery(
    async () => {
      let query = localDB.poleInstallations.orderBy('capturedAt').reverse();
      
      if (filters?.projectId) {
        query = query.filter(p => p.projectId === filters.projectId);
      }
      if (filters?.status) {
        query = query.filter(p => p.status === filters.status);
      }
      if (filters?.contractorId) {
        query = query.filter(p => p.contractorId === filters.contractorId);
      }
      
      return await query.toArray();
    },
    [filters?.projectId, filters?.status, filters?.contractorId]
  );

  const createInstallation = useCallback(async (data: Omit<LocalPoleInstallation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await localDB.poleInstallations.add({
      ...data,
      isOffline: true,
      syncAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add to sync queue if online
    if (navigator.onLine) {
      await offlineSyncService.addToQueue('pole-installation', 'create', { ...data, id }, 'high');
    }

    return id;
  }, []);

  const updateInstallation = useCallback(async (id: number, updates: Partial<LocalPoleInstallation>) => {
    await localDB.poleInstallations.update(id, {
      ...updates,
      updatedAt: new Date()
    });

    // Add to sync queue if online and has remote ID
    const installation = await localDB.poleInstallations.get(id);
    if (navigator.onLine && installation?.remoteId) {
      await offlineSyncService.addToQueue('pole-installation', 'update', { id, ...updates }, 'high');
    }
  }, []);

  const deleteInstallation = useCallback(async (id: number) => {
    const installation = await localDB.poleInstallations.get(id);
    await localDB.poleInstallations.delete(id);

    // Add to sync queue if online and has remote ID
    if (navigator.onLine && installation?.remoteId) {
      await offlineSyncService.addToQueue('pole-installation', 'delete', { id, remoteId: installation.remoteId }, 'high');
    }
  }, []);

  return {
    installations: installations || [],
    createInstallation,
    updateInstallation,
    deleteInstallation,
    loading: installations === undefined
  };
};

// Hook for managing planned poles
export const usePlannedPoles = (filters?: {
  projectId?: string;
  status?: string;
  assignedTo?: string;
}) => {
  const poles = useLiveQuery(
    async () => {
      let query = localDB.plannedPoles.orderBy('createdAt').reverse();
      
      if (filters?.projectId) {
        query = query.filter(p => p.projectId === filters.projectId);
      }
      if (filters?.status) {
        query = query.filter(p => p.status === filters.status);
      }
      if (filters?.assignedTo) {
        query = query.filter(p => p.assignedTo === filters.assignedTo);
      }
      
      return await query.toArray();
    },
    [filters?.projectId, filters?.status, filters?.assignedTo]
  );

  return {
    poles: poles || [],
    loading: poles === undefined
  };
};

// Hook for managing projects
export const useProjects = (filters?: {
  status?: string;
  type?: string;
}) => {
  const projects = useLiveQuery(
    async () => {
      let query = localDB.projects.orderBy('createdAt').reverse();
      
      if (filters?.status) {
        query = query.filter(p => p.status === filters.status);
      }
      if (filters?.type) {
        query = query.filter(p => p.type === filters.type);
      }
      
      return await query.toArray();
    },
    [filters?.status, filters?.type]
  );

  return {
    projects: projects || [],
    loading: projects === undefined
  };
};

// Hook for managing photos
export const usePhotos = (poleInstallationId?: number) => {
  const photos = useLiveQuery(
    async () => {
      if (poleInstallationId) {
        return await localDB.photos
          .where('poleInstallationId')
          .equals(poleInstallationId)
          .toArray();
      }
      return await localDB.photos.orderBy('createdAt').reverse().toArray();
    },
    [poleInstallationId]
  );

  const addPhoto = useCallback(async (photoData: Omit<LocalPoleInstallation['photos'][0], 'id'> & { 
    localPath: string;
    poleInstallationId: number;
  }) => {
    const id = await localDB.photos.add({
      ...photoData,
      uploaded: false,
      compressed: false,
      createdAt: new Date()
    });

    // Add to sync queue if online
    if (navigator.onLine) {
      await offlineSyncService.addToQueue('photo-upload', 'create', { ...photoData, id }, 'medium');
    }

    return id;
  }, []);

  const deletePhoto = useCallback(async (id: number) => {
    const photo = await localDB.photos.get(id);
    await localDB.photos.delete(id);

    // Add to sync queue if online and has remote ID
    if (navigator.onLine && photo?.remoteId) {
      await offlineSyncService.addToQueue('photo-upload', 'delete', { id, remoteId: photo.remoteId }, 'low');
    }
  }, []);

  return {
    photos: photos || [],
    addPhoto,
    deletePhoto,
    loading: photos === undefined
  };
};

// Hook for sync status and controls
export const useSync = () => {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    pendingCount: 0,
    lastSync: null as Date | null,
    error: null as string | null
  });

  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await offlineSyncService.getSyncStatus();
      setSyncStatus({
        inProgress: status.inProgress,
        pendingCount: status.pendingCount,
        lastSync: status.lastSync,
        error: null
      });
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    try {
      setSyncStatus(prev => ({ ...prev, inProgress: true, error: null }));
      await offlineSyncService.forcSync();
      await updateSyncStatus();
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        inProgress: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
      throw error;
    }
  }, [isOnline, updateSyncStatus]);

  // Update status periodically
  useEffect(() => {
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  return {
    ...syncStatus,
    isOnline,
    triggerSync,
    refreshStatus: updateSyncStatus
  };
};

// Hook for offline queue management
export const useOfflineQueue = () => {
  const queueItems = useLiveQuery(
    () => localDB.offlineQueue.orderBy('createdAt').reverse().toArray()
  );

  const pendingItems = useLiveQuery(
    () => localDB.offlineQueue.where('status').equals('pending').toArray()
  );

  const failedItems = useLiveQuery(
    () => localDB.offlineQueue.where('status').equals('failed').toArray()
  );

  const retryFailedItem = useCallback(async (id: number) => {
    await localDB.offlineQueue.update(id, {
      status: 'pending',
      attempts: 0,
      nextAttempt: new Date(),
      lastError: undefined,
      updatedAt: new Date()
    });
  }, []);

  const deleteQueueItem = useCallback(async (id: number) => {
    await localDB.offlineQueue.delete(id);
  }, []);

  const clearCompletedItems = useCallback(async () => {
    await localDB.offlineQueue.where('status').equals('completed').delete();
  }, []);

  return {
    allItems: queueItems || [],
    pendingItems: pendingItems || [],
    failedItems: failedItems || [],
    retryFailedItem,
    deleteQueueItem,
    clearCompletedItems,
    loading: queueItems === undefined
  };
};

// Hook for app settings
export const useAppSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const allSettings = await localDB.appSettings.toArray();
      const settingsMap = allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      setSettings(settingsMap);
    } catch (error) {
      log.error('Failed to load app settings:', {}, "UseOfflineData", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    await localDB.setSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const getSetting = useCallback((key: string, defaultValue?: any) => {
    return settings[key] ?? defaultValue;
  }, [settings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    getSetting,
    updateSetting,
    reloadSettings: loadSettings
  };
};

// Hook for database statistics
export const useDatabaseStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const dbStats = await localDB.getStats();
      setStats(dbStats);
    } catch (error) {
      log.error('Failed to load database stats:', {}, "UseOfflineData", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000); // Every minute
    return () => clearInterval(interval);
  }, [loadStats]);

  return {
    stats,
    loading,
    refresh: loadStats
  };
};