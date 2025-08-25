import React, { useState } from 'react';
import PhotoCapture from '../PhotoCapture';

function SideViewVerification({ data, onUpdate, onNext, onBack }) {
  const [photo, setPhoto] = useState(data.sidePhoto?.url);
  const [verifications, setVerifications] = useState(data.sideView || {
    vertical: false,
    clearPowerLines: false,
    clearInfrastructure: false,
    spiritLevelVisible: false
  });

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      sidePhoto: {
        captured: true,
        url: photoData
      }
    });
  };

  const handleVerificationChange = (field) => (e) => {
    const newVerifications = {
      ...verifications,
      [field]: e.target.checked
    };
    setVerifications(newVerifications);
    onUpdate({ sideView: newVerifications });
  };

  const allChecked = Object.values(verifications).every(v => v === true);
  const canProceed = photo && allChecked;

  return (
    <div className="wizard-step side-view">
      <h2>Side View Verification</h2>
      <p className="subtitle">Photo from side with spirit level showing pole is vertical</p>

      {/* Side Photo */}
      <div className="form-group">
        <label>Side Photo (with Spirit Level) *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Take Photo"
          instruction="Include spirit level in photo"
        />
      </div>

      {/* Side View Verification */}
      <div className="form-group verification-section">
        <h3>Side View Verification</h3>
        
        <label className={`checkbox-label ${verifications.vertical ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={verifications.vertical}
            onChange={handleVerificationChange('vertical')}
          />
          <span>Pole is vertical (plumb)</span>
        </label>

        <label className={`checkbox-label ${verifications.clearPowerLines ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={verifications.clearPowerLines}
            onChange={handleVerificationChange('clearPowerLines')}
          />
          <span>Clear of power lines</span>
        </label>

        <label className={`checkbox-label ${verifications.clearInfrastructure ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={verifications.clearInfrastructure}
            onChange={handleVerificationChange('clearInfrastructure')}
          />
          <span>Clear of other infrastructure</span>
        </label>

        <label className={`checkbox-label ${verifications.spiritLevelVisible ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={verifications.spiritLevelVisible}
            onChange={handleVerificationChange('spiritLevelVisible')}
          />
          <span>Spirit level visible in photo</span>
        </label>
      </div>

      {/* Navigation */}
      <div className="navigation-buttons">
        <button 
          className="btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
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

export default SideViewVerification;