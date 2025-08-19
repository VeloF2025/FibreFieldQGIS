// Zustand store for offline state management
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { localDB, LocalPoleInstallation, LocalPhoto } from '@/lib/database';

interface OfflineState {
  // Connection status
  isOnline: boolean;
  lastOnlineAt: Date | null;
  syncInProgress: boolean;
  
  // Sync statistics
  pendingSyncCount: number;
  lastSyncAt: Date | null;
  syncErrors: string[];
  
  // Current data state
  currentPoleInstallation: LocalPoleInstallation | null;
  capturedPhotos: LocalPhoto[];
  draftData: Record<string, any>;
  
  // Actions
  setOnlineStatus: (online: boolean) => void;
  setSyncInProgress: (inProgress: boolean) => void;
  updatePendingSyncCount: () => Promise<void>;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  setCurrentPoleInstallation: (installation: LocalPoleInstallation | null) => void;
  addCapturedPhoto: (photo: LocalPhoto) => void;
  removeCapturedPhoto: (photoId: number) => void;
  clearCapturedPhotos: () => void;
  saveDraftData: (key: string, data: any) => void;
  getDraftData: (key: string) => any;
  clearDraftData: (key?: string) => void;
  
  // Utility actions
  initialize: () => Promise<void>;
  reset: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineAt: null,
    syncInProgress: false,
    pendingSyncCount: 0,
    lastSyncAt: null,
    syncErrors: [],
    currentPoleInstallation: null,
    capturedPhotos: [],
    draftData: {},

    // Actions
    setOnlineStatus: (online: boolean) => {
      set((state) => ({
        isOnline: online,
        lastOnlineAt: online ? new Date() : state.lastOnlineAt
      }));
    },

    setSyncInProgress: (inProgress: boolean) => {
      set({ syncInProgress: inProgress });
    },

    updatePendingSyncCount: async () => {
      try {
        const count = await localDB.getPendingSyncCount();
        set({ pendingSyncCount: count });
      } catch (error) {
        console.error('Failed to update pending sync count:', error);
      }
    },

    addSyncError: (error: string) => {
      set((state) => ({
        syncErrors: [...state.syncErrors, error].slice(-10) // Keep last 10 errors
      }));
    },

    clearSyncErrors: () => {
      set({ syncErrors: [] });
    },

    setCurrentPoleInstallation: (installation: LocalPoleInstallation | null) => {
      set({ currentPoleInstallation: installation });
    },

    addCapturedPhoto: (photo: LocalPhoto) => {
      set((state) => ({
        capturedPhotos: [...state.capturedPhotos, photo]
      }));
    },

    removeCapturedPhoto: (photoId: number) => {
      set((state) => ({
        capturedPhotos: state.capturedPhotos.filter(p => p.id !== photoId)
      }));
    },

    clearCapturedPhotos: () => {
      set({ capturedPhotos: [] });
    },

    saveDraftData: (key: string, data: any) => {
      set((state) => ({
        draftData: {
          ...state.draftData,
          [key]: data
        }
      }));
    },

    getDraftData: (key: string) => {
      return get().draftData[key];
    },

    clearDraftData: (key?: string) => {
      if (key) {
        set((state) => {
          const newDraftData = { ...state.draftData };
          delete newDraftData[key];
          return { draftData: newDraftData };
        });
      } else {
        set({ draftData: {} });
      }
    },

    initialize: async () => {
      try {
        // Initialize database
        await localDB.open();
        
        // Update pending sync count
        await get().updatePendingSyncCount();
        
        // Set up online/offline listeners
        if (typeof window !== 'undefined') {
          const handleOnline = () => get().setOnlineStatus(true);
          const handleOffline = () => get().setOnlineStatus(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          // Store cleanup function for later use
          (window as any).offlineStoreCleanup = () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }
        
        console.log('✅ Offline store initialized');
      } catch (error) {
        console.error('❌ Failed to initialize offline store:', error);
        get().addSyncError(`Initialization failed: ${error}`);
      }
    },

    reset: () => {
      set({
        syncInProgress: false,
        pendingSyncCount: 0,
        syncErrors: [],
        currentPoleInstallation: null,
        capturedPhotos: [],
        draftData: {}
      });
    }
  }))
);

// Selector hooks for specific state slices
export const useOnlineStatus = () => useOfflineStore((state) => state.isOnline);
export const useSyncStatus = () => useOfflineStore((state) => ({
  inProgress: state.syncInProgress,
  pendingCount: state.pendingSyncCount,
  lastSyncAt: state.lastSyncAt,
  errors: state.syncErrors
}));
export const useCurrentCapture = () => useOfflineStore((state) => ({
  installation: state.currentPoleInstallation,
  photos: state.capturedPhotos
}));

// Action hooks
export const useOfflineActions = () => useOfflineStore((state) => ({
  setOnlineStatus: state.setOnlineStatus,
  setSyncInProgress: state.setSyncInProgress,
  updatePendingSyncCount: state.updatePendingSyncCount,
  addSyncError: state.addSyncError,
  clearSyncErrors: state.clearSyncErrors,
  setCurrentPoleInstallation: state.setCurrentPoleInstallation,
  addCapturedPhoto: state.addCapturedPhoto,
  removeCapturedPhoto: state.removeCapturedPhoto,
  clearCapturedPhotos: state.clearCapturedPhotos,
  saveDraftData: state.saveDraftData,
  getDraftData: state.getDraftData,
  clearDraftData: state.clearDraftData,
  initialize: state.initialize,
  reset: state.reset
}));