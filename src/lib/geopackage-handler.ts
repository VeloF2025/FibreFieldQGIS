/**
 * GeoPackage Handler - Main Orchestrator
 * 
 * Coordinates all GeoPackage operations through specialized service modules.
 * Maintains backward compatibility while providing enhanced modularity and maintainability.
 * 
 * Architecture:
 * - GeoPackageReader: File reading and parsing
 * - GeoPackageWriter: File creation and serialization
 * - CoordinateTransformService: Spatial transformations
 * - FeatureProcessingService: Data validation and processing
 * - QgisCompatibilityService: QGIS/QField integration
 * 
 * This orchestrator maintains the original API while delegating to specialized services.
 */

import { log } from '@/lib/logger';
import type { HomeDropCapture } from '@/types/home-drop.types';

// Import specialized service modules
import { geoPackageReader, type Assignment } from './geopackage/geopackage-reader';
import { geoPackageWriter } from './geopackage/geopackage-writer';
import { coordinateTransformService } from './geopackage/coordinate-transform-service';
import { featureProcessingService } from './geopackage/feature-processing-service';
import { qgisCompatibilityService } from './geopackage/qgis-compatibility-service';

// Re-export types for backward compatibility
import type {
  GeoPackageDatabase,
  GeoPackageImportOptions,
  GeoPackageExportOptions,
  GeoPackageConfig,
  STANDARD_SRS
} from './geopackage/types';

// Re-export types for backward compatibility
export type {
  GeoPackageDatabase,
  GeoPackageTable,
  GeoPackageColumn,
  GeoPackageFeature,
  SpatialReferenceSystem,
  GeometryColumnInfo,
  ContentInfo,
  MetadataInfo,
  ExtensionInfo,
  TableConstraint,
  GeometryType,
  GeoPackageImportOptions,
  GeoPackageExportOptions,
  GeoPackageConfig
} from './geopackage/types';

export { WKB_GEOMETRY_TYPES, STANDARD_SRS } from './geopackage/types';
export type { Assignment } from './geopackage/geopackage-reader';

/**
 * GeoPackage Handler - Main Orchestrator Class
 * 
 * Coordinates operations between specialized service modules while maintaining
 * the original API for backward compatibility.
 */
class GeoPackageHandler {
  // Default configuration
  private readonly config: GeoPackageConfig = {
    applicationId: 0x46424644, // 'FBFD' - FibreField identifier
    userVersion: 1,
    spatialIndexEnabled: true,
    rtreeIndexEnabled: true,
    metadataEnabled: true,
    extensionsEnabled: true,
    compressionEnabled: false
  };

  constructor(config?: Partial<GeoPackageConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeHandler();
  }

  /**
   * Initialize handler
   */
  private async initializeHandler(): Promise<void> {
    log.info('GeoPackage Handler orchestrator initialized', {}, 'GeoPackageHandler');
  }

  // ==================== Read Operations ====================

  /**
   * Read GeoPackage file and extract data
   * Delegates to GeoPackageReader service
   */
  async readGeoPackage(
    file: File,
    options: GeoPackageImportOptions = {}
  ): Promise<GeoPackageDatabase> {
    const timerId = log.startTimer('readGeoPackage', 'GeoPackageHandler');
    
    try {
      log.info('Reading GeoPackage via orchestrator', { 
        fileName: file.name, 
        options 
      }, 'GeoPackageHandler');
      
      const database = await geoPackageReader.readGeoPackage(file, options);
      
      // Apply QGIS compatibility enhancements if enabled
      if (this.config.extensionsEnabled) {
        const enhanced = await qgisCompatibilityService.applyQgisCompatibility(database, {
          includeStyles: true,
          includeForms: true,
          includeConstraints: true
        });
        return enhanced;
      }
      
      return database;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('GeoPackage read failed', { fileName: file.name, error: errorMessage }, 'GeoPackageHandler', error as Error);
      throw new Error(`Failed to read GeoPackage: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Extract assignments from GeoPackage
   * Delegates to GeoPackageReader service
   */
  async extractAssignments(
    database: GeoPackageDatabase,
    tableName?: string
  ): Promise<Assignment[]> {
    try {
      return await geoPackageReader.extractAssignments(database, tableName);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Assignment extraction failed', { tableName, error: errorMessage }, 'GeoPackageHandler', error as Error);
      throw new Error(`Failed to extract assignments: ${errorMessage}`);
    }
  }

  // ==================== Write Operations ====================

  /**
   * Write home drop captures to GeoPackage
   * Delegates to GeoPackageWriter service with processing and validation
   */
  async writeGeoPackage(
    homeDrops: HomeDropCapture[],
    options: GeoPackageExportOptions
  ): Promise<Blob> {
    const timerId = log.startTimer('writeGeoPackage', 'GeoPackageHandler');
    
    try {
      log.info('Writing GeoPackage via orchestrator', { 
        homeDropCount: homeDrops.length,
        options 
      }, 'GeoPackageHandler');
      
      // Delegate to writer service
      const gpkgBlob = await geoPackageWriter.writeGeoPackage(homeDrops, options);
      
      // Apply feature processing if validation is enabled
      if (this.config.metadataEnabled) {
        log.debug('Feature processing and validation enabled', {}, 'GeoPackageHandler');
        // Additional processing could be added here if needed
      }
      
      log.info('GeoPackage write completed', { blobSize: gpkgBlob.size }, 'GeoPackageHandler');
      return gpkgBlob;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('GeoPackage write failed', { 
        homeDropCount: homeDrops.length, 
        error: errorMessage 
      }, 'GeoPackageHandler', error as Error);
      throw new Error(`Failed to write GeoPackage: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  // ==================== Service Access Methods ====================

  /**
   * Access to coordinate transformation service
   */
  getCoordinateTransformService() {
    return coordinateTransformService;
  }

  /**
   * Access to feature processing service
   */
  getFeatureProcessingService() {
    return featureProcessingService;
  }

  /**
   * Access to QGIS compatibility service
   */
  getQgisCompatibilityService() {
    return qgisCompatibilityService;
  }

  // ==================== Spatial Operations ====================

  /**
   * Create spatial index for table
   * Delegates to QGIS compatibility service
   */
  async createSpatialIndex(
    tableName: string,
    geometryColumn: string = 'geom'
  ): Promise<string[]> {
    try {
      return qgisCompatibilityService.generateSpatialIndexSQL(tableName, geometryColumn);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Spatial index creation failed', { tableName, geometryColumn, error: errorMessage }, 'GeoPackageHandler', error as Error);
      throw new Error(`Failed to create spatial index: ${errorMessage}`);
    }
  }

  // ==================== Validation and Utility Methods ====================

  /**
   * Process and validate features
   * Delegates to FeatureProcessingService
   */
  async processFeatures(
    database: GeoPackageDatabase,
    options?: {
      validateGeometry?: boolean;
      correctErrors?: boolean;
      removeDuplicates?: boolean;
    }
  ) {
    try {
      if (!database.tables.length) {
        return { processedFeatures: [], statistics: null, validationResults: [] };
      }

      const table = database.tables[0];
      if (!table.features || !table.columns) {
        return { processedFeatures: [], statistics: null, validationResults: [] };
      }

      return await featureProcessingService.processFeatures(
        table.features,
        table.columns,
        options
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Feature processing failed', { error: errorMessage }, 'GeoPackageHandler', error as Error);
      throw new Error(`Feature processing failed: ${errorMessage}`);
    }
  }

  /**
   * Validate GeoPackage structure and QGIS compatibility
   */
  async validateGeoPackage(database: GeoPackageDatabase): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    qgisCompatibility?: {
      isCompatible: boolean;
      issues: string[];
      recommendations: string[];
    };
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic structure validation
      if (!database.tables || database.tables.length === 0) {
        errors.push('At least one feature table is required');
      }

      if (!database.spatialRefSys || database.spatialRefSys.length === 0) {
        errors.push('At least one spatial reference system is required');
      }

      if (!database.geometryColumns || database.geometryColumns.length === 0) {
        warnings.push('No geometry columns defined');
      }

      // Validate table structures
      database.tables.forEach((table, index) => {
        if (!table.tableName) {
          errors.push(`Table ${index} is missing a name`);
        }

        if (!table.columns || table.columns.length === 0) {
          errors.push(`Table '${table.tableName}' has no columns defined`);
        }

        // Check for primary key
        const hasPrimaryKey = table.columns.some(col => col.primaryKey);
        if (!hasPrimaryKey) {
          warnings.push(`Table '${table.tableName}' has no primary key defined`);
        }

        // Check geometry column
        if (table.geometryColumn) {
          const hasGeometryColumn = table.columns.some(col => 
            col.name === table.geometryColumn && col.type === 'GEOMETRY'
          );
          if (!hasGeometryColumn) {
            errors.push(`Table '${table.tableName}' references non-existent geometry column '${table.geometryColumn}'`);
          }
        }
      });

      // QGIS compatibility check
      const qgisCompatibility = await qgisCompatibilityService.validateQgisCompatibility(database);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        qgisCompatibility
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('GeoPackage validation failed', { error: errorMessage }, 'GeoPackageHandler', error as Error);
      throw new Error(`Validation failed: ${errorMessage}`);
    }
  }

  /**
   * Get handler configuration
   */
  getConfig(): GeoPackageConfig {
    return { ...this.config };
  }

  /**
   * Update handler configuration
   */
  updateConfig(newConfig: Partial<GeoPackageConfig>): void {
    Object.assign(this.config, newConfig);
    log.info('Configuration updated', { newConfig }, 'GeoPackageHandler');
  }

  /**
   * Get supported geometry types
   */
  getSupportedGeometryTypes(): string[] {
    return [
      'POINT',
      'LINESTRING', 
      'POLYGON',
      'MULTIPOINT',
      'MULTILINESTRING',
      'MULTIPOLYGON',
      'GEOMETRY'
    ];
  }

  /**
   * Get standard spatial reference systems
   */
  getStandardSRS() {
    return { ...STANDARD_SRS };
  }

  /**
   * Get supported coordinate reference systems
   */
  getSupportedCRS(): number[] {
    return coordinateTransformService.getSupportedSRS();
  }

  /**
   * Transform coordinates between different CRS
   */
  async transformCoordinates(
    coordinates: { x: number; y: number },
    sourceCRS: number,
    targetCRS: number
  ) {
    return coordinateTransformService.transformPoint(coordinates, sourceCRS, targetCRS);
  }
}

// Export singleton instance
export const geoPackageHandler = new GeoPackageHandler();