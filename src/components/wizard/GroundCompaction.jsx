import React, { useState } from 'react';
import PhotoCapture from '../PhotoCapture';

function GroundCompaction({ data, onUpdate, onNext, onBack }) {
  const [photo, setPhoto] = useState(data.compactionPhoto?.url);
  const [compactionVerified, setCompactionVerified] = useState(data.compactionVerified || false);

  const handlePhotoCapture = (photoData) => {
    setPhoto(photoData);
    onUpdate({
      compactionPhoto: {
        captured: true,
        url: photoData
      }
    });
  };

  const handleVerificationChange = (e) => {
    const checked = e.target.checked;
    setCompactionVerified(checked);
    onUpdate({ compactionVerified: checked });
  };

  const canProceed = photo && compactionVerified;

  return (
    <div className="wizard-step ground-compaction">
      <h2>Ground Compaction</h2>
      <p className="subtitle">Document ground compaction around the pole</p>

      {/* Compaction Photo */}
      <div className="form-group">
        <label>Compaction Photo *</label>
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          existingPhoto={photo}
          placeholder="📷 Take Photo"
          instruction="Show ground compaction"
        />
      </div>

      {/* Compaction Verification */}
      <div className="form-group verification-section">
        <h3>Compaction Verification</h3>
        <label className={`checkbox-label ${compactionVerified ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={compactionVerified}
            onChange={handleVerificationChange}
          />
          <span>Ground compaction completed properly</span>
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

export default GroundCompaction;