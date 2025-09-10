/**
 * QGIS Integration Dashboard
 * 
 * Admin interface for QGIS/QField data exchange operations.
 * Provides comprehensive import/export functionality for field coordinators.
 * 
 * Key Features:
 * 1. QGIS project import wizard
 * 2. Assignment creation from QGIS data
 * 3. Completed capture export
 * 4. Data validation and conflict resolution
 * 5. Export format selection
 * 6. Progress tracking and status monitoring
 * 7. Integration statistics and reporting
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  Map, 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  Eye,
  Trash2,
  RefreshCw,
  Filter
} from 'lucide-react';

import { qgisIntegrationService } from '@/services/qgis-integration.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { HomeDropCapture } from '@/types/home-drop.types';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { log } from '@/lib/logger';

// Dashboard state interface
interface DashboardState {
  activeTab: string;
  importProgress: number;
  exportProgress: number;
  isImporting: boolean;
  isExporting: boolean;
  lastImport?: Date;
  lastExport?: Date;
  statistics: {
    totalImports: number;
    totalExports: number;
    pendingAssignments: number;
    completedCaptures: number;
    errorCount: number;
  };
}

// Import operation state
interface ImportOperation {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  assignmentsFound: number;
  assignmentsCreated: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

// Export operation state
interface ExportOperation {
  id: string;
  format: 'gpkg' | 'geojson' | 'shp' | 'kml';
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordCount: number;
  fileSize?: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

export default function QGISIntegrationPage() {
  // State management
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    activeTab: 'import',
    importProgress: 0,
    exportProgress: 0,
    isImporting: false,
    isExporting: false,
    statistics: {
      totalImports: 0,
      totalExports: 0,
      pendingAssignments: 0,
      completedCaptures: 0,
      errorCount: 0
    }
  });

  const [importOperations, setImportOperations] = useState<ImportOperation[]>([]);
  const [exportOperations, setExportOperations] = useState<ExportOperation[]>([]);
  const [homeDrops, setHomeDrops] = useState<HomeDropCapture[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportConfig, setExportConfig] = useState({
    format: 'gpkg' as 'gpkg' | 'geojson' | 'shp' | 'kml',
    includePhotos: true,
    includeOnlyCompleted: false,
    customAttributes: {}
  });

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load dashboard data
   */
  const loadDashboardData = async () => {
    try {
      // Load statistics
      const stats = await qgisIntegrationService.getIntegrationStatistics();
      const homeDropStats = await homeDropCaptureService.getStatistics();
      const homeDropData = await homeDropCaptureService.getAllHomeDropCaptures();

      setDashboardState(prev => ({
        ...prev,
        statistics: {
          totalImports: stats.totalImports,
          totalExports: stats.totalExports,
          pendingAssignments: homeDropStats.assigned,
          completedCaptures: homeDropStats.captured + homeDropStats.approved,
          errorCount: homeDropStats.errors
        },
        lastImport: stats.lastImport,
        lastExport: stats.lastExport
      }));

      setHomeDrops(homeDropData);
    } catch (error: unknown) {
      log.error('Failed to load dashboard data:', {}, "Page", error instanceof Error ? error : new Error(String(error)));
    }
  };

  /**
   * Handle QGIS project file import
   */
  const handleProjectImport = async (file: File) => {
    if (!file) return;

    const operationId = `import-${Date.now()}`;
    const operation: ImportOperation = {
      id: operationId,
      filename: file.name,
      status: 'processing',
      progress: 0,
      assignmentsFound: 0,
      assignmentsCreated: 0,
      errors: [],
      startedAt: new Date()
    };

    setImportOperations(prev => [operation, ...prev]);
    setDashboardState(prev => ({ ...prev, isImporting: true, importProgress: 0 }));

    try {
      // Step 1: Read QGIS project (20%)
      setDashboardState(prev => ({ ...prev, importProgress: 20 }));
      const result = await qgisIntegrationService.importQGISProject(file);

      operation.assignmentsFound = result.assignments.length;
      operation.progress = 40;
      updateImportOperation(operation);

      // Step 2: Validate assignments (60%)
      setDashboardState(prev => ({ ...prev, importProgress: 60 }));
      const validAssignments = result.assignments.filter(a => 
        a.poleNumber && a.customer.name && a.customer.address
      );

      if (validAssignments.length === 0) {
        throw new Error('No valid assignments found in QGIS project');
      }

      // Step 3: Create assignments (80%)
      setDashboardState(prev => ({ ...prev, importProgress: 80 }));
      const createdIds = await qgisIntegrationService.createAssignmentsFromQGIS(
        validAssignments,
        'current-user', // Replace with actual user ID
        'QGIS Import'
      );

      // Step 4: Complete (100%)
      setDashboardState(prev => ({ ...prev, importProgress: 100 }));
      operation.assignmentsCreated = createdIds.length;
      operation.status = 'completed';
      operation.progress = 100;
      operation.completedAt = new Date();

      // Refresh data
      await loadDashboardData();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      operation.status = 'failed';
      operation.errors.push(errorMessage);
    }

    updateImportOperation(operation);
    setDashboardState(prev => ({ ...prev, isImporting: false, importProgress: 0 }));
  };

  /**
   * Handle data export
   */
  const handleDataExport = async () => {
    const operationId = `export-${Date.now()}`;
    const operation: ExportOperation = {
      id: operationId,
      format: exportConfig.format,
      filename: '',
      status: 'processing',
      progress: 0,
      recordCount: 0,
      errors: [],
      startedAt: new Date()
    };

    setExportOperations(prev => [operation, ...prev]);
    setDashboardState(prev => ({ ...prev, isExporting: true, exportProgress: 0 }));

    try {
      // Step 1: Prepare data (25%)
      setDashboardState(prev => ({ ...prev, exportProgress: 25 }));
      const exportData = homeDrops.filter(hd => {
        if (exportConfig.includeOnlyCompleted) {
          return hd.status === 'captured' || hd.status === 'approved';
        }
        return true;
      });

      operation.recordCount = exportData.length;
      operation.progress = 50;
      updateExportOperation(operation);

      // Step 2: Generate export (75%)
      setDashboardState(prev => ({ ...prev, exportProgress: 75 }));
      const exportResult = await qgisIntegrationService.exportToGeoPackage({
        format: exportConfig.format,
        crs: 'EPSG:4326',
        includePhotos: exportConfig.includePhotos,
        includeOnlyCompleted: exportConfig.includeOnlyCompleted,
        customAttributes: exportConfig.customAttributes
      });

      // Step 3: Prepare download (100%)
      setDashboardState(prev => ({ ...prev, exportProgress: 100 }));
      const downloadUrl = URL.createObjectURL(exportResult.data);
      
      operation.filename = exportResult.filename;
      operation.fileSize = exportResult.data.size;
      operation.downloadUrl = downloadUrl;
      operation.status = 'completed';
      operation.progress = 100;
      operation.completedAt = new Date();

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Refresh data
      await loadDashboardData();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      operation.status = 'failed';
      operation.errors.push(errorMessage);
    }

    updateExportOperation(operation);
    setDashboardState(prev => ({ ...prev, isExporting: false, exportProgress: 0 }));
  };

  /**
   * Update import operation
   */
  const updateImportOperation = (operation: ImportOperation) => {
    setImportOperations(prev => 
      prev.map(op => op.id === operation.id ? operation : op)
    );
  };

  /**
   * Update export operation
   */
  const updateExportOperation = (operation: ExportOperation) => {
    setExportOperations(prev => 
      prev.map(op => op.id === operation.id ? operation : op)
    );
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QGIS Integration</h1>
          <p className="text-muted-foreground">
            Import assignments from QGIS and export completed captures
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Imports</p>
                <p className="text-2xl font-bold">{dashboardState.statistics.totalImports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total Exports</p>
                <p className="text-2xl font-bold">{dashboardState.statistics.totalExports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending Assignments</p>
                <p className="text-2xl font-bold">{dashboardState.statistics.pendingAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Completed Captures</p>
                <p className="text-2xl font-bold">{dashboardState.statistics.completedCaptures}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold">{dashboardState.statistics.errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs 
        value={dashboardState.activeTab} 
        onValueChange={(tab) => setDashboardState(prev => ({ ...prev, activeTab: tab }))}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Import QGIS Project</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select QGIS Project File (.qgs or .qgz)</Label>
                <Input
                  type="file"
                  accept=".qgs,.qgz"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={dashboardState.isImporting}
                />
              </div>

              {dashboardState.isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Import Progress</span>
                    <span>{dashboardState.importProgress}%</span>
                  </div>
                  <Progress value={dashboardState.importProgress} />
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={() => selectedFile && handleProjectImport(selectedFile)}
                  disabled={!selectedFile || dashboardState.isImporting}
                >
                  {dashboardState.isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Project
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Make sure your QGIS project contains a layer with assignment data including pole numbers, 
                  customer names, and addresses. The layer should use Point geometry with coordinates in 
                  EPSG:4326 (WGS84) format.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recent Import Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {importOperations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No import operations yet
                  </p>
                ) : (
                  importOperations.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{operation.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {operation.assignmentsFound} assignments found, {operation.assignmentsCreated} created
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(operation.status)}>
                          {operation.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {operation.startedAt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Export Home Drop Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select 
                    value={exportConfig.format} 
                    onValueChange={(value: 'gpkg' | 'geojson' | 'shp' | 'kml') => 
                      setExportConfig(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpkg">GeoPackage (.gpkg) - Recommended for QGIS</SelectItem>
                      <SelectItem value="geojson">GeoJSON (.geojson) - Web friendly</SelectItem>
                      <SelectItem value="shp">Shapefile (.shp) - Legacy format</SelectItem>
                      <SelectItem value="kml">KML (.kml) - Google Earth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Filter</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeOnlyCompleted}
                        onChange={(e) => setExportConfig(prev => ({ 
                          ...prev, 
                          includeOnlyCompleted: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Only completed captures</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportConfig.includePhotos}
                        onChange={(e) => setExportConfig(prev => ({ 
                          ...prev, 
                          includePhotos: e.target.checked 
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Include photo URLs</span>
                    </label>
                  </div>
                </div>
              </div>

              {dashboardState.isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Export Progress</span>
                    <span>{dashboardState.exportProgress}%</span>
                  </div>
                  <Progress value={dashboardState.exportProgress} />
                </div>
              )}

              <Button 
                onClick={handleDataExport}
                disabled={homeDrops.length === 0 || dashboardState.isExporting}
                className="w-full"
              >
                {dashboardState.isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export {homeDrops.length} Home Drops
                  </>
                )}
              </Button>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Exported data will be in EPSG:4326 coordinate system and include all capture details, 
                  installation information, and quality metrics for QGIS analysis and visualization.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recent Export Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportOperations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No export operations yet
                  </p>
                ) : (
                  exportOperations.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Database className="w-5 h-5" />
                        <div>
                          <p className="font-medium">
                            {operation.filename || `${operation.format.toUpperCase()} Export`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {operation.recordCount} records
                            {operation.fileSize && ` • ${formatFileSize(operation.fileSize)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {operation.downloadUrl && operation.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = operation.downloadUrl!;
                              link.download = operation.filename;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge variant={getStatusVariant(operation.status)}>
                          {operation.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {operation.startedAt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import History */}
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {importOperations.map((operation) => (
                    <div key={operation.id} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{operation.filename}</span>
                        <Badge variant={getStatusVariant(operation.status)}>
                          {operation.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Started: {operation.startedAt.toLocaleString()}</p>
                        <p>{operation.assignmentsFound} assignments found</p>
                        <p>{operation.assignmentsCreated} assignments created</p>
                        {operation.errors.length > 0 && (
                          <p className="text-red-500">Errors: {operation.errors.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export History */}
            <Card>
              <CardHeader>
                <CardTitle>Export History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportOperations.map((operation) => (
                    <div key={operation.id} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {operation.format.toUpperCase()} Export
                        </span>
                        <Badge variant={getStatusVariant(operation.status)}>
                          {operation.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Started: {operation.startedAt.toLocaleString()}</p>
                        <p>{operation.recordCount} records exported</p>
                        {operation.fileSize && <p>Size: {formatFileSize(operation.fileSize)}</p>}
                        {operation.errors.length > 0 && (
                          <p className="text-red-500">Errors: {operation.errors.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Integration Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Default Export Format</Label>
                  <Select value="gpkg">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpkg">GeoPackage</SelectItem>
                      <SelectItem value="geojson">GeoJSON</SelectItem>
                      <SelectItem value="shp">Shapefile</SelectItem>
                      <SelectItem value="kml">KML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Default Coordinate System</Label>
                  <Select value="EPSG:4326">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPSG:4326">EPSG:4326 (WGS84)</SelectItem>
                      <SelectItem value="EPSG:3857">EPSG:3857 (Web Mercator)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Data Validation</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Validate geometry on import</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Check for duplicate assignments</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Verify pole existence</span>
                    </label>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Auto-cleanup</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Automatically clean up old import/export operations
                  </p>
                  <Select value="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}