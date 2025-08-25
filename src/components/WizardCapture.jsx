import React, { useState, useEffect } from 'react';
import BeforeInstallation from './wizard/BeforeInstallation';
import HoleDepthVerification from './wizard/HoleDepthVerification';
import GroundCompaction from './wizard/GroundCompaction';
import ConcreteApplication from './wizard/ConcreteApplication';
import FrontViewVerification from './wizard/FrontViewVerification';
import SideViewVerification from './wizard/SideViewVerification';
import ReviewComplete from './wizard/ReviewComplete';
import { saveToIndexedDB, getFromIndexedDB } from '../utils/storage';

const WIZARD_STEPS = [
  { id: 1, name: 'Before Installation', component: BeforeInstallation },
  { id: 2, name: 'Hole Depth', component: HoleDepthVerification },
  { id: 3, name: 'Ground Compaction', component: GroundCompaction },
  { id: 4, name: 'Concrete Application', component: ConcreteApplication },
  { id: 5, name: 'Front View', component: FrontViewVerification },
  { id: 6, name: 'Side View', component: SideViewVerification },
  { id: 7, name: 'Review & Complete', component: ReviewComplete }
];

function WizardCapture({ project, resumingPole, onBack, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [captureData, setCaptureData] = useState({
    id: null,
    projectId: project?.id,
    projectName: project?.title || project?.name || 'Unknown Project',
    status: 'incomplete',
    currentStep: 1,
    lastUpdated: new Date().toISOString(),
    data: {
      poleNumber: '',
      gpsLocation: null,
      gpsAccuracy: null,
      notes: '',
      // Photos
      beforePhoto: { captured: false, url: null },
      depthPhoto: { captured: false, url: null },
      compactionPhoto: { captured: false, url: null },
      concretePhoto: { captured: false, url: null },
      frontPhoto: { captured: false, url: null },
      sidePhoto: { captured: false, url: null },
      // Verifications
      depthVerified: false,
      compactionVerified: false,
      concreteVerified: false,
      frontView: {
        vertical: false,
        clearPowerLines: false,
        clearInfrastructure: false,
        spiritLevelVisible: false
      },
      sideView: {
        vertical: false,
        clearPowerLines: false,
        clearInfrastructure: false,
        spiritLevelVisible: false
      }
    }
  });

  // Load resuming data or initialize new capture
  useEffect(() => {
    if (resumingPole) {
      setCaptureData(resumingPole);
      setCurrentStep(resumingPole.currentStep || 1);
    } else {
      // Generate new ID for new capture
      const newId = `pole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCaptureData(prev => ({ ...prev, id: newId }));
    }
  }, [resumingPole]);

  // Auto-save after each change and update incomplete list
  useEffect(() => {
    if (captureData.id && captureData.status === 'incomplete') {
      // Save to IndexedDB
      saveToIndexedDB(captureData);
      
      // Update incomplete poles list in localStorage
      const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
      const existingIndex = incomplete.findIndex(p => p.id === captureData.id);
      
      if (existingIndex >= 0) {
        // Update existing
        incomplete[existingIndex] = captureData;
      } else {
        // Add new
        incomplete.push(captureData);
      }
      
      localStorage.setItem('incompletePoles', JSON.stringify(incomplete));
    }
  }, [captureData]);

  const updateData = (updates) => {
    setCaptureData(prev => ({
      ...prev,
      data: {
        ...prev.data,
        ...updates
      },
      // If pole number is updated, also update it at the root level for dashboard display
      ...(updates.poleNumber ? { poleNumber: updates.poleNumber } : {}),
      currentStep,
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Update the saved current step
      setCaptureData(prev => ({
        ...prev,
        currentStep: nextStep,
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      // Update the saved current step
      setCaptureData(prev => ({
        ...prev,
        currentStep: prevStep,
        lastUpdated: new Date().toISOString()
      }));
    } else {
      onBack();
    }
  };

  const handleComplete = async () => {
    // Mark as complete and save
    const completedData = {
      ...captureData,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    
    await saveToIndexedDB(completedData);
    
    // Save to completed list
    const completed = JSON.parse(localStorage.getItem('completedPoles') || '[]');
    completed.push(completedData);
    localStorage.setItem('completedPoles', JSON.stringify(completed));
    
    // Remove from incomplete list
    const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
    const filtered = incomplete.filter(p => p.id !== captureData.id);
    localStorage.setItem('incompletePoles', JSON.stringify(filtered));
    
    onComplete();
  };

  const CurrentStepComponent = WIZARD_STEPS[currentStep - 1].component;

  return (
    <div className="wizard-capture">
      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        Step {currentStep} of {WIZARD_STEPS.length}
      </div>

      {/* Current Step Component */}
      <CurrentStepComponent
        data={captureData.data}
        onUpdate={updateData}
        onNext={handleNext}
        onBack={handleBack}
        onComplete={handleComplete}
        isFirstStep={currentStep === 1}
        isLastStep={currentStep === WIZARD_STEPS.length}
      />
    </div>
  );
}

export default WizardCapture;