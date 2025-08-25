import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ProjectSelector = ({ onProjectSelect, selectedProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsList = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter to only show the "Test Project" for now
        const testProject = projectsList.find(project => {
          const title = (project.title || project.name || '');
          return title === 'Test Project';
        });
        
        setProjects(testProject ? [testProject] : []);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="project-selector">
        <label>Loading projects...</label>
      </div>
    );
  }

  return (
    <div className="project-selector">
      <label htmlFor="project-select">Select Project:</label>
      <select 
        id="project-select"
        value={selectedProject || ''} 
        onChange={(e) => onProjectSelect(e.target.value)}
        className="project-dropdown"
      >
        <option value="">Choose a project...</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.title || project.name || project.id}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSelector;