import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import PhotoCapture from './PhotoCapture';
import GPSCapture from './GPSCapture';

const PoleCapture = ({ projectId, resumingPole, onClearResume }) => {
  const [poleNumber, setPoleNumber] = useState('');
  const [gpsLocation, setGpsLocation] = useState(null);
  const [photos, setPhotos] = useState({
    before: null,
    front: null,
    side: null,
    depth: null,
    concrete: null,
    compaction: null
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  
  // Load data when resuming a pole
  useEffect(() => {
    if (resumingPole) {
      setPoleNumber(resumingPole.poleNumber || '');
      setGpsLocation(resumingPole.gpsLocation || null);
      setPhotos(resumingPole.photos || {
        before: null,
        front: null,
        side: null,
        depth: null,
        concrete: null,
        compaction: null
      });
      setStatus('Resuming pole capture...');
    }
  }, [resumingPole]);

  const photoTypes = [
    { key: 'before', label: 'Before Installation' },
    { key: 'front', label: 'Front View' },
    { key: 'side', label: 'Side View' },
    { key: 'depth', label: 'Installation Depth' },
    { key: 'concrete', label: 'Concrete Base' },
    { key: 'compaction', label: 'Ground Compaction' }
  ];

  const handlePhotoCapture = (photoType, photoData) => {
    setPhotos(prev => ({
      ...prev,
      [photoType]: photoData
    }));
  };

  const uploadPhotosToStorage = async (poleId) => {
    const uploadedPhotos = {};
    
    for (const [photoType, photoData] of Object.entries(photos)) {
      if (photoData && photoData.blob) {
        try {
          // Create a unique filename  
          const filename = `${poleId}_${photoType}_${Date.now()}.jpg`;
          const photoRef = ref(storage, `csv-uploads/${filename}`);
          
          // Upload the photo
          const snapshot = await uploadBytes(photoRef, photoData.blob);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          // Store photo metadata without the blob
          uploadedPhotos[photoType] = {
            url: downloadURL,
            filename,
            size: photoData.size,
            dimensions: photoData.dimensions,
            timestamp: photoData.timestamp,
            originalSize: photoData.originalSize
          };
        } catch (error) {
          console.error(`Error uploading ${photoType} photo:`, error);
          // Keep the existing photo data if upload fails (for offline scenarios)
          uploadedPhotos[photoType] = {
            ...photoData,
            blob: null, // Remove blob to prevent Firestore error
            uploadFailed: true
          };
        }
      } else if (photoData) {
        // Photo already uploaded or no blob
        uploadedPhotos[photoType] = photoData;
      }
    }
    
    return uploadedPhotos;
  };

  const handleSaveProgress = async () => {
    if (!poleNumber.trim()) {
      setStatus('Please enter a pole number');
      return;
    }

    if (!gpsLocation) {
      setStatus('Please capture GPS location');
      return;
    }

    setSaving(true);
    setStatus('Saving progress...');

    try {
      const capturedPhotos = Object.values(photos).filter(Boolean).length;
      const isComplete = capturedPhotos === photoTypes.length;
      
      // Create a temporary pole ID for photo uploads
      const tempPoleId = resumingPole?.id || `temp_${poleNumber.trim()}_${Date.now()}`;
      
      // Update status to show photo upload progress
      setStatus('Uploading photos...');
      
      // Upload photos to Storage first
      const uploadedPhotos = await uploadPhotosToStorage(tempPoleId);
      
      setStatus('Saving to database...');
      
      const poleData = {
        projectId,
        poleNumber: poleNumber.trim(),
        gpsLocation,
        photos: uploadedPhotos,
        status: isComplete ? 'ready-for-sync' : 'in-progress',
        completionStatus: {
          totalPhotos: photoTypes.length,
          capturedPhotos,
          isComplete
        },
        updatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      if (resumingPole?.id) {
        // Update existing pole
        await updateDoc(doc(db, 'pole-plantings-staging', resumingPole.id), poleData);
        setStatus(isComplete ? 'Pole completed and saved!' : `Progress saved! (${capturedPhotos}/${photoTypes.length} photos)`);
      } else {
        // Create new pole
        poleData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'pole-plantings-staging'), poleData);
        setStatus(isComplete ? 'Pole completed and saved!' : `Progress saved! (${capturedPhotos}/${photoTypes.length} photos)`);
      }
      
      // Only clear form if complete, otherwise keep for resume
      if (isComplete) {
        if (onClearResume) {
          onClearResume();
        }
        setPoleNumber('');
        setGpsLocation(null);
        setPhotos({
          before: null,
          front: null,
          side: null,
          depth: null,
          concrete: null,
          compaction: null
        });
      }
      
    } catch (error) {
      console.error('Error saving pole data:', error);
      setStatus('Error saving data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = poleNumber.trim() && gpsLocation && 
    photoTypes.every(type => photos[type.key]);
  
  const canSaveProgress = poleNumber.trim() && gpsLocation;
  const capturedPhotos = Object.values(photos).filter(Boolean).length;

  return (
    <div className="pole-capture">
      <h2>Pole Capture</h2>
      
      {resumingPole && (
        <div className="resuming-banner">
          <p>🔄 Resuming capture for pole: <strong>{resumingPole.poleNumber || 'Unnamed Pole'}</strong></p>
          <button 
            onClick={onClearResume}
            className="clear-resume-button"
          >
            Start New Capture
          </button>
        </div>
      )}
      
      {/* Pole Number Input */}
      <div className="pole-number-input">
        <label htmlFor="pole-number">Pole Number:</label>
        <input
          id="pole-number"
          type="text"
          value={poleNumber}
          onChange={(e) => setPoleNumber(e.target.value)}
          placeholder="Enter pole number (e.g. LAW.P.B167)"
          className="pole-input"
        />
      </div>

      {/* GPS Capture */}
      <GPSCapture onLocationCapture={setGpsLocation} location={gpsLocation} />

      {/* Photo Captures */}
      <div className="photo-captures">
        <h3>Required Photos ({capturedPhotos}/6)</h3>
        {photoTypes.map(photoType => (
          <PhotoCapture
            key={photoType.key}
            photoType={photoType.key}
            label={photoType.label}
            onCapture={handlePhotoCapture}
            existingPhoto={photos[photoType.key]}
          />
        ))}
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button 
          onClick={handleSaveProgress}
          disabled={saving || !canSaveProgress}
          className={`save-button ${canSaveProgress ? 'complete' : 'incomplete'}`}
        >
          {saving ? 'Saving...' : (isComplete ? 'Complete & Save' : 'Save Progress')}
        </button>
        
        {canSaveProgress && !isComplete && (
          <p className="save-hint">
            💡 You can save with {capturedPhotos > 0 ? `${capturedPhotos} photo${capturedPhotos > 1 ? 's' : ''}` : 'just GPS'} and add more photos later!
          </p>
        )}
        
        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
};

export default PoleCapture;