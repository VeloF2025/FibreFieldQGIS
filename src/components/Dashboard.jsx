import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import StorageStatus from './StorageStatus';
import LoadingSpinner from './LoadingSpinner';

function Dashboard({ onNewCapture, onResumeCapture, selectedProject: initialProject }) {
  const [projects, setProjects] = useState([]);
  const [incompletePoles, setIncompletePoles] = useState([]);
  const [recentCaptures, setRecentCaptures] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(initialProject);

  useEffect(() => {
    loadProjects();
    loadIncompletePoles();
    loadRecentCaptures();
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    setSelectedProject(initialProject);
  }, [initialProject]);

  // Refresh data when component becomes visible (for when returning from capture)
  useEffect(() => {
    const handleFocus = () => {
      loadIncompletePoles();
      loadRecentCaptures();
    };

    window.addEventListener('focus', handleFocus);
    
    // Also refresh when navigating back
    loadIncompletePoles();
    loadRecentCaptures();

    return () => window.removeEventListener('focus', handleFocus);
  });

  const loadProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter to only show the "Test Project" for now
      const testProject = projectsList.find(project => {
        const title = (project.title || project.name || '');
        return title === 'Test Project';
      });
      
      // Only show the Test Project if it exists
      if (testProject) {
        setProjects([testProject]);
      } else {
        // If Test Project doesn't exist in Firebase, create a dummy one
        const dummyTestProject = [
          { 
            id: 'test-project', 
            title: 'Test Project', 
            description: 'This is a test project for field testing the pole planting app',
            client: { name: 'Test Client' }, 
            status: 'active' 
          }
        ];
        setProjects(dummyTestProject);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // Fallback test project if Firebase fails
      const testProject = [
        { 
          id: 'test-project', 
          title: 'Test Project', 
          description: 'This is a test project for field testing the pole planting app',
          client: { name: 'Test Client' }, 
          status: 'active' 
        }
      ];
      setProjects(testProject);
    }
  };

  const loadIncompletePoles = () => {
    // Load from IndexedDB
    const saved = localStorage.getItem('incompletePoles');
    if (saved) {
      const poles = JSON.parse(saved);
      setIncompletePoles(poles);
    }
    setLoading(false);
  };

  const loadRecentCaptures = () => {
    // Load recent completed captures from IndexedDB
    const saved = localStorage.getItem('completedPoles');
    if (saved) {
      const completed = JSON.parse(saved);
      // Get last 5
      setRecentCaptures(completed.slice(-5).reverse());
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    // Also update the App state
    localStorage.setItem('lastSelectedProject', JSON.stringify(project));
  };

  const filteredIncomplete = incompletePoles.filter(pole => 
    pole.poleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressText = (pole) => {
    const steps = [
      pole.data?.beforePhoto?.captured,
      pole.data?.depthPhoto?.captured,
      pole.data?.compactionPhoto?.captured,
      pole.data?.concretePhoto?.captured,
      pole.data?.frontPhoto?.captured,
      pole.data?.sidePhoto?.captured
    ];
    const completed = steps.filter(Boolean).length;
    return `${completed}/6 photos`;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="dashboard">
      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search pole number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Project Selection for New Capture */}
      {!selectedProject && (
        <div className="section">
          <h2>Select Project</h2>
          <div className="project-grid">
            {projects.map(project => (
              <button
                key={project.id}
                className="project-card"
                onClick={() => handleProjectSelect(project)}
              >
                <h3>{project.title || project.name}</h3>
                <p>{project.description || 'No description'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <>
          {/* Storage Status */}
          <StorageStatus />
          
          {/* Current Project */}
          <div className="current-project">
            <div className="project-info">
              <span className="project-label">Current Project</span>
              <h3>{selectedProject.title || selectedProject.name}</h3>
              {selectedProject.description && (
                <p className="project-description">{selectedProject.description}</p>
              )}
              <button 
                className="btn-change-project"
                onClick={() => setSelectedProject(null)}
              >
                Change Project
              </button>
            </div>
          </div>
          
          {/* New Capture Button - Separate Section */}
          <div className="new-capture-section">
            <button 
              className="btn-primary btn-new-capture"
              onClick={() => onNewCapture(selectedProject)}
            >
              <span>+</span> New Capture
            </button>
          </div>

          {/* Main Content Area */}
          <div className="dashboard-content">
            {/* Continue Capture Section */}
            {filteredIncomplete.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <h2>Incomplete Captures</h2>
                  <span className="count-badge">{filteredIncomplete.length}</span>
                </div>
                <div className="incomplete-list">
                  {filteredIncomplete.map(pole => (
                    <div key={pole.id} className="incomplete-card">
                      <div className="pole-info">
                        <h3>{pole.poleNumber || 'No pole number'}</h3>
                        <div className="pole-meta">
                          <span className="progress">{getProgressText(pole)}</span>
                          <span className="separator">•</span>
                          <span className="time">{getTimeAgo(pole.lastUpdated)}</span>
                        </div>
                      </div>
                      <button
                        className="btn-continue"
                        onClick={() => onResumeCapture(pole)}
                      >
                        Continue
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Captures */}
            {recentCaptures.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <h2>Recently Completed</h2>
                  <span className="count-badge success">{recentCaptures.length}</span>
                </div>
                <div className="recent-list">
                  {recentCaptures.map(pole => (
                    <div key={pole.id} className="recent-card">
                      <div className="recent-icon">
                        <span>✓</span>
                      </div>
                      <div className="recent-info">
                        <h4>{pole.data?.poleNumber || 'No pole number'}</h4>
                        <p className="time">Completed {getTimeAgo(pole.completedAt)}</p>
                      </div>
                      <div className="photo-count">
                        <span>📷 6/6</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty States */}
            {filteredIncomplete.length === 0 && recentCaptures.length === 0 && !searchTerm && (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <h3>Ready to start capturing</h3>
                <p>Tap the "New Capture" button to begin documenting pole installations</p>
              </div>
            )}

            {filteredIncomplete.length === 0 && searchTerm && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No results found</h3>
                <p>No poles found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingSpinner message="Loading projects..." fullScreen={true} />
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Logged in as: Dev User</p>
      </footer>
    </div>
  );
}

export default Dashboard;