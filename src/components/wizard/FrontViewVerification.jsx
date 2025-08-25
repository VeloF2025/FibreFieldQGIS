import React, { useState } from 'react';
import PhotoCapture from '../PhotoCapture';

function FrontViewVerification({ data, onUpdate, onNext, onBack }) {
  const [photo, setPhoto] = useState(data.frontPhoto?.url);
  const [verifications, setVerifications] = useState(data.frontView || {
    vertical: false,
    clearPowerLines: false,
    clearInfrastructure: false,
    spiritLevelVisible: false
  });

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      frontPhoto: {
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
    onUpdate({ frontView: newVerifications });
  };

  const allChecked = Object.values(verifications).every(v => v === true);
  const canProceed = photo && allChecked;

  return (
    <div className="wizard-step front-view">
      <h2>Front View Verification</h2>
      <p className="subtitle">Photo from front with spirit level showing pole is vertical</p>

      {/* Front Photo */}
      <div className="form-group">
        <label>Front Photo (with Spirit Level) *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Take Photo"
          showExample={true}
        />
      </div>

      {/* Front View Verification */}
      <div className="form-group verification-section">
        <h3>Front View Verification</h3>
        
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

export default FrontViewVerification;