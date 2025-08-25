import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const IncompletePoles = ({ projectId, onResumeCapture }) => {
  const [incompletePoles, setIncompletePoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncompletePoles();
  }, [projectId]);

  const loadIncompletePoles = async () => {
    if (!projectId) {
      setIncompletePoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Get both incomplete and in-progress poles
      const q1 = query(
        collection(db, 'pole-plantings-staging'),
        where('projectId', '==', projectId),
        where('status', '==', 'incomplete')
      );
      
      const q2 = query(
        collection(db, 'pole-plantings-staging'),
        where('projectId', '==', projectId),
        where('status', '==', 'in-progress')
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      const poles = [
        ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Sort by most recent first
      poles.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });

      setIncompletePoles(poles);
    } catch (error) {
      console.error('Error loading incomplete poles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (pole) => {
    onResumeCapture(pole);
  };

  const handleDelete = async (poleId) => {
    if (!window.confirm('Are you sure you want to delete this incomplete pole capture?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'pole-plantings-staging', poleId));
      setIncompletePoles(prev => prev.filter(p => p.id !== poleId));
    } catch (error) {
      console.error('Error deleting pole:', error);
      alert('Error deleting pole. Please try again.');
    }
  };

  const getCompletionStatus = (pole) => {
    const photoTypes = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
    const capturedPhotos = photoTypes.filter(type => pole.photos?.[type]);
    const hasGPS = Boolean(pole.gpsLocation);
    const hasPoleNumber = Boolean(pole.poleNumber?.trim());

    return {
      photos: capturedPhotos.length,
      totalPhotos: photoTypes.length,
      hasGPS,
      hasPoleNumber,
      isComplete: capturedPhotos.length === photoTypes.length && hasGPS && hasPoleNumber
    };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="incomplete-poles">
        <h3>Loading incomplete poles...</h3>
      </div>
    );
  }

  if (incompletePoles.length === 0) {
    return (
      <div className="incomplete-poles">
        <h3>Incomplete Poles</h3>
        <p className="no-poles">No incomplete pole captures found.</p>
      </div>
    );
  }

  return (
    <div className="incomplete-poles">
      <h3>Incomplete Poles ({incompletePoles.length})</h3>
      <div className="poles-list">
        {incompletePoles.map(pole => {
          const status = getCompletionStatus(pole);
          
          return (
            <div key={pole.id} className="pole-item">
              <div className="pole-header">
                <h4>{pole.poleNumber || 'No Pole Number'}</h4>
                <span className="pole-date">
                  {formatDate(pole.createdAt)}
                </span>
              </div>

              <div className="pole-status">
                <div className="status-item">
                  <span className={`status-indicator ${status.hasPoleNumber ? 'complete' : 'incomplete'}`}>
                    {status.hasPoleNumber ? '✓' : '○'}
                  </span>
                  Pole Number
                </div>

                <div className="status-item">
                  <span className={`status-indicator ${status.hasGPS ? 'complete' : 'incomplete'}`}>
                    {status.hasGPS ? '✓' : '○'}
                  </span>
                  GPS Location
                </div>

                <div className="status-item">
                  <span className={`status-indicator ${status.photos === status.totalPhotos ? 'complete' : 'incomplete'}`}>
                    {status.photos === status.totalPhotos ? '✓' : `${status.photos}/${status.totalPhotos}`}
                  </span>
                  Photos
                </div>
              </div>

              <div className="pole-actions">
                <button 
                  onClick={() => handleResume(pole)}
                  className="resume-button"
                >
                  Continue Capture
                </button>
                <button 
                  onClick={() => handleDelete(pole.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncompletePoles;