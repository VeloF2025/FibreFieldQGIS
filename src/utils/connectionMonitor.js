// Connection monitoring and auto-sync utilities
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

class ConnectionMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncInProgress = false;
    
    // Listen for connection changes
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners('online');
    // Trigger auto-sync
    this.autoSync();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  addListener(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(status) {
    this.listeners.forEach(listener => listener(status));
  }

  async autoSync() {
    if (this.syncInProgress || !this.isOnline) return;
    
    try {
      this.syncInProgress = true;
      console.log('Auto-sync started...');
      
      // Get all incomplete poles that are ready to sync
      const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
      const readyToSync = incomplete.filter(pole => {
        const photos = [
          pole.data?.beforePhoto?.captured,
          pole.data?.depthPhoto?.captured,
          pole.data?.compactionPhoto?.captured,
          pole.data?.concretePhoto?.captured,
          pole.data?.frontPhoto?.captured,
          pole.data?.sidePhoto?.captured
        ];
        return photos.every(Boolean); // All 6 photos captured
      });

      console.log(`Found ${readyToSync.length} poles ready to sync`);
      
      for (const pole of readyToSync) {
        try {
          await this.syncPole(pole);
          // Remove from incomplete list after successful sync
          this.removeSyncedPole(pole.id);
        } catch (error) {
          console.error(`Failed to sync pole ${pole.data?.poleNumber || pole.poleNumber || 'unknown'}:`, error);
        }
      }
      
      console.log('Auto-sync completed');
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPole(poleData) {
    const poleId = `pole_${poleData.data.poleNumber || 'unnamed'}_${Date.now()}`;
    
    // Upload photos first
    const uploadedPhotos = {};
    const photoTypes = ['beforePhoto', 'depthPhoto', 'compactionPhoto', 'concretePhoto', 'frontPhoto', 'sidePhoto'];
    
    for (const photoType of photoTypes) {
      if (poleData.data[photoType]?.captured && poleData.data[photoType]?.blob) {
        const filename = `${poleId}_${photoType}_${Date.now()}.jpg`;
        const photoRef = ref(storage, `pole-plantings/${filename}`);
        
        const snapshot = await uploadBytes(photoRef, poleData.data[photoType].blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        uploadedPhotos[photoType] = {
          url: downloadURL,
          filename,
          size: poleData.data[photoType].size,
          dimensions: poleData.data[photoType].dimensions,
          timestamp: poleData.data[photoType].timestamp
        };
      }
    }
    
    // Save to Firestore - handle undefined values from old data
    const firestoreData = {
      projectId: poleData.projectId || 'unknown',
      projectName: poleData.projectName || 'Unknown Project',
      poleNumber: poleData.data.poleNumber || '',
      gpsLocation: poleData.data.gpsLocation || null,
      gpsAccuracy: poleData.data.gpsAccuracy || null,
      notes: poleData.data.notes || '',
      photos: uploadedPhotos,
      depthVerified: poleData.data.depthVerified || false,
      compactionVerified: poleData.data.compactionVerified || false,
      concreteVerified: poleData.data.concreteVerified || false,
      frontView: poleData.data.frontView || {
        vertical: false,
        clearPowerLines: false,
        clearInfrastructure: false,
        spiritLevelVisible: false
      },
      sideView: poleData.data.sideView || {
        vertical: false,
        clearPowerLines: false,
        clearInfrastructure: false,
        spiritLevelVisible: false
      },
      status: 'completed',
      createdAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    await addDoc(collection(db, 'pole-plantings-staging'), firestoreData);
    console.log(`Pole ${poleData.data.poleNumber} synced successfully`);
  }

  removeSyncedPole(poleId) {
    const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
    const filtered = incomplete.filter(p => p.id !== poleId);
    localStorage.setItem('incompletePoles', JSON.stringify(filtered));
    
    // Also add to completed list
    const completed = JSON.parse(localStorage.getItem('completedPoles') || '[]');
    const syncedPole = incomplete.find(p => p.id === poleId);
    if (syncedPole) {
      completed.push({
        ...syncedPole,
        status: 'synced',
        syncedAt: new Date().toISOString()
      });
      localStorage.setItem('completedPoles', JSON.stringify(completed));
    }
  }
}

// Create singleton instance
export const connectionMonitor = new ConnectionMonitor();