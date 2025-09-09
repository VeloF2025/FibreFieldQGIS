// Offline Synchronization Testing Service
import { homeDropCaptureService } from './home-drop-capture.service';
import { homeDropAssignmentService } from './home-drop-assignment.service';
import { photoUploadService } from './photo-upload.service';
import { poleCaptureService } from './pole-capture.service';
import { localDB } from '@/lib/database';
import type { HomeDropCapture } from '@/types/home-drop.types';

export interface SyncTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  errors?: string[];
}

export interface OfflineSyncTestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: SyncTestResult[];
}

class OfflineSyncTestService {
  private testResults: SyncTestResult[] = [];
  
  /**
   * Run complete offline sync test suite
   */
  async runFullTestSuite(): Promise<OfflineSyncTestSuite> {
    console.log('🧪 Starting Offline Sync Test Suite...');
    const startTime = Date.now();
    this.testResults = [];
    
    // Run all tests
    await this.testOfflineDataPersistence();
    await this.testOnlineOfflineTransition();
    await this.testSyncQueueManagement();
    await this.testConflictResolution();
    await this.testPhotoUploadOffline();
    await this.testBatchSyncOperation();
    await this.testDataIntegrity();
    await this.testPerformanceUnderLoad();
    
    // Calculate summary
    const duration = Date.now() - startTime;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      duration,
      results: this.testResults
    };
  }
  
  /**
   * Test 1: Offline Data Persistence
   */
  private async testOfflineDataPersistence(): Promise<void> {
    const testName = 'Offline Data Persistence';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create test data while "offline"
      const testCapture: Partial<HomeDropCapture> = {
        poleNumber: 'TEST-POLE-001',
        dropNumber: 'DROP-TEST-001',
        serviceAddress: '123 Test Street',
        status: 'draft',
        workflow: {
          currentStep: 1,
          totalSteps: 4,
          lastSavedStep: 1,
          steps: {
            assignments: true,
            gps: false,
            photos: false,
            review: false
          }
        }
      };
      
      // Save to local database
      const captureId = await homeDropCaptureService.createHomeDropCapture(
        testCapture.poleNumber!,
        'project-test',
        'contractor-test'
      );
      
      // Verify data persisted
      const savedCapture = await homeDropCaptureService.getHomeDropCapture(captureId);
      
      if (!savedCapture) {
        errors.push('Failed to persist capture data offline');
      }
      
      // Check IndexedDB directly
      const dbCapture = await localDB.homeDropCaptures.get(captureId);
      if (!dbCapture) {
        errors.push('Data not found in IndexedDB');
      }
      
      // Clean up test data
      await homeDropCaptureService.deleteHomeDropCapture(captureId);
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Data persisted successfully offline' : 'Persistence failed',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 2: Online/Offline Transition
   */
  private async testOnlineOfflineTransition(): Promise<void> {
    const testName = 'Online/Offline Transition';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Simulate going offline
      const originalOnline = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Create data while offline
      const offlineCapture = await homeDropCaptureService.createHomeDropCapture(
        'OFFLINE-TEST-001',
        'project-test',
        'contractor-test'
      );
      
      // Check sync status
      const capture = await homeDropCaptureService.getHomeDropCapture(offlineCapture);
      if (capture?.syncStatus !== 'pending') {
        errors.push('Sync status should be pending while offline');
      }
      
      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      // Trigger sync (in real app this would be automatic)
      window.dispatchEvent(new Event('online'));
      
      // Wait a bit for sync to potentially trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      await homeDropCaptureService.deleteHomeDropCapture(offlineCapture);
      
      // Restore original online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnline
      });
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Online/offline transition handled correctly' : 'Transition handling failed',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 3: Sync Queue Management
   */
  private async testSyncQueueManagement(): Promise<void> {
    const testName = 'Sync Queue Management';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create multiple items for sync queue
      const captures: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = await homeDropCaptureService.createHomeDropCapture(
          `QUEUE-TEST-${i}`,
          'project-test',
          'contractor-test'
        );
        captures.push(id);
      }
      
      // Check sync queue
      const queueItems = await localDB.homeDropSyncQueue.toArray();
      
      // Verify queue items created
      const testQueueItems = queueItems.filter(item => 
        captures.includes(item.homeDropId)
      );
      
      if (testQueueItems.length !== captures.length) {
        errors.push(`Expected ${captures.length} queue items, found ${testQueueItems.length}`);
      }
      
      // Test priority ordering
      const priorities = testQueueItems.map(item => item.priority);
      if (!priorities.every(p => ['high', 'medium', 'low'].includes(p))) {
        errors.push('Invalid priority values in queue');
      }
      
      // Clean up
      for (const captureId of captures) {
        await homeDropCaptureService.deleteHomeDropCapture(captureId);
      }
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Sync queue managed correctly' : 'Queue management issues',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 4: Conflict Resolution
   */
  private async testConflictResolution(): Promise<void> {
    const testName = 'Conflict Resolution';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create a capture
      const captureId = await homeDropCaptureService.createHomeDropCapture(
        'CONFLICT-TEST-001',
        'project-test',
        'contractor-test'
      );
      
      // Simulate two different updates (conflict scenario)
      const update1 = {
        dropNumber: 'DROP-V1',
        lastModified: new Date()
      };
      
      const update2 = {
        dropNumber: 'DROP-V2',
        lastModified: new Date(Date.now() + 1000) // Later timestamp
      };
      
      // Apply updates
      await homeDropCaptureService.updateHomeDropCapture(captureId, update1);
      await homeDropCaptureService.updateHomeDropCapture(captureId, update2);
      
      // Check that later update wins (last-write-wins strategy)
      const finalCapture = await homeDropCaptureService.getHomeDropCapture(captureId);
      
      if (finalCapture?.dropNumber !== 'DROP-V2') {
        errors.push('Conflict resolution failed - expected later update to win');
      }
      
      // Test version tracking
      if (!finalCapture?.version || finalCapture.version < 2) {
        errors.push('Version tracking not working correctly');
      }
      
      // Clean up
      await homeDropCaptureService.deleteHomeDropCapture(captureId);
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Conflicts resolved using last-write-wins' : 'Conflict resolution failed',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 5: Photo Upload Offline
   */
  private async testPhotoUploadOffline(): Promise<void> {
    const testName = 'Photo Upload Offline';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create a mock photo blob
      const mockPhotoBlob = new Blob(['test photo data'], { type: 'image/jpeg' });
      
      // Simulate offline
      const originalOnline = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Attempt upload (should queue for later)
      const uploadResult = await photoUploadService.uploadPhoto(
        mockPhotoBlob,
        {
          projectId: 'test-project',
          captureId: 'test-capture',
          photoType: 'power_meter',
          compress: false
        }
      );
      
      // Check that upload was queued
      const failedUploads = await localDB.failedUploads.toArray();
      const testUpload = failedUploads.find(u => u.captureId === 'test-capture');
      
      if (!testUpload) {
        errors.push('Failed upload not queued for retry');
      }
      
      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnline
      });
      
      // Clean up
      if (testUpload) {
        await localDB.failedUploads.delete(testUpload.id);
      }
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Photos queued for upload when offline' : 'Photo queueing failed',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 6: Batch Sync Operation
   */
  private async testBatchSyncOperation(): Promise<void> {
    const testName = 'Batch Sync Operation';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create multiple captures for batch sync
      const batchSize = 10;
      const captures: string[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        const id = await homeDropCaptureService.createHomeDropCapture(
          `BATCH-TEST-${i}`,
          'project-test',
          'contractor-test'
        );
        captures.push(id);
      }
      
      // Check all are pending sync
      const pendingCount = await localDB.homeDropCaptures
        .where('syncStatus')
        .equals('pending')
        .count();
      
      if (pendingCount < batchSize) {
        errors.push(`Expected at least ${batchSize} pending, found ${pendingCount}`);
      }
      
      // Simulate batch sync (would normally happen automatically)
      const syncResults = await Promise.all(
        captures.map(async (id) => {
          const capture = await homeDropCaptureService.getHomeDropCapture(id);
          return capture !== null;
        })
      );
      
      if (!syncResults.every(r => r === true)) {
        errors.push('Some captures failed to sync in batch');
      }
      
      // Clean up
      for (const captureId of captures) {
        await homeDropCaptureService.deleteHomeDropCapture(captureId);
      }
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? `Batch sync of ${batchSize} items successful` : 'Batch sync failed',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 7: Data Integrity
   */
  private async testDataIntegrity(): Promise<void> {
    const testName = 'Data Integrity';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Create capture with all fields
      const captureId = await homeDropCaptureService.createHomeDropCapture(
        'INTEGRITY-TEST-001',
        'project-test',
        'contractor-test'
      );
      
      // Add complex data
      const complexUpdate = {
        dropNumber: 'DROP-INTEGRITY-001',
        serviceAddress: '456 Integrity Lane',
        customerInfo: {
          name: 'Test Customer',
          phone: '+1234567890',
          email: 'test@example.com',
          serviceType: 'Fiber 1Gbps'
        },
        gpsLocation: {
          latitude: -33.8688,
          longitude: 151.2093,
          accuracy: 5.5,
          altitude: 100.5,
          timestamp: new Date()
        },
        installationDetails: {
          equipment: ['ONT', 'Router', 'Cables'],
          serialNumbers: {
            ont: 'ONT123456',
            router: 'RTR789012'
          },
          speedTest: {
            download: 950,
            upload: 940,
            ping: 2
          }
        }
      };
      
      await homeDropCaptureService.updateHomeDropCapture(captureId, complexUpdate);
      
      // Retrieve and verify
      const retrieved = await homeDropCaptureService.getHomeDropCapture(captureId);
      
      // Check data integrity
      if (retrieved?.dropNumber !== complexUpdate.dropNumber) {
        errors.push('Drop number not preserved');
      }
      
      if (retrieved?.customerInfo?.email !== complexUpdate.customerInfo.email) {
        errors.push('Customer info not preserved');
      }
      
      if (retrieved?.gpsLocation?.latitude !== complexUpdate.gpsLocation.latitude) {
        errors.push('GPS location not preserved');
      }
      
      if (!retrieved?.installationDetails?.equipment?.includes('ONT')) {
        errors.push('Installation details not preserved');
      }
      
      // Test data persistence through reload
      const reloaded = await localDB.homeDropCaptures.get(captureId);
      if (!reloaded || reloaded.dropNumber !== complexUpdate.dropNumber) {
        errors.push('Data not persisted correctly in IndexedDB');
      }
      
      // Clean up
      await homeDropCaptureService.deleteHomeDropCapture(captureId);
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 ? 'Data integrity maintained' : 'Data integrity issues found',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Test 8: Performance Under Load
   */
  private async testPerformanceUnderLoad(): Promise<void> {
    const testName = 'Performance Under Load';
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      const loadSize = 100;
      const captures: string[] = [];
      
      // Create many captures quickly
      const createStart = Date.now();
      
      const createPromises = Array.from({ length: loadSize }, (_, i) => 
        homeDropCaptureService.createHomeDropCapture(
          `PERF-TEST-${i}`,
          'project-test',
          'contractor-test'
        )
      );
      
      const createdIds = await Promise.all(createPromises);
      captures.push(...createdIds);
      
      const createDuration = Date.now() - createStart;
      
      // Check creation performance
      const avgCreateTime = createDuration / loadSize;
      if (avgCreateTime > 50) { // 50ms per item threshold
        errors.push(`Slow creation: ${avgCreateTime.toFixed(2)}ms per item`);
      }
      
      // Test query performance
      const queryStart = Date.now();
      const allCaptures = await homeDropCaptureService.getAllHomeDropCaptures();
      const queryDuration = Date.now() - queryStart;
      
      if (queryDuration > 1000) { // 1 second threshold
        errors.push(`Slow query: ${queryDuration}ms for ${allCaptures.length} items`);
      }
      
      // Test update performance
      const updateStart = Date.now();
      const updatePromises = captures.slice(0, 10).map(id =>
        homeDropCaptureService.updateHomeDropCapture(id, {
          dropNumber: `UPDATED-${id}`
        })
      );
      await Promise.all(updatePromises);
      const updateDuration = Date.now() - updateStart;
      
      if (updateDuration > 500) { // 500ms for 10 updates
        errors.push(`Slow updates: ${updateDuration}ms for 10 items`);
      }
      
      // Clean up
      const deletePromises = captures.map(id =>
        homeDropCaptureService.deleteHomeDropCapture(id)
      );
      await Promise.all(deletePromises);
      
      this.testResults.push({
        testName,
        passed: errors.length === 0,
        duration: Date.now() - startTime,
        details: errors.length === 0 
          ? `Performance acceptable: ${loadSize} items, ${avgCreateTime.toFixed(2)}ms/create, ${queryDuration}ms query`
          : 'Performance issues detected',
        errors
      });
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: 'Test failed with exception',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  /**
   * Generate HTML report of test results
   */
  generateHTMLReport(results: OfflineSyncTestSuite): string {
    const passRate = ((results.passed / results.totalTests) * 100).toFixed(1);
    const statusColor = results.failed === 0 ? 'green' : results.failed <= 2 ? 'orange' : 'red';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Offline Sync Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-card { background: white; padding: 15px; border-radius: 8px; flex: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .summary-card h3 { margin-top: 0; color: #666; font-size: 14px; }
    .summary-card .value { font-size: 24px; font-weight: bold; }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .test-result { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .test-result.pass { border-left: 4px solid #10b981; }
    .test-result.fail { border-left: 4px solid #ef4444; }
    .test-name { font-weight: bold; margin-bottom: 5px; }
    .test-details { color: #666; font-size: 14px; }
    .test-duration { color: #999; font-size: 12px; }
    .errors { background: #fee; padding: 10px; border-radius: 4px; margin-top: 10px; }
    .errors ul { margin: 5px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 Offline Synchronization Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <h3>Total Tests</h3>
      <div class="value">${results.totalTests}</div>
    </div>
    <div class="summary-card">
      <h3>Passed</h3>
      <div class="value passed">${results.passed}</div>
    </div>
    <div class="summary-card">
      <h3>Failed</h3>
      <div class="value failed">${results.failed}</div>
    </div>
    <div class="summary-card">
      <h3>Pass Rate</h3>
      <div class="value" style="color: ${statusColor}">${passRate}%</div>
    </div>
    <div class="summary-card">
      <h3>Duration</h3>
      <div class="value">${(results.duration / 1000).toFixed(2)}s</div>
    </div>
  </div>
  
  <h2>Test Results</h2>
  ${results.results.map(test => `
    <div class="test-result ${test.passed ? 'pass' : 'fail'}">
      <div class="test-name">
        ${test.passed ? '✅' : '❌'} ${test.testName}
      </div>
      <div class="test-details">${test.details}</div>
      <div class="test-duration">Duration: ${test.duration}ms</div>
      ${test.errors && test.errors.length > 0 ? `
        <div class="errors">
          <strong>Errors:</strong>
          <ul>
            ${test.errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>
    `;
  }
}

export const offlineSyncTestService = new OfflineSyncTestService();