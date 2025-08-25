import React, { useState, useEffect } from 'react';
import './SyncStatus.css';

function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'pending', 'error'
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    // Check for pending items in localStorage
    const checkPendingItems = () => {
      const incompletePoles = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
      const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
      const total = incompletePoles.length + pendingUploads.length;
      
      setPendingCount(total);
      if (total > 0 && navigator.onLine) {
        setSyncStatus('pending');
      } else if (total > 0 && !navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('synced');
      }
    };

    // Check on mount and periodically
    checkPendingItems();
    const interval = setInterval(checkPendingItems, 5000);

    // Listen for storage events (changes from other tabs)
    window.addEventListener('storage', checkPendingItems);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkPendingItems);
    };
  }, []);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return '✓';
      case 'syncing':
        return '↻';
      case 'pending':
        return '⏳';
      case 'offline':
        return '⊘';
      case 'error':
        return '⚠';
      default:
        return '•';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'All data synced';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return `${pendingCount} items pending`;
      case 'offline':
        return `${pendingCount} items waiting`;
      case 'error':
        return 'Sync error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`sync-status sync-status-${syncStatus}`}>
      <span className={`sync-icon ${syncStatus === 'syncing' ? 'spinning' : ''}`}>
        {getStatusIcon()}
      </span>
      <span className="sync-text">{getStatusText()}</span>
    </div>
  );
}

export default SyncStatus;