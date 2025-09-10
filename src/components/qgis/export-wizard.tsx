/**
 * QGIS Export Wizard Component
 * 
 * Step-by-step wizard for exporting home drop data to QGIS-compatible formats.
 * Provides comprehensive export configuration and quality controls.
 * 
 * Key Features:
 * 1. Multi-step wizard interface
 * 2. Data selection and filtering
 * 3. Format configuration
 * 4. Coordinate system selection
 * 5. Photo and attachment handling
 * 6. Quality validation
 * 7. Preview and confirmation
 * 8. Progress tracking
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Database,
  Map,
  Settings,
  Eye,
  CheckCircle,
  AlertTriangle,
  Filter,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

import { qgisIntegrationService } from '@/services/qgis-integration.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { HomeDropCapture, HomeDropFilterOptions } from '@/types/home-drop.types';

/**
 * Wizard Steps
 */
type WizardStep = 'data-selection' | 'format-config' | 'coordinate-system' | 'preview' | 'export';

/**
 * Export Configuration
 */
interface ExportConfiguration {
  // Data Selection
  includeOnlyCompleted: boolean;
  dateRange: {
    enabled: boolean;
    start?: Date;
    end?: Date;
  };
  statusFilter: string[];
  projectFilter: string[];
  contractorFilter: string[];
  
  // Format Configuration
  format: 'gpkg' | 'geojson' | 'shp' | 'kml';
  filename: string;
  
  // Coordinate System
  targetCRS: string;
  includeOriginalCRS: boolean;
  
  // Content Options
  includePhotos: boolean;
  includePhotoUrls: boolean;
  includeMetadata: boolean;
  includeQualityScores: boolean;
  includeInstallationDetails: boolean;
  includeCustomAttributes: boolean;
  customAttributes: Record<string, any>;
  
  // Quality Controls
  validateGeometry: boolean;
  excludeInvalidRecords: boolean;
  includeValidationReport: boolean;
}

/**
 * Export Preview
 */
interface ExportPreview {
  recordCount: number;
  estimatedFileSize: string;
  coordinateSystem: string;
  includedFields: string[];
  excludedRecords: number;
  validationSummary: {
    valid: number;
    warnings: number;
    errors: number;
  };
}

/**
 * Component Props
 */
interface ExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onExportComplete: (result: { filename: string; downloadUrl: string }) => void;
  preselectedHomeDrops?: HomeDropCapture[];
}

export default function ExportWizard({
  isOpen,
  onClose,
  onExportComplete,
  preselectedHomeDrops
}: ExportWizardProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<WizardStep>('data-selection');
  const [configuration, setConfiguration] = useState<ExportConfiguration>({
    includeOnlyCompleted: true,
    dateRange: { enabled: false },
    statusFilter: [],
    projectFilter: [],
    contractorFilter: [],
    
    format: 'gpkg',
    filename: `fibrefield_homedrops_${new Date().toISOString().split('T')[0]}`,
    
    targetCRS: 'EPSG:4326',
    includeOriginalCRS: false,
    
    includePhotos: true,
    includePhotoUrls: true,
    includeMetadata: true,
    includeQualityScores: true,
    includeInstallationDetails: true,
    includeCustomAttributes: false,
    customAttributes: {},
    
    validateGeometry: true,
    excludeInvalidRecords: true,
    includeValidationReport: true
  });

  const [homeDrops, setHomeDrops] = useState<HomeDropCapture[]>([]);
  const [filteredHomeDrops, setFilteredHomeDrops] = useState<HomeDropCapture[]>([]);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableContractors, setAvailableContractors] = useState<string[]>([]);

  // Load data on component mount
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Update filtered data when configuration changes
  useEffect(() => {
    if (homeDrops.length > 0) {
      filterHomeDrops();
    }
  }, [homeDrops, configuration]);

  /**
   * Load initial data
   */
  const loadData = async () => {
    try {
      let allHomeDrops: HomeDropCapture[];
      
      if (preselectedHomeDrops) {
        allHomeDrops = preselectedHomeDrops;
      } else {
        allHomeDrops = await homeDropCaptureService.getAllHomeDropCaptures();
      }

      setHomeDrops(allHomeDrops);

      // Extract unique projects and contractors
      const projects = [...new Set(allHomeDrops.map(hd => hd.projectId).filter(Boolean))];
      const contractors = [...new Set(allHomeDrops.map(hd => hd.contractorId).filter(Boolean))];
      
      setAvailableProjects(projects);
      setAvailableContractors(contractors);

    } catch (error: unknown) {
      log.error('Failed to load data:', {}, "Exportwizard", error);
    }
  };

  /**
   * Filter home drops based on configuration
   */
  const filterHomeDrops = async () => {
    try {
      const filterOptions: HomeDropFilterOptions = {};

      // Status filter
      if (configuration.includeOnlyCompleted) {
        filterOptions.status = ['captured', 'approved', 'synced'];
      } else if (configuration.statusFilter.length > 0) {
        filterOptions.status = configuration.statusFilter as any[];
      }

      // Date range filter
      if (configuration.dateRange.enabled && 
          configuration.dateRange.start && 
          configuration.dateRange.end) {
        filterOptions.dateRange = {
          start: configuration.dateRange.start,
          end: configuration.dateRange.end
        };
      }

      // Project filter
      if (configuration.projectFilter.length > 0) {
        filterOptions.projectId = configuration.projectFilter;
      }

      // Contractor filter
      if (configuration.contractorFilter.length > 0) {
        filterOptions.contractorId = configuration.contractorFilter;
      }

      // Apply filters
      const filtered = await homeDropCaptureService.filterHomeDropCaptures(filterOptions);
      setFilteredHomeDrops(filtered);

    } catch (error: unknown) {
      log.error('Failed to filter home drops:', {}, "Exportwizard", error);
      setFilteredHomeDrops(homeDrops);
    }
  };

  /**
   * Generate export preview
   */
  const generatePreview = async () => {
    const recordCount = filteredHomeDrops.length;
    const avgRecordSize = 2048; // Estimated bytes per record
    const estimatedBytes = recordCount * avgRecordSize;
    
    let estimatedFileSize = '';
    if (estimatedBytes < 1024) {
      estimatedFileSize = `${estimatedBytes} B`;
    } else if (estimatedBytes < 1024 * 1024) {
      estimatedFileSize = `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      estimatedFileSize = `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }

    // Determine included fields
    const includedFields = [
      'id', 'pole_number', 'customer_name', 'customer_address', 
      'status', 'installation_date', 'technician_name'
    ];

    if (configuration.includeInstallationDetails) {
      includedFields.push('ont_serial', 'router_serial', 'optical_power', 'service_type');
    }

    if (configuration.includeQualityScores) {
      includedFields.push('quality_score', 'photo_quality_score', 'approval_status');
    }

    if (configuration.includePhotos) {
      includedFields.push('photo_count', 'photo_urls');
    }

    // Validation summary (mock for now)
    const validRecords = filteredHomeDrops.filter(hd => 
      hd.gpsLocation && hd.customer.name && hd.customer.address
    );

    const preview: ExportPreview = {
      recordCount,
      estimatedFileSize,
      coordinateSystem: configuration.targetCRS,
      includedFields,
      excludedRecords: homeDrops.length - recordCount,
      validationSummary: {
        valid: validRecords.length,
        warnings: recordCount - validRecords.length,
        errors: 0
      }
    };

    setPreview(preview);
  };

  /**
   * Execute export
   */
  const executeExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Step 1: Validate configuration (20%)
      setExportProgress(20);
      
      // Step 2: Prepare data (40%)
      setExportProgress(40);
      
      // Step 3: Generate export (70%)
      setExportProgress(70);
      const exportResult = await qgisIntegrationService.exportToGeoPackage({
        format: configuration.format,
        crs: configuration.targetCRS,
        includePhotos: configuration.includePhotoUrls,
        includeOnlyCompleted: configuration.includeOnlyCompleted,
        customAttributes: configuration.customAttributes
      });

      // Step 4: Prepare download (100%)
      setExportProgress(100);
      const downloadUrl = URL.createObjectURL(exportResult.data);

      onExportComplete({
        filename: exportResult.filename,
        downloadUrl
      });

      // Close wizard
      onClose();

    } catch (error: unknown) {
      log.error('Export failed:', {}, "Exportwizard", error);
    }

    setIsExporting(false);
    setExportProgress(0);
  };

  /**
   * Navigation helpers
   */
  const goToNextStep = () => {
    const steps: WizardStep[] = ['data-selection', 'format-config', 'coordinate-system', 'preview', 'export'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      
      if (nextStep === 'preview') {
        generatePreview();
      }
    }
  };

  const goToPreviousStep = () => {
    const steps: WizardStep[] = ['data-selection', 'format-config', 'coordinate-system', 'preview', 'export'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const getStepTitle = (step: WizardStep): string => {
    switch (step) {
      case 'data-selection': return 'Data Selection';
      case 'format-config': return 'Format Configuration';
      case 'coordinate-system': return 'Coordinate System';
      case 'preview': return 'Preview & Validate';
      case 'export': return 'Export';
      default: return '';
    }
  };

  const getStepIcon = (step: WizardStep) => {
    switch (step) {
      case 'data-selection': return <Filter className="w-4 h-4" />;
      case 'format-config': return <FileText className="w-4 h-4" />;
      case 'coordinate-system': return <Map className="w-4 h-4" />;
      case 'preview': return <Eye className="w-4 h-4" />;
      case 'export': return <Download className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">QGIS Export Wizard</h2>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">
            Export home drop data for QGIS analysis and visualization
          </p>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            {['data-selection', 'format-config', 'coordinate-system', 'preview', 'export'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded ${
                  step === currentStep 
                    ? 'bg-blue-100 text-blue-700' 
                    : index < ['data-selection', 'format-config', 'coordinate-system', 'preview', 'export'].indexOf(currentStep)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {getStepIcon(step as WizardStep)}
                  <span className="text-sm font-medium">
                    {getStepTitle(step as WizardStep)}
                  </span>
                </div>
                {index < 4 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Data Selection Step */}
          {currentStep === 'data-selection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Data to Export</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Filter */}
                  <div className="space-y-3">
                    <Label>Status Filter</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includeOnlyCompleted}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ 
                              ...prev, 
                              includeOnlyCompleted: !!checked 
                            }))
                          }
                        />
                        <span>Only completed captures</span>
                      </label>
                      {!configuration.includeOnlyCompleted && (
                        <div className="ml-6 space-y-2">
                          {['assigned', 'in_progress', 'captured', 'approved', 'rejected'].map(status => (
                            <label key={status} className="flex items-center space-x-2">
                              <Checkbox
                                checked={configuration.statusFilter.includes(status)}
                                onCheckedChange={(checked) => {
                                  const newFilter = checked
                                    ? [...configuration.statusFilter, status]
                                    : configuration.statusFilter.filter(s => s !== status);
                                  setConfiguration(prev => ({ 
                                    ...prev, 
                                    statusFilter: newFilter 
                                  }));
                                }}
                              />
                              <span className="capitalize">{status.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-3">
                    <Label>Date Range</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.dateRange.enabled}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ 
                              ...prev, 
                              dateRange: { ...prev.dateRange, enabled: !!checked }
                            }))
                          }
                        />
                        <span>Filter by date range</span>
                      </label>
                      {configuration.dateRange.enabled && (
                        <div className="ml-6 space-y-2">
                          <div>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={configuration.dateRange.start?.toISOString().split('T')[0] || ''}
                              onChange={(e) => 
                                setConfiguration(prev => ({ 
                                  ...prev, 
                                  dateRange: { 
                                    ...prev.dateRange, 
                                    start: new Date(e.target.value) 
                                  }
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={configuration.dateRange.end?.toISOString().split('T')[0] || ''}
                              onChange={(e) => 
                                setConfiguration(prev => ({ 
                                  ...prev, 
                                  dateRange: { 
                                    ...prev.dateRange, 
                                    end: new Date(e.target.value) 
                                  }
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Filter */}
                  <div className="space-y-3">
                    <Label>Project Filter</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects</SelectItem>
                        {availableProjects.map(project => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contractor Filter */}
                  <div className="space-y-3">
                    <Label>Contractor Filter</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All contractors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All contractors</SelectItem>
                        {availableContractors.map(contractor => (
                          <SelectItem key={contractor} value={contractor}>
                            {contractor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selection Summary */}
                <Alert className="mt-4">
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    {filteredHomeDrops.length} of {homeDrops.length} home drops will be exported
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Format Configuration Step */}
          {currentStep === 'format-config' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Configure Export Format</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Format Selection */}
                  <div className="space-y-3">
                    <Label>Export Format</Label>
                    <Select 
                      value={configuration.format}
                      onValueChange={(value: 'gpkg' | 'geojson' | 'shp' | 'kml') => 
                        setConfiguration(prev => ({ ...prev, format: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpkg">
                          <div>
                            <div className="font-medium">GeoPackage (.gpkg)</div>
                            <div className="text-sm text-muted-foreground">
                              Recommended for QGIS - Full feature support
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="geojson">
                          <div>
                            <div className="font-medium">GeoJSON (.geojson)</div>
                            <div className="text-sm text-muted-foreground">
                              Web-friendly format - Good for web mapping
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="shp">
                          <div>
                            <div className="font-medium">Shapefile (.shp)</div>
                            <div className="text-sm text-muted-foreground">
                              Legacy format - Limited field lengths
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="kml">
                          <div>
                            <div className="font-medium">KML (.kml)</div>
                            <div className="text-sm text-muted-foreground">
                              Google Earth format - Good for visualization
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filename */}
                  <div className="space-y-3">
                    <Label>Filename</Label>
                    <Input
                      value={configuration.filename}
                      onChange={(e) => 
                        setConfiguration(prev => ({ ...prev, filename: e.target.value }))
                      }
                      placeholder="Enter filename (without extension)"
                    />
                  </div>

                  {/* Content Options */}
                  <div className="space-y-3 md:col-span-2">
                    <Label>Content Options</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includePhotos}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ ...prev, includePhotos: !!checked }))
                          }
                        />
                        <span>Include photo information</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includePhotoUrls}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ ...prev, includePhotoUrls: !!checked }))
                          }
                        />
                        <span>Include photo URLs</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includeMetadata}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ ...prev, includeMetadata: !!checked }))
                          }
                        />
                        <span>Include metadata</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includeQualityScores}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ ...prev, includeQualityScores: !!checked }))
                          }
                        />
                        <span>Include quality scores</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={configuration.includeInstallationDetails}
                          onCheckedChange={(checked) => 
                            setConfiguration(prev => ({ ...prev, includeInstallationDetails: !!checked }))
                          }
                        />
                        <span>Include installation details</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coordinate System Step */}
          {currentStep === 'coordinate-system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Coordinate System</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Target Coordinate System</Label>
                    <Select 
                      value={configuration.targetCRS}
                      onValueChange={(value) => 
                        setConfiguration(prev => ({ ...prev, targetCRS: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EPSG:4326">
                          EPSG:4326 (WGS84) - Recommended for global compatibility
                        </SelectItem>
                        <SelectItem value="EPSG:3857">
                          EPSG:3857 (Web Mercator) - Web mapping standard
                        </SelectItem>
                        <SelectItem value="EPSG:32617">
                          EPSG:32617 (UTM Zone 17N) - Eastern US
                        </SelectItem>
                        <SelectItem value="EPSG:32618">
                          EPSG:32618 (UTM Zone 18N) - Eastern US
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      EPSG:4326 (WGS84) is recommended for maximum QGIS compatibility. 
                      All GPS coordinates will be transformed to the selected coordinate system.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Export Preview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Export Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Records to Export</span>
                        <span className="font-bold">{preview.recordCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated File Size</span>
                        <span className="font-bold">{preview.estimatedFileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format</span>
                        <span className="font-bold">{configuration.format.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coordinate System</span>
                        <span className="font-bold">{preview.coordinateSystem}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Excluded Records</span>
                        <span className="font-bold">{preview.excludedRecords}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Validation Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Validation Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Valid Records</span>
                        </span>
                        <span className="font-bold">{preview.validationSummary.valid}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span>Warnings</span>
                        </span>
                        <span className="font-bold">{preview.validationSummary.warnings}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span>Errors</span>
                        </span>
                        <span className="font-bold">{preview.validationSummary.errors}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Included Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle>Included Fields</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {preview.includedFields.map(field => (
                        <Badge key={field} variant="outline">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {preview.validationSummary.warnings > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {preview.validationSummary.warnings} records have validation warnings. 
                      These records will be included but may have missing or invalid data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Export Step */}
          {currentStep === 'export' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  {isExporting ? 'Exporting Data...' : 'Ready to Export'}
                </h3>
                
                {isExporting && (
                  <div className="space-y-4">
                    <Progress value={exportProgress} />
                    <p className="text-muted-foreground">
                      Preparing {filteredHomeDrops.length} records for export...
                    </p>
                  </div>
                )}
                
                {!isExporting && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Click the button below to start the export process.
                    </p>
                    <Button 
                      size="lg" 
                      onClick={executeExport}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Start Export
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 'data-selection' || isExporting}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isExporting}>
                Cancel
              </Button>
              
              {currentStep !== 'export' && (
                <Button
                  onClick={goToNextStep}
                  disabled={filteredHomeDrops.length === 0}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}