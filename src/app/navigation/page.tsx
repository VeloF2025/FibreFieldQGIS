/**
 * Navigation Page for FibreField Home Drop Field Workers
 * 
 * Main entry point for GPS-guided navigation to assigned home drop locations
 * with QGIS/QField compatibility and touch-optimized interface.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Map as MapIcon, 
  List, 
  Settings, 
  Download,
  FileText,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavigationInterface } from '@/components/navigation/navigation-interface';
import { GPSStatus } from '@/components/navigation/gps-status';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { homeDropAssignmentService } from '@/services/home-drop-assignment.service';
import { mappingService } from '@/services/navigation/mapping.service';
import { generateDemoAssignments } from '@/components/navigation/demo-assignments';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import type { HomeDropAssignment } from '@/types/home-drop.types';

/**
 * Offline Map Manager Component
 */
function OfflineMapManager({ className }: { className?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{
    tileCount: number;
    cacheSize: number;
    isOffline: boolean;
  }>({ tileCount: 0, cacheSize: 0, isOffline: false });

  useEffect(() => {
    const subscription = mappingService.status$.subscribe((status) => {
      setCacheStatus({
        tileCount: status.offlineTileCount,
        cacheSize: status.cacheSize,
        isOffline: status.isOffline
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDownloadOfflineMaps = async () => {
    try {
      setIsDownloading(true);
      
      // Download tiles for Toronto area (example bounds)
      const bounds = {
        north: 43.7532,
        south: 43.5532,
        east: -79.2832,
        west: -79.4832
      };
      
      await mappingService.downloadOfflineTiles(bounds, 10, 16);
    } catch (error) {
      log.error('Failed to download offline maps:', {}, "Page", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    await mappingService.clearOfflineCache();
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Offline Maps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {cacheStatus.tileCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Cached Tiles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatCacheSize(cacheStatus.cacheSize)}
            </div>
            <div className="text-sm text-gray-600">Cache Size</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={cacheStatus.isOffline ? "success" : "secondary"}>
            {cacheStatus.isOffline ? "Offline Ready" : "Online Mode"}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownloadOfflineMaps}
            disabled={isDownloading}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download Maps'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClearCache}
            disabled={cacheStatus.tileCount === 0}
          >
            <Archive className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          Downloads map tiles for offline use. Requires internet connection.
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Export Options Component
 */
function ExportOptions({ assignments }: { assignments: HomeDropAssignment[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportGeoPackage = async () => {
    try {
      setIsExporting(true);
      
      // Export assignments to GeoPackage format
      const geoPackage = await mappingService.exportToGeoPackage(assignments, []);
      
      // Download file
      const url = URL.createObjectURL(geoPackage);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fibrefield-assignments-${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      log.error('Failed to export GeoPackage:', {}, "Page", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          QGIS Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Export assignment data for use in QGIS or QField mobile app.
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">GeoPackage Export</div>
            <div className="text-sm text-gray-600">
              {assignments.length} assignments ready
            </div>
          </div>
          <Button
            onClick={handleExportGeoPackage}
            disabled={isExporting || assignments.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-sm">
          <div className="font-medium mb-1">Export includes:</div>
          <ul className="text-gray-600 space-y-1">
            <li>• Assignment locations (EPSG:4326)</li>
            <li>• Customer information</li>
            <li>• Pole connections</li>
            <li>• Priority and status data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Navigation Page Component
 */
export default function NavigationPage() {
  const [assignments, setAssignments] = useState<HomeDropAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('navigation');
  const [selectedAssignment, setSelectedAssignment] = useState<HomeDropAssignment | null>(null);

  // Load assignments on mount
  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, we'll use generated demo assignments
      // In production, this should load from homeDropAssignmentService
      const assignmentList = generateDemoAssignments();
      setAssignments(assignmentList);
      
      // Uncomment below for production:
      // const assignmentList = await homeDropAssignmentService.getAllAssignments();
      // setAssignments(assignmentList);
    } catch (error) {
      log.error('Failed to load assignments:', {}, "Page", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentSelect = (assignment: HomeDropAssignment) => {
    setSelectedAssignment(assignment);
  };

  const handleNavigationComplete = (assignmentId: string) => {
    // Mark assignment as completed
    log.info('Navigation completed for assignment:', assignmentId, {}, "Page");
    // Reload assignments to reflect status change
    loadAssignments();
  };

  if (loading) {
    return (
      <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-600">Loading navigation...</div>
              </div>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-500" />
            Field Navigation
          </h1>
          <p className="text-gray-600 mt-1">
            GPS-guided navigation for home drop installations
          </p>
        </div>
        
        {assignments.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {assignments.filter(a => a.status === 'pending').length} pending assignments
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Navigate
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="w-4 h-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="gps" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            GPS Status
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        {/* Navigation Tab */}
        <TabsContent value="navigation">
          <NavigationInterface
            assignments={assignments}
            onAssignmentSelect={handleAssignmentSelect}
            onNavigationComplete={handleNavigationComplete}
            showMap={true}
          />
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <InteractiveMap
                assignments={assignments}
                height="600px"
                showNavigation={true}
                showGPSTracker={true}
                showLayerToggle={true}
                onMarkerClick={(type, id) => {
                  if (type === 'assignment') {
                    const assignment = assignments.find(a => a.id === id);
                    if (assignment) {
                      handleAssignmentSelect(assignment);
                      setActiveTab('navigation');
                    }
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPS Status Tab */}
        <TabsContent value="gps" className="space-y-6">
          <GPSStatus
            showCoordinates={true}
            showBatterySettings={true}
            showRefreshButton={true}
          />
          
          {/* GPS Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>GPS Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-sm">Accuracy Requirements</div>
                    <div className="text-sm text-gray-600">
                      • Excellent: ≤3m (ideal for field work)
                    </div>
                    <div className="text-sm text-gray-600">
                      • Good: ≤8m (acceptable for navigation)
                    </div>
                    <div className="text-sm text-gray-600">
                      • Fair: ≤15m (general location)
                    </div>
                    <div className="text-sm text-gray-600">
                      • Poor: &gt;15m (not recommended)
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-sm">Battery Usage</div>
                    <div className="text-sm text-gray-600">
                      • High accuracy: More battery usage
                    </div>
                    <div className="text-sm text-gray-600">
                      • Standard mode: Balanced performance
                    </div>
                    <div className="text-sm text-gray-600">
                      • Optimized mode: Extended battery life
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">Tips for better GPS:</div>
                <ul className="text-gray-600 space-y-1">
                  <li>• Clear view of sky improves accuracy</li>
                  <li>• Avoid tall buildings and dense tree cover</li>
                  <li>• Wait 30-60 seconds for signal to stabilize</li>
                  <li>• Enable high accuracy for field measurements</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OfflineMapManager />
            <ExportOptions assignments={assignments} />
          </div>

          {/* Integration Info */}
          <Card>
            <CardHeader>
              <CardTitle>QGIS/QField Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                FibreField navigation data is compatible with professional GIS software:
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-medium text-sm">QGIS Desktop</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Import exported GeoJSON files</li>
                    <li>• Coordinate system: EPSG:4326 (WGS84)</li>
                    <li>• Full attribute data included</li>
                    <li>• Compatible with QGIS 3.x</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-sm">QField Mobile</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Load projects in field conditions</li>
                    <li>• Offline map support</li>
                    <li>• GPS tracking and positioning</li>
                    <li>• Data collection capabilities</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">Supported formats:</div>
                <div className="text-gray-600">
                  GeoJSON, KML, GPX (for GPS devices), and Shapefile (on request)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}