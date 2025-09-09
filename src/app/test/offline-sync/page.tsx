'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { offlineSyncTestService, type OfflineSyncTestSuite, type SyncTestResult } from '@/services/offline-sync-test.service';

export default function OfflineSyncTestPage() {
  const [testSuite, setTestSuite] = useState<OfflineSyncTestSuite | null>(null);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runTests = async () => {
    setRunning(true);
    setTestSuite(null);
    setCurrentTest('Initializing test suite...');
    
    try {
      // Run the test suite
      const results = await offlineSyncTestService.runFullTestSuite();
      setTestSuite(results);
      setCurrentTest('');
    } catch (error) {
      console.error('Test suite failed:', error);
      setCurrentTest('Test suite failed to complete');
    } finally {
      setRunning(false);
    }
  };

  const downloadReport = () => {
    if (!testSuite) return;
    
    const report = offlineSyncTestService.generateHTMLReport(testSuite);
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-sync-test-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
  };

  const getTestIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Offline Sync Testing</h1>
          <p className="text-gray-600">Comprehensive test suite for offline synchronization</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This test suite validates offline data persistence, synchronization queues, conflict resolution, 
          and performance under various network conditions. Tests are non-destructive and use isolated test data.
        </AlertDescription>
      </Alert>

      {/* Control Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Run all 8 offline synchronization tests
              </p>
              {currentTest && (
                <p className="text-sm text-blue-600 flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {currentTest}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={runTests}
                disabled={running}
                className="flex items-center gap-2"
              >
                {running ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Run Test Suite
                  </>
                )}
              </Button>
              {testSuite && (
                <Button
                  variant="outline"
                  onClick={downloadReport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {testSuite && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tests</p>
                    <p className="text-2xl font-bold">{testSuite.totalTests}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Passed</p>
                    <p className="text-2xl font-bold text-green-600">{testSuite.passed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{testSuite.failed}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold">
                      {((testSuite.passed / testSuite.totalTests) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Progress 
                    value={(testSuite.passed / testSuite.totalTests) * 100} 
                    className="w-16 h-2"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-2xl font-bold">
                      {(testSuite.duration / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testSuite.results.map((test, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      test.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getTestIcon(test.passed)}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {test.testName}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {test.details}
                          </p>
                          {test.errors && test.errors.length > 0 && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                              <p className="font-medium text-red-800 mb-1">Errors:</p>
                              <ul className="list-disc list-inside text-red-700">
                                {test.errors.map((error, i) => (
                                  <li key={i}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(test.passed)}>
                          {test.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {test.duration}ms
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!testSuite && !running && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Test Results Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Click "Run Test Suite" to start testing offline synchronization capabilities
            </p>
            <Button onClick={runTests}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Test Suite
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}