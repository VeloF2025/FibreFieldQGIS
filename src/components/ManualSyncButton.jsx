import React, { useState } from 'react';
import { connectionMonitor } from '../utils/connectionMonitor';
import { getPendingSyncCount } from '../utils/storageMonitor';

function ManualSyncButton({ onSyncComplete }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');

  const handleManualSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    
    const pendingCount = getPendingSyncCount();
    if (pendingCount === 0) {
      setSyncResult('No captures to sync');
      setTimeout(() => setSyncResult(''), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncResult('');
    
    try {
      await connectionMonitor.autoSync();
      setSyncResult(`✅ ${pendingCount} capture${pendingCount !== 1 ? 's' : ''} synced successfully`);
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      setSyncResult('❌ Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncResult(''), 5000);
    }
  };

  const pendingCount = getPendingSyncCount();
  const isOnline = navigator.onLine;

  return (
    <div className="manual-sync-container">
      <button
        className={`btn-sync ${!isOnline || pendingCount === 0 ? 'disabled' : ''}`}
        onClick={handleManualSync}
        disabled={isSyncing || !isOnline || pendingCount === 0}
      >
        {isSyncing ? '🔄 Syncing...' : 
         !isOnline ? '📡 Offline' :
         pendingCount === 0 ? '✅ All Synced' : 
         `📤 Sync ${pendingCount} Capture${pendingCount !== 1 ? 's' : ''}`}
      </button>
      
      {syncResult && (
        <div className={`sync-result ${syncResult.includes('❌') ? 'error' : 'success'}`}>
          {syncResult}
        </div>
      )}
    </div>
  );
}

export default ManualSyncButton;