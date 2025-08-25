// Storage monitoring utilities
export const getStorageInfo = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const percentUsed = (estimate.usage / estimate.quota) * 100;
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: Math.round(percentUsed),
        usageMB: Math.round(estimate.usage / (1024 * 1024)),
        quotaMB: Math.round(estimate.quota / (1024 * 1024))
      };
    } catch (error) {
      console.error('Error estimating storage:', error);
      return null;
    }
  }
  return null;
};

export const getPendingSyncCount = () => {
  const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
  // Count only completed captures that haven't been synced
  return incomplete.filter(pole => {
    const capturedPhotos = [
      pole.data?.beforePhoto?.captured,
      pole.data?.depthPhoto?.captured,
      pole.data?.compactionPhoto?.captured,
      pole.data?.concretePhoto?.captured,
      pole.data?.frontPhoto?.captured,
      pole.data?.sidePhoto?.captured
    ].filter(Boolean).length;
    
    return capturedPhotos === 6 && pole.status === 'incomplete';
  }).length;
};

export const checkStorageWarning = async () => {
  const storageInfo = await getStorageInfo();
  if (storageInfo && storageInfo.percentUsed >= 80) {
    return {
      warning: true,
      message: `Storage ${storageInfo.percentUsed}% full. Please sync soon.`,
      percentUsed: storageInfo.percentUsed
    };
  }
  return { warning: false };
};