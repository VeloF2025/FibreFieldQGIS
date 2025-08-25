import React from 'react';

function WizardNavigation({ 
  onBack, 
  onNext, 
  canProceed, 
  hasData, 
  isFirstStep, 
  isLastStep 
}) {
  const handleSaveClick = (e) => {
    const btn = e.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Saved!';
    setTimeout(() => {
      btn.textContent = originalText;
      // Could also trigger onBack() here to exit after save confirmation
    }, 2000);
  };

  return (
    <>
      {/* Save Status */}
      {hasData && (
        <div className="save-status">
          ✅ Your work is automatically saved
        </div>
      )}

      {/* Navigation */}
      <div className="navigation-buttons">
        {!isFirstStep && (
          <button 
            className="btn-secondary"
            onClick={onBack}
          >
            Back
          </button>
        )}
        
        {hasData && !isLastStep && (
          <button 
            className="btn-save"
            onClick={handleSaveClick}
          >
            💾 Save & Exit
          </button>
        )}
        
        {!isLastStep && (
          <button 
            className="btn-primary"
            onClick={onNext}
            disabled={!canProceed}
          >
            Next →
          </button>
        )}
      </div>
    </>
  );
}

export default WizardNavigation;