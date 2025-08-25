import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import WizardCapture from './components/WizardCapture';
import HelpButton from './components/HelpButton';
import NetworkStatus from './components/NetworkStatus';
import SyncStatus from './components/SyncStatus';
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [resumingPole, setResumingPole] = useState(null);

  // Load last selected project from localStorage
  useEffect(() => {
    const lastProject = localStorage.getItem('lastSelectedProject');
    if (lastProject) {
      setSelectedProject(JSON.parse(lastProject));
    }
  }, []);

  const handleNewCapture = (project) => {
    setSelectedProject(project);
    setResumingPole(null);
    setCurrentView('capture');
    localStorage.setItem('lastSelectedProject', JSON.stringify(project));
  };

  const handleResumeCapture = (poleData) => {
    setResumingPole(poleData);
    setCurrentView('capture');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setResumingPole(null);
  };

  const handleCaptureComplete = () => {
    setCurrentView('dashboard');
    setResumingPole(null);
  };

  return (
    <div className="app">
      <NetworkStatus />
      
      <div className="app-header">
        <h1>FibreField</h1>
        <p>Pole Installation Capture</p>
        <div className="header-sync-status">
          <SyncStatus />
        </div>
      </div>

      <div className="app-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            onNewCapture={handleNewCapture}
            onResumeCapture={handleResumeCapture}
            selectedProject={selectedProject}
          />
        )}

        {currentView === 'capture' && (
          <WizardCapture 
            project={selectedProject}
            resumingPole={resumingPole}
            onBack={handleBackToDashboard}
            onComplete={handleCaptureComplete}
          />
        )}
      </div>
      
      <HelpButton />
    </div>
  );
}

export default App
