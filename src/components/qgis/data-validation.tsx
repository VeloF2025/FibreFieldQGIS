/**
 * QGIS Data Validation Component
 * 
 * Comprehensive validation and conflict resolution for QGIS data integration.
 * Ensures data quality and integrity during import/export operations.
 * 
 * Key Features:
 * 1. Import data validation
 * 2. Conflict detection and resolution
 * 3. Data quality assessment
 * 4. Field mapping validation
 * 5. Geometry validation
 * 6. Coordinate system checks
 * 7. Duplicate detection
 * 8. Error reporting and suggestions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Database, 
  FileText,
  RefreshCw,
  Eye,
  Settings,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import type { QGISProject, QGISFeature, QGISLayer } from '@/services/qgis-integration.service';
import type { HomeDropCapture } from '@/types/home-drop.types';

/**
 * Validation Result Types
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 quality score
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  id: string;
  type: 'geometry' | 'attribute' | 'reference' | 'coordinate' | 'duplicate';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: string;
  suggestion?: string;
  affectedRecords: number;
  canAutoFix: boolean;
  fixAction?: () => Promise<void>;
}

export interface ValidationWarning {
  id: string;
  type: 'data_quality' | 'format' | 'compatibility' | 'performance';
  message: string;
  details?: string;
  affectedRecords: number;
  impact: 'high' | 'medium' | 'low';
}

export interface ValidationInfo {
  id: string;
  category: 'import' | 'export' | 'data' | 'system';
  message: string;
  value?: string | number;
}

export interface ValidationStatistics {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  duplicateRecords: number;
  geometryErrors: number;
  attributeErrors: number;
  coordinateSystemMismatches: number;
  dataQualityScore: number;
}

/**
 * Conflict Types
 */
export interface DataConflict {
  id: string;
  type: 'duplicate' | 'mismatch' | 'missing' | 'invalid';
  recordId: string | number;
  field?: string;
  currentValue: any;
  conflictValue: any;
  resolution: 'keep_current' | 'use_import' | 'merge' | 'manual' | 'skip';
  confidence: number; // 0-1 confidence in auto-resolution
  userChoice?: 'keep_current' | 'use_import' | 'merge' | 'skip';
}

/**
 * Field Mapping Configuration
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  transform?: (value: any) => any;
  validate?: (value: any) => boolean;
  defaultValue?: any;
}

/**
 * Component Props
 */
interface DataValidationProps {
  project?: QGISProject;
  homeDrops?: HomeDropCapture[];
  onValidationComplete: (result: ValidationResult) => void;
  onConflictsResolved: (conflicts: DataConflict[]) => void;
  isVisible: boolean;
}

export default function DataValidation({
  project,
  homeDrops,
  onValidationComplete,
  onConflictsResolved,
  isVisible
}: DataValidationProps) {
  // State management
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'errors' | 'warnings' | 'conflicts' | 'statistics'>('errors');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Run validation when data changes
  useEffect(() => {
    if ((project || homeDrops) && isVisible) {
      runValidation();
    }
  }, [project, homeDrops, isVisible]);

  /**
   * Run comprehensive validation
   */
  const runValidation = async () => {
    setIsValidating(true);
    setValidationProgress(0);

    try {
      const result = await performValidation();
      setValidationResult(result);
      onValidationComplete(result);

      // Detect conflicts
      if (project) {
        const detectedConflicts = await detectConflicts();
        setConflicts(detectedConflicts);
      }
    } catch (error: unknown) {
      log.error('Validation failed:', {}, "Datavalidation", error);
    }

    setIsValidating(false);
    setValidationProgress(100);
  };

  /**
   * Perform comprehensive validation
   */
  const performValidation = async (): Promise<ValidationResult> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];
    let totalRecords = 0;
    let validRecords = 0;

    // Validate QGIS project import
    if (project) {
      setValidationProgress(20);
      
      // Project structure validation
      const projectValidation = await validateProjectStructure(project);
      errors.push(...projectValidation.errors);
      warnings.push(...projectValidation.warnings);
      info.push(...projectValidation.info);

      // Layer validation
      setValidationProgress(40);
      const layerValidation = await validateLayers(project.layers);
      errors.push(...layerValidation.errors);
      warnings.push(...layerValidation.warnings);
      
      // Feature validation
      setValidationProgress(60);
      for (const layer of project.layers) {
        if (layer.features) {
          const featureValidation = await validateFeatures(layer.features, layer);
          errors.push(...featureValidation.errors);
          warnings.push(...featureValidation.warnings);
          totalRecords += layer.features.length;
          validRecords += layer.features.filter(f => 
            featureValidation.validFeatureIds.includes(f.id)
          ).length;
        }
      }
    }

    // Validate home drop exports
    if (homeDrops) {
      setValidationProgress(80);
      const exportValidation = await validateHomeDropExport(homeDrops);
      errors.push(...exportValidation.errors);
      warnings.push(...exportValidation.warnings);
      info.push(...exportValidation.info);
      totalRecords = homeDrops.length;
      validRecords = homeDrops.filter(hd => 
        hd.gpsLocation && hd.customer.name && hd.customer.address
      ).length;
    }

    setValidationProgress(100);

    // Calculate statistics
    const statistics: ValidationStatistics = {
      totalRecords,
      validRecords,
      errorRecords: totalRecords - validRecords,
      warningRecords: warnings.reduce((sum, w) => sum + w.affectedRecords, 0),
      duplicateRecords: errors.filter(e => e.type === 'duplicate')
        .reduce((sum, e) => sum + e.affectedRecords, 0),
      geometryErrors: errors.filter(e => e.type === 'geometry').length,
      attributeErrors: errors.filter(e => e.type === 'attribute').length,
      coordinateSystemMismatches: errors.filter(e => e.type === 'coordinate').length,
      dataQualityScore: Math.round((validRecords / Math.max(totalRecords, 1)) * 100)
    };

    const overallScore = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5));

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      score: overallScore,
      errors,
      warnings,
      info,
      statistics
    };
  };

  /**
   * Validate project structure
   */
  const validateProjectStructure = async (project: QGISProject): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
  }> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Check required fields
    if (!project.name) {
      errors.push({
        id: 'project-no-name',
        type: 'attribute',
        severity: 'medium',
        message: 'Project has no name',
        affectedRecords: 1,
        canAutoFix: true,
        fixAction: async () => {
          project.name = 'Imported Project';
        }
      });
    }

    // Check CRS
    if (!project.crs || project.crs === 'Unknown') {
      errors.push({
        id: 'project-no-crs',
        type: 'coordinate',
        severity: 'high',
        message: 'Project coordinate system not specified',
        details: 'Coordinate system is required for proper spatial operations',
        suggestion: 'Set coordinate system to EPSG:4326 (WGS84) for global compatibility',
        affectedRecords: 1,
        canAutoFix: true
      });
    }

    // Check for layers
    if (!project.layers || project.layers.length === 0) {
      errors.push({
        id: 'project-no-layers',
        type: 'attribute',
        severity: 'critical',
        message: 'Project contains no layers',
        affectedRecords: 1,
        canAutoFix: false
      });
    }

    // Add info
    info.push({
      id: 'project-version',
      category: 'import',
      message: 'QGIS Project Version',
      value: project.version
    });

    info.push({
      id: 'project-crs',
      category: 'import',
      message: 'Coordinate System',
      value: project.crs
    });

    return { errors, warnings, info };
  };

  /**
   * Validate layers
   */
  const validateLayers = async (layers: QGISLayer[]): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const layer of layers) {
      // Check layer name
      if (!layer.name) {
        errors.push({
          id: `layer-${layer.id}-no-name`,
          type: 'attribute',
          severity: 'medium',
          message: `Layer ${layer.id} has no name`,
          affectedRecords: 1,
          canAutoFix: true
        });
      }

      // Check geometry type for assignments
      if (layer.type === 'vector' && layer.geometryType !== 'Point') {
        warnings.push({
          id: `layer-${layer.id}-geometry`,
          type: 'compatibility',
          message: `Layer '${layer.name}' has ${layer.geometryType} geometry`,
          details: 'Home drop assignments should use Point geometry',
          affectedRecords: layer.features?.length || 0,
          impact: 'medium'
        });
      }

      // Check required fields for assignment layers
      const requiredFields = ['pole_number', 'customer_name', 'customer_address'];
      const layerFields = layer.attributes.map(a => a.name.toLowerCase());
      const missingFields = requiredFields.filter(field => 
        !layerFields.some(lf => lf.includes(field.replace('_', '')))
      );

      if (missingFields.length > 0 && layer.geometryType === 'Point') {
        warnings.push({
          id: `layer-${layer.id}-missing-fields`,
          type: 'data_quality',
          message: `Layer '${layer.name}' missing recommended fields`,
          details: `Missing: ${missingFields.join(', ')}`,
          affectedRecords: layer.features?.length || 0,
          impact: 'high'
        });
      }
    }

    return { errors, warnings };
  };

  /**
   * Validate features
   */
  const validateFeatures = async (
    features: QGISFeature[], 
    layer: QGISLayer
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    validFeatureIds: (string | number)[];
  }> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validFeatureIds: (string | number)[] = [];

    for (const feature of features) {
      let isValid = true;

      // Validate geometry
      if (!feature.geometry || !feature.geometry.coordinates) {
        errors.push({
          id: `feature-${feature.id}-no-geometry`,
          type: 'geometry',
          severity: 'high',
          message: 'Feature has no geometry',
          affectedRecords: 1,
          canAutoFix: false
        });
        isValid = false;
      } else {
        // Check coordinate validity
        const coords = feature.geometry.coordinates as [number, number];
        if (coords.length < 2 || 
            isNaN(coords[0]) || isNaN(coords[1]) ||
            Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
          errors.push({
            id: `feature-${feature.id}-invalid-coords`,
            type: 'coordinate',
            severity: 'high',
            message: 'Feature has invalid coordinates',
            details: `Coordinates: [${coords[0]}, ${coords[1]}]`,
            affectedRecords: 1,
            canAutoFix: false
          });
          isValid = false;
        }
      }

      // Validate required attributes
      if (layer.geometryType === 'Point') {
        const props = feature.properties;
        
        if (!props.pole_number && !props.pole_num) {
          errors.push({
            id: `feature-${feature.id}-no-pole`,
            type: 'attribute',
            severity: 'high',
            message: 'Assignment missing pole number',
            affectedRecords: 1,
            canAutoFix: false
          });
          isValid = false;
        }

        if (!props.customer_name && !props.cust_name && !props.name) {
          errors.push({
            id: `feature-${feature.id}-no-customer`,
            type: 'attribute',
            severity: 'high',
            message: 'Assignment missing customer name',
            affectedRecords: 1,
            canAutoFix: false
          });
          isValid = false;
        }

        if (!props.customer_address && !props.cust_addr && !props.address) {
          warnings.push({
            id: `feature-${feature.id}-no-address`,
            type: 'data_quality',
            message: 'Assignment missing customer address',
            affectedRecords: 1,
            impact: 'medium'
          });
        }
      }

      if (isValid) {
        validFeatureIds.push(feature.id);
      }
    }

    return { errors, warnings, validFeatureIds };
  };

  /**
   * Validate home drop export
   */
  const validateHomeDropExport = async (homeDrops: HomeDropCapture[]): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
  }> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    let noGpsCount = 0;
    let incompleteCount = 0;
    let pendingApprovalCount = 0;

    for (const homeDrop of homeDrops) {
      // Check GPS location
      if (!homeDrop.gpsLocation) {
        noGpsCount++;
      }

      // Check completion status
      if (homeDrop.status === 'assigned' || homeDrop.status === 'in_progress') {
        incompleteCount++;
      }

      // Check approval status
      if (homeDrop.status === 'pending_approval') {
        pendingApprovalCount++;
      }

      // Check required photos
      if (homeDrop.photos.length < homeDrop.requiredPhotos.length) {
        warnings.push({
          id: `homedrop-${homeDrop.id}-missing-photos`,
          type: 'data_quality',
          message: 'Home drop missing required photos',
          details: `Has ${homeDrop.photos.length} of ${homeDrop.requiredPhotos.length} required photos`,
          affectedRecords: 1,
          impact: 'medium'
        });
      }
    }

    // Add summary errors/warnings
    if (noGpsCount > 0) {
      warnings.push({
        id: 'export-no-gps',
        type: 'data_quality',
        message: 'Home drops without GPS coordinates',
        details: 'Records without coordinates cannot be mapped in QGIS',
        affectedRecords: noGpsCount,
        impact: 'high'
      });
    }

    if (incompleteCount > 0) {
      info.push({
        id: 'export-incomplete',
        category: 'export',
        message: 'Incomplete Home Drops',
        value: incompleteCount
      });
    }

    return { errors, warnings, info };
  };

  /**
   * Detect conflicts
   */
  const detectConflicts = async (): Promise<DataConflict[]> => {
    const conflicts: DataConflict[] = [];

    if (!project || !homeDrops) return conflicts;

    // Check for duplicate assignments
    const assignmentFeatures = project.layers
      .filter(l => l.geometryType === 'Point')
      .flatMap(l => l.features || []);

    const existingPoleNumbers = homeDrops.map(hd => hd.poleNumber);

    for (const feature of assignmentFeatures) {
      const poleNumber = feature.properties.pole_number || feature.properties.pole_num;
      
      if (existingPoleNumbers.includes(poleNumber)) {
        const existing = homeDrops.find(hd => hd.poleNumber === poleNumber);
        
        conflicts.push({
          id: `duplicate-${poleNumber}`,
          type: 'duplicate',
          recordId: feature.id,
          currentValue: existing,
          conflictValue: feature.properties,
          resolution: 'keep_current',
          confidence: 0.8
        });
      }
    }

    return conflicts;
  };

  /**
   * Resolve conflict
   */
  const resolveConflict = (conflictId: string, resolution: DataConflict['resolution']) => {
    setConflicts(prev => prev.map(conflict => 
      conflict.id === conflictId 
        ? { ...conflict, userChoice: resolution }
        : conflict
    ));
  };

  /**
   * Auto-fix errors
   */
  const autoFixErrors = async () => {
    if (!validationResult) return;

    const fixableErrors = validationResult.errors.filter(e => e.canAutoFix);
    
    for (const error of fixableErrors) {
      try {
        if (error.fixAction) {
          await error.fixAction();
        }
      } catch (fixError: unknown) {
        log.error(`Failed to fix error ${error.id}:`, {}, "Datavalidation", fixError);
      }
    }

    // Re-run validation
    await runValidation();
  };

  /**
   * Toggle error expansion
   */
  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Validation Progress */}
      {isValidating && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Validating data...</span>
                <span>{validationProgress}%</span>
              </div>
              <Progress value={validationProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      {validationResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium">Overall Status</p>
                  <p className="text-lg font-bold">
                    {validationResult.isValid ? 'Valid' : 'Issues Found'}
                  </p>
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
                  <p className="text-lg font-bold">{validationResult.errors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Warnings</p>
                  <p className="text-lg font-bold">{validationResult.warnings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Quality Score</p>
                  <p className="text-lg font-bold">{validationResult.score}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <Button onClick={runValidation} disabled={isValidating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Validating...' : 'Re-validate'}
        </Button>
        
        {validationResult?.errors.some(e => e.canAutoFix) && (
          <Button onClick={autoFixErrors} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Auto-fix ({validationResult.errors.filter(e => e.canAutoFix).length})
          </Button>
        )}
      </div>

      {/* Detailed Results */}
      {validationResult && (
        <Tabs value={selectedTab} onValueChange={(tab: any) => setSelectedTab(tab)}>
          <TabsList>
            <TabsTrigger value="errors">
              Errors ({validationResult.errors.length})
            </TabsTrigger>
            <TabsTrigger value="warnings">
              Warnings ({validationResult.warnings.length})
            </TabsTrigger>
            {conflicts.length > 0 && (
              <TabsTrigger value="conflicts">
                Conflicts ({conflicts.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            {validationResult.errors.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No errors found in the data.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {validationResult.errors.map((error) => (
                  <Card key={error.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleErrorExpansion(error.id)}
                            >
                              {expandedErrors.has(error.id) ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                <ChevronRight className="w-4 h-4" />
                              }
                            </Button>
                            <XCircle className={`w-4 h-4 ${getSeverityColor(error.severity)}`} />
                            <span className="font-medium">{error.message}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {error.type}
                            </Badge>
                            <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {error.severity}
                            </Badge>
                            {error.canAutoFix && (
                              <Badge variant="outline">Auto-fixable</Badge>
                            )}
                          </div>
                        </div>
                        
                        {expandedErrors.has(error.id) && (
                          <div className="ml-6 space-y-2 text-sm text-muted-foreground">
                            {error.details && <p>{error.details}</p>}
                            {error.suggestion && (
                              <p className="text-blue-600">💡 {error.suggestion}</p>
                            )}
                            <p>Affected records: {error.affectedRecords}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-4">
            {validationResult.warnings.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>No warnings found in the data.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {validationResult.warnings.map((warning) => (
                  <Card key={warning.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{warning.message}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{warning.type}</Badge>
                          <Badge variant="secondary">{warning.impact} impact</Badge>
                        </div>
                      </div>
                      {warning.details && (
                        <p className="text-sm text-muted-foreground mt-2 ml-6">
                          {warning.details}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {conflicts.length > 0 && (
            <TabsContent value="conflicts" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Data conflicts found. Please review and resolve before proceeding.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <Card key={conflict.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {conflict.type === 'duplicate' ? 'Duplicate Assignment' : 'Data Conflict'}
                          </span>
                          <Badge variant="outline">{conflict.type}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Current Data</p>
                            <pre className="bg-gray-50 p-2 rounded text-xs">
                              {JSON.stringify(conflict.currentValue, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="font-medium">Import Data</p>
                            <pre className="bg-gray-50 p-2 rounded text-xs">
                              {JSON.stringify(conflict.conflictValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={conflict.userChoice === 'keep_current' ? 'default' : 'outline'}
                            onClick={() => resolveConflict(conflict.id, 'keep_current')}
                          >
                            Keep Current
                          </Button>
                          <Button
                            size="sm"
                            variant={conflict.userChoice === 'use_import' ? 'default' : 'outline'}
                            onClick={() => resolveConflict(conflict.id, 'use_import')}
                          >
                            Use Import
                          </Button>
                          <Button
                            size="sm"
                            variant={conflict.userChoice === 'skip' ? 'default' : 'outline'}
                            onClick={() => resolveConflict(conflict.id, 'skip')}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Button 
                onClick={() => onConflictsResolved(conflicts)}
                disabled={conflicts.some(c => !c.userChoice)}
              >
                Apply Resolutions
              </Button>
            </TabsContent>
          )}

          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Records</span>
                    <span className="font-bold">{validationResult.statistics.totalRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valid Records</span>
                    <span className="font-bold text-green-600">
                      {validationResult.statistics.validRecords}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Records</span>
                    <span className="font-bold text-red-600">
                      {validationResult.statistics.errorRecords}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicate Records</span>
                    <span className="font-bold text-yellow-600">
                      {validationResult.statistics.duplicateRecords}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Data Quality Score</span>
                    <span className="font-bold">
                      {validationResult.statistics.dataQualityScore}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Geometry Errors</span>
                    <span className="font-bold">{validationResult.statistics.geometryErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Attribute Errors</span>
                    <span className="font-bold">{validationResult.statistics.attributeErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinate System Issues</span>
                    <span className="font-bold">
                      {validationResult.statistics.coordinateSystemMismatches}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Warning Records</span>
                    <span className="font-bold text-yellow-600">
                      {validationResult.statistics.warningRecords}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}