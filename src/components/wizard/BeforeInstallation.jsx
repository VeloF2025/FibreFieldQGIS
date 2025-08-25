import React, { useState, useEffect } from 'react';
import PhotoCapture from '../PhotoCapture';
import GPSCapture from '../GPSCapture';

function BeforeInstallation({ data, onUpdate, onNext, onBack, isFirstStep }) {
  const [poleNumber, setPoleNumber] = useState(data.poleNumber || '');
  const [gpsLocation, setGpsLocation] = useState(data.gpsLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(data.gpsAccuracy);
  const [photo, setPhoto] = useState(data.beforePhoto?.url);

  const handleGPSCapture = (location, accuracy) => {
    setGpsLocation(location);
    setGpsAccuracy(accuracy);
    onUpdate({
      gpsLocation: location,
      gpsAccuracy: accuracy
    });
  };

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      beforePhoto: {
        captured: true,
        url: photoData
      }
    });
  };

  const handlePoleNumberChange = (e) => {
    const value = e.target.value;
    setPoleNumber(value);
    onUpdate({ poleNumber: value });
  };

  const canProceed = poleNumber && gpsLocation && photo;

  return (
    <div className="wizard-step before-installation">
      <h2>Before Installation</h2>
      <p className="subtitle">Capture the initial site condition and pole number from iMap</p>

      {/* Site Photo */}
      <div className="form-group">
        <label>Site Photo *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Before Installation"
        />
      </div>

      {/* GPS Location */}
      <div className="form-group">
        <GPSCapture
          onLocationCapture={handleGPSCapture}
          existingLocation={gpsLocation}
          existingAccuracy={gpsAccuracy}
        />
      </div>

      {/* Pole Number */}
      <div className="form-group">
        <label>Pole Number (from iMap) *</label>
        <input
          type="text"
          value={poleNumber}
          onChange={handlePoleNumberChange}
          placeholder="Enter the pole number from iMap system"
          className="text-input"
        />
      </div>

      {/* Save Status */}
      {(photo || poleNumber || gpsLocation) && (
        <div className="save-status">
          ✅ Your work is automatically saved
        </div>
      )}

      {/* Navigation */}
      <div className="navigation-buttons">
        <button 
          className="btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
        
        {(photo || poleNumber || gpsLocation) && (
          <button 
            className="btn-save"
            onClick={(e) => {
              // Data is already saved automatically, just show feedback
              const btn = e.target;
              const originalText = btn.textContent;
              btn.textContent = '✅ Saved!';
              setTimeout(() => {
                btn.textContent = originalText;
              }, 2000);
            }}
          >
            💾 Save & Exit
          </button>
        )}
        
        <button 
          className="btn-primary"
          onClick={onNext}
          disabled={!canProceed}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
}

export default BeforeInstallation;