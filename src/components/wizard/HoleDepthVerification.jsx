import React, { useState } from 'react';
import PhotoCapture from '../PhotoCapture';

function HoleDepthVerification({ data, onUpdate, onNext, onBack }) {
  const [photo, setPhoto] = useState(data.depthPhoto?.url);
  const [depthVerified, setDepthVerified] = useState(data.depthVerified || false);

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      depthPhoto: {
        captured: true,
        url: photoData
      }
    });
  };

  const handleVerificationChange = (e) => {
    const checked = e.target.checked;
    setDepthVerified(checked);
    onUpdate({ depthVerified: checked });
  };

  const canProceed = photo && depthVerified;

  return (
    <div className="wizard-step hole-depth">
      <h2>Hole Depth Verification</h2>
      <p className="subtitle">Confirm the hole is at least 1.2 meters deep</p>

      {/* Depth Photo */}
      <div className="form-group">
        <label>Depth Photo *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Take Photo"
          instruction="Show depth measurement"
        />
      </div>

      {/* Depth Verification */}
      <div className="form-group verification-section">
        <h3>Depth Verification</h3>
        <label className={`checkbox-label ${depthVerified ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={depthVerified}
            onChange={handleVerificationChange}
          />
          <span>Hole is at least 1.2 meters deep</span>
        </label>
      </div>

      {/* Save Status */}
      {(photo || depthVerified) && (
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
        
        {(photo || depthVerified) && (
          <button 
            className="btn-save"
            onClick={(e) => {
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

export default HoleDepthVerification;