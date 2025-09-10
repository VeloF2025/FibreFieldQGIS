// Offline provider for initializing and managing offline functionality
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeDatabase, localDB } from '@/lib/database';
import { useOfflineStore } from '@/stores/offline-store';
import { validateConfig, logConfig } from '@/lib/config';
import { setupAutoSync } from '@/utils/offline-utils';
import { log } from '@/lib/logger';

interface OfflineContextType {
  isInitialized: boolean;
  error: string | null;
  retryInitialization: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializeOfflineStore = useOfflineStore((state) => state.initialize);

  const initializeOffline = async () => {
    try {
      setError(null);
      log.info('🚀 Initializing FibreField offline systems...', undefined, 'OfflineProvider');

      // Step 1: Validate configuration
      validateConfig();
      logConfig();

      // Step 2: Initialize database
      await initializeDatabase();
      log.info('✅ Database initialized', undefined, 'OfflineProvider');

      // Step 3: Initialize offline store
      await initializeOfflineStore();
      log.info('✅ Offline store initialized', undefined, 'OfflineProvider');

      // Step 4: Set up auto-sync (5-minute intervals)
      setupAutoSync(5);
      log.info('✅ Auto-sync configured', undefined, 'OfflineProvider');

      // Step 5: Cleanup old files on startup
      if (typeof window !== 'undefined') {
        // Import utils dynamically to avoid SSR issues
        const { cleanupOfflineFiles } = await import('@/utils/offline-utils');
        const cleanedCount = await cleanupOfflineFiles(7); // 7 days
        if (cleanedCount > 0) {
          log.info(`🧹 Cleaned up ${cleanedCount} old offline files`, { cleanedCount }, 'OfflineProvider');
        }
      }

      setIsInitialized(true);
      log.info('🎉 FibreField offline systems ready!', undefined, 'OfflineProvider');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      setError(errorMessage);
      log.error('❌ Offline initialization failed', { error: err }, 'OfflineProvider', err as Error);
    }
  };

  const retryInitialization = async () => {
    setIsInitialized(false);
    await initializeOffline();
  };

  useEffect(() => {
    initializeOffline();

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && (window as any).offlineStoreCleanup) {
        (window as any).offlineStoreCleanup();
      }
    };
  }, []);

  const value: OfflineContextType = {
    isInitialized,
    error,
    retryInitialization
  };

  // Show initialization error UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Initialization Failed
              </h1>
              
              <p className="text-gray-600 mb-4">
                FibreField couldn&apos;t initialize properly. This might be due to browser compatibility or storage issues.
              </p>
              
              <div className="bg-red-50 rounded-md p-3 mb-4">
                <p className="text-sm text-red-700 font-mono">
                  {error}
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={retryInitialization}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retry Initialization
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Reload Page
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>If the problem persists, try:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Clear browser data for this site</li>
                  <li>• Use a modern browser (Chrome, Firefox, Safari)</li>
                  <li>• Ensure sufficient storage space</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading UI while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg className="animate-spin w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Starting FibreField
          </h1>
          
          <p className="text-gray-600">
            Initializing offline systems...
          </p>
          
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Setting up local database</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
              <span>Configuring offline storage</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
              <span>Preparing sync services</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children when fully initialized
  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}