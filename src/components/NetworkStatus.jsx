import React, { useState, useEffect } from 'react';
import './NetworkStatus.css';

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection on mount
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification && isOnline) return null;

  return (
    <div className={`network-status ${isOnline ? 'online' : 'offline'} ${showNotification ? 'show' : ''}`}>
      <div className="network-status-content">
        <span className="network-status-icon">
          {isOnline ? '✓' : '⚠'}
        </span>
        <span className="network-status-text">
          {isOnline ? 'Back Online' : 'Offline Mode - Data will sync when connection returns'}
        </span>
      </div>
    </div>
  );
}

export default NetworkStatus;