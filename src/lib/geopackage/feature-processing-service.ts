/**
 * Feature Processing Service
 * 
 * Handles feature data processing, validation, and geometry operations.
 * Provides comprehensive support for spatial data manipulation and quality control.
 * 
 * Features:
 * - Feature data validation and normalization
 * - Geometry operations and calculations
 * - Attribute handling and type conversion
 * - Spatial indexing support
 * - Data quality validation and cleanup
 */

import { log } from '@/lib/logger';
import type {
  GeoPackageFeature,
  GeoPackageColumn,
  GeometryType,
  WKB_GEOMETRY_TYPES,
  DatabaseExtent
} from './types';
import { coordinateTransformService, type Point, type BoundingBox } from './coordinate-transform-service';

/**
 * Feature validation result
 */
export interface FeatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedFeature?: GeoPackageFeature;
}

/**
 * Geometry validation result
 */
export interface GeometryValidationResult {
  isValid: boolean;
  geometryType: GeometryType;
  coordinateCount: number;
  bounds: BoundingBox | null;
  errors: string[];
}

/**
 * Feature statistics
 */
export interface FeatureStatistics {
  totalFeatures: number;
  validFeatures: number;
  geometryTypes: Record<GeometryType, number>;
  attributeStats: Record<string, {
    nullCount: number;
    uniqueCount: number;
    dataType: string;
    sampleValues: any[];
  }>;
  spatialExtent: DatabaseExtent;
}

/**
 * Feature Processing Service
 * 
 * Provides comprehensive feature processing capabilities including validation,
 * transformation, and spatial operations for GeoPackage features.
 */
export class FeatureProcessingService {
  constructor() {
    log.info('Feature Processing Service initialized', {}, 'FeatureProcessingService');
  }

  /**
   * Validate and process array of features
   */
  async processFeatures(
    features: GeoPackageFeature[],
    schema: GeoPackageColumn[],
    options: {
      validateGeometry?: boolean;
      correctErrors?: boolean;
      removeDuplicates?: boolean;
      spatialFilter?: BoundingBox;
    } = {}
  ): Promise<{
    processedFeatures: GeoPackageFeature[];
    statistics: FeatureStatistics;
    validationResults: FeatureValidationResult[];
  }> {
    const timerId = log.startTimer('processFeatures', 'FeatureProcessingService');
    
    try {
      log.info('Processing features', { 
        featureCount: features.length,
        validateGeometry: options.validateGeometry,
        correctErrors: options.correctErrors
      }, 'FeatureProcessingService');

      const validationResults: FeatureValidationResult[] = [];
      let processedFeatures: GeoPackageFeature[] = [];

      // Process each feature
      for (const feature of features) {
        const validation = await this.validateFeature(feature, schema, {
          validateGeometry: options.validateGeometry
        });
        
        validationResults.push(validation);

        // Use corrected feature if available and correction is enabled
        if (options.correctErrors && validation.correctedFeature) {
          processedFeatures.push(validation.correctedFeature);
        } else if (validation.isValid) {
          processedFeatures.push(feature);
        }
        // Invalid features are dropped if correction is disabled
      }

      // Apply spatial filter if provided
      if (options.spatialFilter) {
        processedFeatures = processedFeatures.filter(feature => 
          this.isFeatureInBounds(feature, options.spatialFilter!)
        );
      }

      // Remove duplicates if requested
      if (options.removeDuplicates) {
        processedFeatures = this.removeDuplicateFeatures(processedFeatures);
      }

      // Generate statistics
      const statistics = this.generateFeatureStatistics(processedFeatures, schema);

      log.info('Feature processing completed', {
        inputCount: features.length,
        outputCount: processedFeatures.length,
        validFeatures: statistics.validFeatures,
        droppedFeatures: features.length - processedFeatures.length
      }, 'FeatureProcessingService');

      return {
        processedFeatures,
        statistics,
        validationResults
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Feature processing failed', {
        featureCount: features.length,
        error: errorMessage
      }, 'FeatureProcessingService', error as Error);
      throw new Error(`Feature processing failed: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Validate individual feature
   */
  async validateFeature(
    feature: GeoPackageFeature,
    schema: GeoPackageColumn[],
    options: { validateGeometry?: boolean } = {}
  ): Promise<FeatureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let correctedFeature: GeoPackageFeature | undefined;

    // Validate feature structure
    if (!feature.id) {
      errors.push('Feature missing required ID');
    }

    if (!feature.properties) {
      errors.push('Feature missing properties object');
    }

    // Validate geometry if present and requested
    if (feature.geometry && options.validateGeometry) {
      const geometryValidation = this.validateGeometry(feature.geometry);
      if (!geometryValidation.isValid) {
        errors.push(...geometryValidation.errors);
      }
    }

    // Validate attributes against schema
    const schemaValidation = this.validateAttributes(feature.properties, schema);
    errors.push(...schemaValidation.errors);
    warnings.push(...schemaValidation.warnings);

    // Attempt to create corrected feature if there are correctable errors
    if (errors.length > 0 && this.canCorrectFeature(feature, errors)) {
      correctedFeature = this.correctFeature(feature, schema, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      correctedFeature
    };
  }

  /**
   * Validate geometry data
   */
  validateGeometry(geometry: Uint8Array): GeometryValidationResult {
    const errors: string[] = [];
    
    if (geometry.length === 0) {
      return {
        isValid: false,
        geometryType: 'GEOMETRY',
        coordinateCount: 0,
        bounds: null,
        errors: ['Empty geometry data']
      };
    }

    try {
      // Parse WKB header
      const view = new DataView(geometry.buffer);
      const byteOrder = view.getUint8(0);
      const geometryTypeCode = view.getUint32(1, byteOrder === 1);
      
      // Validate byte order
      if (byteOrder !== 0 && byteOrder !== 1) {
        errors.push('Invalid WKB byte order');
      }

      // Determine geometry type
      let geometryType: GeometryType = 'GEOMETRY';
      let coordinateCount = 0;
      
      switch (geometryTypeCode) {
        case WKB_GEOMETRY_TYPES.POINT:
          geometryType = 'POINT';
          coordinateCount = 1;
          break;
        case WKB_GEOMETRY_TYPES.LINESTRING:
          geometryType = 'LINESTRING';
          // Would need to parse point count from WKB
          coordinateCount = this.parseLineStringPointCount(geometry);
          break;
        case WKB_GEOMETRY_TYPES.POLYGON:
          geometryType = 'POLYGON';
          coordinateCount = this.parsePolygonPointCount(geometry);
          break;
        default:
          errors.push(`Unsupported geometry type: ${geometryTypeCode}`);
      }

      // Calculate bounds for POINT geometry
      let bounds: BoundingBox | null = null;
      if (geometryType === 'POINT' && geometry.length >= 21) {
        const x = view.getFloat64(5, byteOrder === 1);
        const y = view.getFloat64(13, byteOrder === 1);
        
        // Validate coordinate values
        if (!isFinite(x) || !isFinite(y)) {
          errors.push('Invalid coordinate values (NaN or Infinity)');
        } else {
          bounds = { minX: x, minY: y, maxX: x, maxY: y };
        }
      }

      return {
        isValid: errors.length === 0,
        geometryType,
        coordinateCount,
        bounds,
        errors
      };
    } catch (error: unknown) {
      return {
        isValid: false,
        geometryType: 'GEOMETRY',
        coordinateCount: 0,
        bounds: null,
        errors: ['Failed to parse WKB geometry']
      };
    }
  }

  /**
   * Validate feature attributes against schema
   */
  private validateAttributes(
    properties: Record<string, any>,
    schema: GeoPackageColumn[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required columns
    for (const column of schema) {
      if (column.notNull && !(column.name in properties)) {
        errors.push(`Missing required attribute: ${column.name}`);
      }
      
      if (column.name in properties) {
        const value = properties[column.name];
        
        // Type validation
        const typeValidation = this.validateAttributeType(value, column);
        if (!typeValidation.isValid) {
          if (typeValidation.canConvert) {
            warnings.push(`Attribute '${column.name}' will be converted from ${typeof value} to ${column.type}`);
          } else {
            errors.push(`Attribute '${column.name}' has invalid type. Expected: ${column.type}, Got: ${typeof value}`);
          }
        }
      }
    }

    // Check for unexpected attributes
    const schemaColumns = new Set(schema.map(col => col.name));
    for (const propName of Object.keys(properties)) {
      if (!schemaColumns.has(propName)) {
        warnings.push(`Unexpected attribute: ${propName}`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate attribute type against column definition
   */
  private validateAttributeType(
    value: any,
    column: GeoPackageColumn
  ): { isValid: boolean; canConvert: boolean } {
    if (value === null || value === undefined) {
      return { isValid: !column.notNull, canConvert: false };
    }

    switch (column.type) {
      case 'TEXT':
        return { 
          isValid: typeof value === 'string', 
          canConvert: typeof value === 'number' || typeof value === 'boolean'
        };
      case 'INTEGER':
        return { 
          isValid: Number.isInteger(value), 
          canConvert: typeof value === 'string' && !isNaN(parseInt(value))
        };
      case 'REAL':
        return { 
          isValid: typeof value === 'number' && isFinite(value), 
          canConvert: typeof value === 'string' && !isNaN(parseFloat(value))
        };
      case 'BLOB':
        return { 
          isValid: value instanceof Uint8Array || value instanceof ArrayBuffer, 
          canConvert: false
        };
      case 'GEOMETRY':
        return { 
          isValid: value instanceof Uint8Array, 
          canConvert: false
        };
      default:
        return { isValid: true, canConvert: false };
    }
  }

  /**
   * Check if feature can be corrected
   */
  private canCorrectFeature(feature: GeoPackageFeature, errors: string[]): boolean {
    // Simple heuristic: can correct if most errors are type conversions
    const correctableErrors = errors.filter(error => 
      error.includes('will be converted') || 
      error.includes('Missing required') ||
      error.includes('invalid type')
    );
    
    return correctableErrors.length > 0;
  }

  /**
   * Attempt to correct feature errors
   */
  private correctFeature(
    feature: GeoPackageFeature,
    schema: GeoPackageColumn[],
    errors: string[]
  ): GeoPackageFeature {
    const corrected: GeoPackageFeature = {
      ...feature,
      properties: { ...feature.properties }
    };

    // Apply type conversions
    for (const column of schema) {
      if (column.name in corrected.properties) {
        const value = corrected.properties[column.name];
        corrected.properties[column.name] = this.convertAttributeType(value, column);
      } else if (column.notNull && column.defaultValue !== undefined) {
        // Add default values for missing required attributes
        corrected.properties[column.name] = column.defaultValue;
      }
    }

    return corrected;
  }

  /**
   * Convert attribute value to match column type
   */
  private convertAttributeType(value: any, column: GeoPackageColumn): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (column.type) {
      case 'TEXT':
        return String(value);
      case 'INTEGER':
        return parseInt(String(value), 10);
      case 'REAL':
        return parseFloat(String(value));
      default:
        return value;
    }
  }

  /**
   * Check if feature is within spatial bounds
   */
  private isFeatureInBounds(feature: GeoPackageFeature, bounds: BoundingBox): boolean {
    if (!feature.geometry) return true;

    const geometryBounds = this.getGeometryBounds(feature.geometry);
    if (!geometryBounds) return true;

    return coordinateTransformService.isPointInBounds(
      { x: geometryBounds.minX, y: geometryBounds.minY }, 
      bounds
    );
  }

  /**
   * Remove duplicate features based on ID and geometry
   */
  private removeDuplicateFeatures(features: GeoPackageFeature[]): GeoPackageFeature[] {
    const seen = new Set<string>();
    const unique: GeoPackageFeature[] = [];

    for (const feature of features) {
      const key = this.generateFeatureKey(feature);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(feature);
      }
    }

    log.debug('Removed duplicate features', {
      original: features.length,
      unique: unique.length,
      removed: features.length - unique.length
    }, 'FeatureProcessingService');

    return unique;
  }

  /**
   * Generate unique key for feature deduplication
   */
  private generateFeatureKey(feature: GeoPackageFeature): string {
    const id = String(feature.id);
    const geometryHash = feature.geometry ? 
      Array.from(feature.geometry.slice(0, 21)).join(',') : 'no-geom';
    return `${id}:${geometryHash}`;
  }

  /**
   * Generate comprehensive statistics for features
   */
  private generateFeatureStatistics(
    features: GeoPackageFeature[],
    schema: GeoPackageColumn[]
  ): FeatureStatistics {
    const geometryTypes: Record<GeometryType, number> = {
      'POINT': 0,
      'LINESTRING': 0,
      'POLYGON': 0,
      'MULTIPOINT': 0,
      'MULTILINESTRING': 0,
      'MULTIPOLYGON': 0,
      'GEOMETRYCOLLECTION': 0,
      'GEOMETRY': 0
    };

    const attributeStats: Record<string, any> = {};
    const spatialExtent: DatabaseExtent = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    // Initialize attribute statistics
    for (const column of schema) {
      if (column.type !== 'GEOMETRY') {
        attributeStats[column.name] = {
          nullCount: 0,
          uniqueCount: 0,
          dataType: column.type,
          sampleValues: []
        };
      }
    }

    // Process each feature
    for (const feature of features) {
      // Geometry statistics
      if (feature.geometry) {
        const validation = this.validateGeometry(feature.geometry);
        geometryTypes[validation.geometryType]++;
        
        if (validation.bounds) {
          spatialExtent.minX = Math.min(spatialExtent.minX, validation.bounds.minX);
          spatialExtent.minY = Math.min(spatialExtent.minY, validation.bounds.minY);
          spatialExtent.maxX = Math.max(spatialExtent.maxX, validation.bounds.maxX);
          spatialExtent.maxY = Math.max(spatialExtent.maxY, validation.bounds.maxY);
        }
      }

      // Attribute statistics
      for (const [key, value] of Object.entries(feature.properties)) {
        if (attributeStats[key]) {
          if (value === null || value === undefined) {
            attributeStats[key].nullCount++;
          } else {
            if (attributeStats[key].sampleValues.length < 10) {
              attributeStats[key].sampleValues.push(value);
            }
          }
        }
      }
    }

    // Calculate unique counts (simplified)
    for (const key of Object.keys(attributeStats)) {
      const uniqueValues = new Set(features.map(f => f.properties[key]));
      attributeStats[key].uniqueCount = uniqueValues.size;
    }

    return {
      totalFeatures: features.length,
      validFeatures: features.length, // All processed features are valid
      geometryTypes,
      attributeStats,
      spatialExtent
    };
  }

  /**
   * Parse LineString point count from WKB (simplified)
   */
  private parseLineStringPointCount(geometry: Uint8Array): number {
    // This is a simplified implementation
    // Real implementation would parse the WKB structure completely
    return Math.max(2, Math.floor((geometry.length - 9) / 16));
  }

  /**
   * Parse Polygon point count from WKB (simplified)
   */
  private parsePolygonPointCount(geometry: Uint8Array): number {
    // This is a simplified implementation
    // Real implementation would parse the WKB structure completely
    return Math.max(4, Math.floor((geometry.length - 13) / 16));
  }

  /**
   * Get geometry bounds from WKB
   */
  private getGeometryBounds(geometry: Uint8Array): BoundingBox | null {
    const validation = this.validateGeometry(geometry);
    return validation.bounds;
  }
}

// Export singleton instance
export const featureProcessingService = new FeatureProcessingService();