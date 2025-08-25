import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

function ReviewComplete({ data, onUpdate, onBack, onComplete, isLastStep }) {
  const [notes, setNotes] = useState(data.notes || '');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    onUpdate({ notes: value });
  };

  const uploadPhotoToStorage = async (photoData, photoType, poleId) => {
    // Check if we have photo data (either as URL string or object)
    if (!photoData) return null;
    
    try {
      // If photoData is already a URL string (dataUrl), convert to blob
      let blob;
      if (typeof photoData === 'string' && photoData.startsWith('data:')) {
        // Convert dataUrl to blob
        const response = await fetch(photoData);
        blob = await response.blob();
      } else if (photoData.blob) {
        // Use existing blob
        blob = photoData.blob;
      } else if (photoData.url && photoData.url.startsWith('data:')) {
        // Convert from url property
        const response = await fetch(photoData.url);
        blob = await response.blob();
      } else {
        console.log(`No valid photo data for ${photoType}`);
        return null;
      }
      
      const filename = `${poleId}_${photoType}_${Date.now()}.jpg`;
      const photoRef = ref(storage, `pole-plantings/${filename}`);
      
      const snapshot = await uploadBytes(photoRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        url: downloadURL,
        filename,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error uploading ${photoType} photo:`, error);
      throw error;
    }
  };

  const handleComplete = async () => {
    setIsSyncing(true);
    
    try {
      // Generate a unique ID for this pole
      const poleId = `pole_${data.poleNumber || 'unnamed'}_${Date.now()}`;
      
      // Upload all photos to Firebase Storage
      const uploadedPhotos = {};
      const photoTypes = ['beforePhoto', 'depthPhoto', 'compactionPhoto', 'concretePhoto', 'frontPhoto', 'sidePhoto'];
      
      for (const photoType of photoTypes) {
        if (data[photoType]?.captured || data[photoType]?.url) {
          const photoData = data[photoType]?.url || data[photoType];
          const uploadResult = await uploadPhotoToStorage(photoData, photoType, poleId);
          if (uploadResult) {
            uploadedPhotos[photoType] = uploadResult;
          }
        }
      }
      
      // Prepare data for Firestore
      const poleData = {
        // Project info
        projectId: data.projectId || 'unknown',
        projectName: data.projectName || 'Unknown Project',
        
        // Basic info
        poleNumber: data.poleNumber || '',
        gpsLocation: data.gpsLocation || null,
        gpsAccuracy: data.gpsAccuracy || null,
        notes: data.notes || '',
        
        // Photos (URLs after upload)
        photos: uploadedPhotos,
        
        // Verification data
        depthVerified: data.depthVerified || false,
        compactionVerified: data.compactionVerified || false,
        concreteVerified: data.concreteVerified || false,
        
        // Front and side view checks
        frontView: data.frontView || {
          vertical: false,
          clearPowerLines: false,
          clearInfrastructure: false,
          spiritLevelVisible: false
        },
        sideView: data.sideView || {
          vertical: false,
          clearPowerLines: false,
          clearInfrastructure: false,
          spiritLevelVisible: false
        },
        
        // Status and timestamps
        status: 'completed',
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        
        // 7 day expiry for staging data
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      
      // Save to Firebase pole-plantings-staging collection
      const docRef = await addDoc(collection(db, 'pole-plantings-staging'), poleData);
      console.log('Pole saved to Firebase with ID:', docRef.id);
      
      // Mark this pole as synced by removing from incomplete list
      const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
      const filtered = incomplete.filter(p => p.data.poleNumber !== data.poleNumber);
      localStorage.setItem('incompletePoles', JSON.stringify(filtered));
      
      onComplete();
    } catch (error) {
      console.error('Error syncing to Firebase:', error);
      
      // More specific error messages
      let errorMessage = 'Error syncing data. ';
      if (error.code === 'storage/unauthorized') {
        errorMessage += 'Storage access denied. Please try again.';
      } else if (error.code === 'permission-denied') {
        errorMessage += 'Database access denied. Please contact support.';
      } else if (!navigator.onLine) {
        errorMessage += 'No internet connection. Data saved locally and will sync when online.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
      setIsSyncing(false);
      
      // If offline, still mark as complete locally
      if (!navigator.onLine) {
        onComplete();
      }
    }
  };

  const getPhotoCount = () => {
    const photos = [
      data.beforePhoto?.captured,
      data.depthPhoto?.captured,
      data.compactionPhoto?.captured,
      data.concretePhoto?.captured,
      data.frontPhoto?.captured,
      data.sidePhoto?.captured
    ];
    return photos.filter(Boolean).length;
  };

  const formatGPSLocation = () => {
    if (!data.gpsLocation) return 'Not captured';
    return `${data.gpsLocation.latitude.toFixed(6)}, ${data.gpsLocation.longitude.toFixed(6)}`;
  };

  return (
    <div className="wizard-step review-complete">
      <h2>Review & Complete</h2>
      <p className="subtitle">Review your pole installation capture</p>

      {/* Additional Notes */}
      <div className="form-group">
        <label>Additional Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Any additional observations, issues, or special conditions..."
          className="notes-textarea"
          rows={4}
        />
      </div>

      {/* Installation Summary */}
      <div className="summary-section">
        <h3>Installation Summary</h3>
        <div className="summary-items">
          <div className="summary-item">
            <span className="label">Project:</span>
            <span className="value">{data.projectName || 'No project'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Pole Number:</span>
            <span className="value">{data.poleNumber || 'Not entered'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Photos Captured:</span>
            <span className="value">{getPhotoCount()}</span>
          </div>
          <div className="summary-item">
            <span className="label">GPS Location:</span>
            <span className="value">{formatGPSLocation()}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="navigation-buttons">
        <button 
          className="btn-secondary"
          onClick={onBack}
          disabled={isSyncing}
        >
          Back
        </button>
        <button 
          className="btn-success"
          onClick={handleComplete}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : '✓ Complete Capture'}
        </button>
      </div>
    </div>
  );
}

export default ReviewComplete;