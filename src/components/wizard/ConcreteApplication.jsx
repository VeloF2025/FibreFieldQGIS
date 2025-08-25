import React, { useState } from 'react';
import PhotoCapture from '../PhotoCapture';

function ConcreteApplication({ data, onUpdate, onNext, onBack }) {
  const [photo, setPhoto] = useState(data.concretePhoto?.url);
  const [concreteVerified, setConcreteVerified] = useState(data.concreteVerified || false);

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      concretePhoto: {
        captured: true,
        url: photoData
      }
    });
  };

  const handleVerificationChange = (e) => {
    const checked = e.target.checked;
    setConcreteVerified(checked);
    onUpdate({ concreteVerified: checked });
  };

  const canProceed = photo && concreteVerified;

  return (
    <div className="wizard-step concrete-application">
      <h2>Concrete Application</h2>
      <p className="subtitle">Document concrete usage for pole foundation</p>

      {/* Concrete Photo */}
      <div className="form-group">
        <label>Concrete Photo *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Take Photo"
          instruction="Show concrete application"
        />
      </div>

      {/* Concrete Verification */}
      <div className="form-group verification-section">
        <h3>Concrete Verification</h3>
        <label className={`checkbox-label ${concreteVerified ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={concreteVerified}
            onChange={handleVerificationChange}
          />
          <span>Concrete was properly applied</span>
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

export default ConcreteApplication;