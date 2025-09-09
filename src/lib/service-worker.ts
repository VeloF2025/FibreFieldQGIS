// Service Worker utilities for FibreField
import { config } from './config';

// Register service worker
export const registerServiceWorker = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('✅ Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('🆕 New app version available');
                showUpdateAvailableNotification();
              }
            });
          }
        });
        
        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    });
  }
};

// Show update notification
const showUpdateAvailableNotification = () => {
  // This will be implemented with toast notification
  if (confirm('New version available! Refresh to update?')) {
    window.location.reload();
  }
};

// Unregister service worker (for development)
export const unregisterServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
  }
};

// Check if app is running as PWA
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Check if app can be installed
export const canInstall = (): boolean => {
  return 'BeforeInstallPromptEvent' in window;
};

// Prompt for installation
export const promptInstall = async (): Promise<boolean> => {
  // This will be set by the beforeinstallprompt event
  const deferredPrompt = (window as any).deferredPrompt;
  
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }
  
  try {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    
    // Clear the deferred prompt
    (window as any).deferredPrompt = null;
    
    return result.outcome === 'accepted';
  } catch (error) {
    console.error('Install prompt error:', error);
    return false;
  }
};

// Listen for install prompt
export const setupInstallPrompt = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      
      // Store the event for later use
      (window as any).deferredPrompt = e;
      
      console.log('Install prompt available');
    });
  }
};

// Background sync registration
export const registerBackgroundSync = async (tag: string) => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    
    try {
      // Type assertion for background sync support
      const syncManager = (registration as any).sync;
      if (syncManager) {
        await syncManager.register(tag);
        console.log(`Background sync registered: ${tag}`);
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
};

// Network status utilities
export const getNetworkStatus = () => {
  if (typeof navigator === 'undefined') return { online: true, type: 'unknown' };
  
  return {
    online: navigator.onLine,
    type: (navigator as any).connection?.effectiveType || 'unknown'
  };
};

// Listen for network changes
export const onNetworkChange = (callback: (online: boolean) => void) => {
  if (typeof window !== 'undefined') {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
  
  return () => {};
};