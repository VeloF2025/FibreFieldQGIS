'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/database';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { 
  WifiIcon, 
  WifiOffIcon, 
  DatabaseIcon, 
  CloudIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  TrashIcon
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  time?: number;
}

export default function OfflineTestPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [localData, setLocalData] = useState<any[]>([]);
  const [firebaseData, setFirebaseData] = useState<any[]>([]);

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const runOfflineTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];
    
    // Test 1: IndexedDB Write
    const test1: TestResult = { name: 'IndexedDB Write', status: 'running' };
    results.push(test1);
    setTestResults([...results]);
    
    try {
      const startTime = Date.now();
      const testData = {
        type: 'test_capture',
        timestamp: new Date().toISOString(),
        data: { test: 'offline_write', random: Math.random() }
      };
      
      await db.pole_captures.add({
        id: `test-${Date.now()}`,
        ...testData,
        status: 'draft',
        syncStatus: 'pending'
      });
      
      test1.status = 'passed';
      test1.time = Date.now() - startTime;
      test1.message = `Written in ${test1.time}ms`;
    } catch (error) {
      test1.status = 'failed';
      test1.message = error instanceof Error ? error.message : 'Unknown error';
    }
    setTestResults([...results]);
    
    // Test 2: IndexedDB Read
    const test2: TestResult = { name: 'IndexedDB Read', status: 'running' };
    results.push(test2);
    setTestResults([...results]);
    
    try {
      const startTime = Date.now();
      const captures = await db.pole_captures.toArray();
      
      test2.status = 'passed';
      test2.time = Date.now() - startTime;
      test2.message = `Read ${captures.length} items in ${test2.time}ms`;
      setLocalData(captures);
    } catch (error) {
      test2.status = 'failed';
      test2.message = error instanceof Error ? error.message : 'Unknown error';
    }
    setTestResults([...results]);
    
    // Test 3: Service Worker Cache
    const test3: TestResult = { name: 'Service Worker Cache', status: 'running' };
    results.push(test3);
    setTestResults([...results]);
    
    try {
      const startTime = Date.now();
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && registration.active) {
        test3.status = 'passed';
        test3.time = Date.now() - startTime;
        test3.message = 'Service worker active';
      } else {
        test3.status = 'failed';
        test3.message = 'Service worker not active';
      }
    } catch (error) {
      test3.status = 'failed';
      test3.message = error instanceof Error ? error.message : 'Unknown error';
    }
    setTestResults([...results]);
    
    // Test 4: Offline Queue
    const test4: TestResult = { name: 'Offline Queue', status: 'running' };
    results.push(test4);
    setTestResults([...results]);
    
    try {
      const startTime = Date.now();
      const queueData = {
        type: 'queue_test',
        timestamp: new Date().toISOString(),
        syncRequired: true
      };
      
      await db.sync_queue.add({
        id: `queue-${Date.now()}`,
        ...queueData,
        retryCount: 0
      });
      
      const queueItems = await db.sync_queue.toArray();
      
      test4.status = 'passed';
      test4.time = Date.now() - startTime;
      test4.message = `${queueItems.length} items in queue`;
    } catch (error) {
      test4.status = 'failed';
      test4.message = error instanceof Error ? error.message : 'Unknown error';
    }
    setTestResults([...results]);
    
    // Test 5: Firebase Connection (if online)
    if (isOnline) {
      const test5: TestResult = { name: 'Firebase Connection', status: 'running' };
      results.push(test5);
      setTestResults([...results]);
      
      try {
        const startTime = Date.now();
        const testDoc = await addDoc(collection(db, 'test_collection'), {
          test: 'connection',
          timestamp: new Date().toISOString()
        });
        
        // Clean up test document
        await deleteDoc(doc(db, 'test_collection', testDoc.id));
        
        test5.status = 'passed';
        test5.time = Date.now() - startTime;
        test5.message = `Round trip in ${test5.time}ms`;
      } catch (error) {
        test5.status = 'failed';
        test5.message = error instanceof Error ? error.message : 'Unknown error';
      }
      setTestResults([...results]);
    }
    
    // Test 6: Background Sync Registration
    const test6: TestResult = { name: 'Background Sync', status: 'running' };
    results.push(test6);
    setTestResults([...results]);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('test-sync');
        test6.status = 'passed';
        test6.message = 'Background sync registered';
      } else {
        test6.status = 'failed';
        test6.message = 'Background sync not supported';
      }
    } catch (error) {
      test6.status = 'failed';
      test6.message = error instanceof Error ? error.message : 'Unknown error';
    }
    setTestResults([...results]);
    
    setIsRunning(false);
  };

  const clearLocalData = async () => {
    try {
      await db.pole_captures.clear();
      await db.sync_queue.clear();
      setLocalData([]);
      setTestResults([]);
    } catch (error) {
      log.error('Failed to clear local data:', {}, "Page", error);
    }
  };

  const syncData = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline');
      return;
    }
    
    try {
      const queueItems = await db.sync_queue.toArray();
      
      for (const item of queueItems) {
        // Simulate sync to Firebase
        await addDoc(collection(db, 'synced_data'), {
          ...item,
          syncedAt: new Date().toISOString()
        });
        
        // Remove from queue
        await db.sync_queue.delete(item.id);
      }
      
      alert(`Synced ${queueItems.length} items`);
    } catch (error) {
      log.error('Sync failed:', {}, "Page", error);
      alert('Sync failed');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Offline Functionality Test</h1>
        <div className="flex items-center gap-4">
          <Badge 
            variant={isOnline ? "default" : "destructive"}
            className="text-lg px-3 py-1"
          >
            {isOnline ? (
              <>
                <WifiIcon className="w-4 h-4 mr-2" />
                Online
              </>
            ) : (
              <>
                <WifiOffIcon className="w-4 h-4 mr-2" />
                Offline
              </>
            )}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Toggle airplane mode or disconnect network to test offline
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="w-5 h-5" />
              Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runOfflineTests}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Offline Tests'
              )}
            </Button>
            
            <Button
              onClick={syncData}
              disabled={!isOnline}
              variant="outline"
              className="w-full"
            >
              <CloudIcon className="w-4 h-4 mr-2" />
              Sync to Cloud
            </Button>
            
            <Button
              onClick={clearLocalData}
              variant="destructive"
              className="w-full"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Clear Local Data
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No tests run yet</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted"
                  >
                    <span className="font-medium">{result.name}</span>
                    <div className="flex items-center gap-2">
                      {result.status === 'running' && (
                        <RefreshCwIcon className="w-4 h-4 animate-spin text-yellow-500" />
                      )}
                      {result.status === 'passed' && (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      )}
                      {result.status === 'failed' && (
                        <XCircleIcon className="w-4 h-4 text-red-500" />
                      )}
                      {result.message && (
                        <span className="text-xs text-muted-foreground">
                          {result.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Local Data */}
        <Card>
          <CardHeader>
            <CardTitle>Local Storage (IndexedDB)</CardTitle>
          </CardHeader>
          <CardContent>
            {localData.length === 0 ? (
              <p className="text-muted-foreground">No local data</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {localData.map((item, index) => (
                  <div key={index} className="p-2 rounded bg-muted text-xs">
                    <div className="font-mono">{item.id}</div>
                    <div className="text-muted-foreground">
                      Status: {item.status} | Sync: {item.syncStatus || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader>
            <CardTitle>Network & Sync Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Service Worker:</strong> {
                  'serviceWorker' in navigator ? 'Supported' : 'Not Supported'
                }
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertDescription>
                <strong>IndexedDB:</strong> {
                  'indexedDB' in window ? 'Supported' : 'Not Supported'
                }
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertDescription>
                <strong>Background Sync:</strong> {
                  'SyncManager' in window ? 'Supported' : 'Not Supported'
                }
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}