import React, { useState, useEffect } from 'react';
import { getStorageInfo, getPendingSyncCount, checkStorageWarning } from '../utils/storageMonitor';
import { connectionMonitor } from '../utils/connectionMonitor';
import ManualSyncButton from './ManualSyncButton';

function StorageStatus() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [warning, setWarning] = useState({ warning: false });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    updateStorageInfo();
    
    // Update every 30 seconds
    const interval = setInterval(updateStorageInfo, 30000);
    
    // Listen for connection changes
    const unsubscribe = connectionMonitor.addListener((status) => {
      setIsOnline(status === 'online');
      if (status === 'online') {
        setLastSyncTime(new Date().toLocaleTimeString());
        // Refresh after sync
        setTimeout(updateStorageInfo, 2000);
      }
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const updateStorageInfo = async () => {
    const storage = await getStorageInfo();
    const pending = getPendingSyncCount();
    const warningInfo = await checkStorageWarning();
    
    setStorageInfo(storage);
    setPendingCount(pending);
    setWarning(warningInfo);
  };

  if (!storageInfo) return null;

  return (
    <div className="storage-status">
      <div className="storage-info">
        <div className="storage-item">
          <span className="label">Storage:</span>
          <span className={`value ${warning.warning ? 'warning' : ''}`}>
            {storageInfo.usageMB}MB / {storageInfo.quotaMB}MB ({storageInfo.percentUsed}%)
          </span>
        </div>
        
        <div className="storage-item">
          <span className="label">Pending Sync:</span>
          <span className={`value ${pendingCount > 0 ? 'pending' : ''}`}>
            {pendingCount} pole{pendingCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="storage-item">
          <span className="label">Connection:</span>
          <span className={`value ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
        
        {lastSyncTime && (
          <div className="storage-item">
            <span className="label">Last Sync:</span>
            <span className="value">{lastSyncTime}</span>
          </div>
        )}
      </div>
      
      {warning.warning && (
        <div className="storage-warning">
          ⚠️ {warning.message}
        </div>
      )}
      
      {pendingCount > 0 && !isOnline && (
        <div className="sync-warning">
          📡 {pendingCount} capture{pendingCount !== 1 ? 's' : ''} waiting to sync when online
        </div>
      )}
      
      {pendingCount > 0 && (
        <ManualSyncButton onSyncComplete={updateStorageInfo} />
      )}
    </div>
  );
}

export default StorageStatus;