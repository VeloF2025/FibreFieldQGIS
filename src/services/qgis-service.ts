// QGIS/QField Integration Service for FibreField
import { localDB } from '@/lib/database';
import { homeDropCaptureService } from './home-drop-capture.service';
import type { HomeDropCapture } from '@/types/home-drop.types';

// GeoPackage interfaces (simplified for web use)
export interface GeoPackageFeature {
  id: string;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, any>;
  crs?: string; // Coordinate Reference System
}

export interface GeoPackageLayer {
  name: string;
  description?: string;
  features: GeoPackageFeature[];
  geometryType: 'Point' | 'LineString' | 'Polygon' | 'Mixed';
  crs: string;
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface GeoPackageData {
  version: string;
  name: string;
  description?: string;
  layers: GeoPackageLayer[];
  metadata?: Record<string, any>;
  created: Date;
  modified: Date;
}

export interface QFieldProject {
  id: string;
  name: string;
  description?: string;
  layers: string[]; // Layer names
  baseMap?: string;
  offlineAreas?: Array<{
    name: string;
    bounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
  }>;
  syncSettings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    conflictResolution: 'local' | 'remote' | 'newest';
  };
}

export interface FieldMapping {
  qgisField: string;
  appField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'json';
  required: boolean;
  defaultValue?: any;
  transformation?: string; // JavaScript expression for transformation
}

class QGisIntegrationService {
  private fieldMappings: Map<string, FieldMapping[]> = new Map();
  private readonly EPSG_WGS84 = 'EPSG:4326'; // Standard GPS coordinates
  
  constructor() {
    this.initializeDefaultMappings();
  }
  
  /**
   * Initialize default field mappings for home drop captures
   */
  private initializeDefaultMappings() {
    const homeDropMappings: FieldMapping[] = [
      { qgisField: 'drop_id', appField: 'id', dataType: 'string', required: true },
      { qgisField: 'drop_number', appField: 'dropNumber', dataType: 'string', required: true },
      { qgisField: 'pole_number', appField: 'poleNumber', dataType: 'string', required: true },
      { qgisField: 'service_addr', appField: 'serviceAddress', dataType: 'string', required: true },
      { qgisField: 'customer_name', appField: 'customerInfo.name', dataType: 'string', required: false },
      { qgisField: 'customer_phone', appField: 'customerInfo.phone', dataType: 'string', required: false },
      { qgisField: 'service_type', appField: 'customerInfo.serviceType', dataType: 'string', required: false },
      { qgisField: 'captured_by', appField: 'capturedBy', dataType: 'string', required: true },
      { qgisField: 'captured_at', appField: 'capturedAt', dataType: 'date', required: true },
      { qgisField: 'status', appField: 'approvalStatus', dataType: 'string', required: true },
      { qgisField: 'quality_score', appField: 'qualityScore', dataType: 'number', required: false },
      { qgisField: 'latitude', appField: 'gpsLocation.latitude', dataType: 'number', required: true },
      { qgisField: 'longitude', appField: 'gpsLocation.longitude', dataType: 'number', required: true },
      { qgisField: 'accuracy', appField: 'gpsLocation.accuracy', dataType: 'number', required: false },
      { qgisField: 'photos_count', appField: '_photosCount', dataType: 'number', required: false, transformation: 'Object.keys(photos).filter(k => photos[k]).length' }
    ];
    
    this.fieldMappings.set('home_drops', homeDropMappings);
  }
  
  /**
   * Export home drop captures to GeoPackage format
   */
  async exportToGeoPackage(
    projectId: string,
    options: {
      includePhotos?: boolean;
      includeRejected?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<GeoPackageData> {
    try {
      // Get home drop captures
      const captures = await homeDropCaptureService.getHomeDropCapturesByProject(projectId);
      
      // Filter based on options
      let filteredCaptures = captures;
      
      if (!options.includeRejected) {
        filteredCaptures = filteredCaptures.filter(c => c.approvalStatus !== 'rejected');
      }
      
      if (options.dateFrom) {
        filteredCaptures = filteredCaptures.filter(c => 
          new Date(c.capturedAt) >= options.dateFrom!
        );
      }
      
      if (options.dateTo) {
        filteredCaptures = filteredCaptures.filter(c => 
          new Date(c.capturedAt) <= options.dateTo!
        );
      }
      
      // Convert to GeoPackage features
      const features = filteredCaptures.map(capture => this.captureToFeature(capture));
      
      // Calculate bounds
      const bounds = this.calculateBounds(features);
      
      // Create GeoPackage layer
      const layer: GeoPackageLayer = {
        name: 'home_drops',
        description: 'Home Drop Capture Points',
        features,
        geometryType: 'Point',
        crs: this.EPSG_WGS84,
        bounds
      };
      
      // Create GeoPackage data
      const geoPackage: GeoPackageData = {
        version: '1.0',
        name: `FibreField_Export_${projectId}`,
        description: `Home drop captures for project ${projectId}`,
        layers: [layer],
        metadata: {
          projectId,
          exportDate: new Date().toISOString(),
          captureCount: features.length,
          includePhotos: options.includePhotos || false
        },
        created: new Date(),
        modified: new Date()
      };
      
      // Add photo references if requested
      if (options.includePhotos) {
        geoPackage.metadata!.photoReferences = await this.getPhotoReferences(filteredCaptures);
      }
      
      return geoPackage;
    } catch (error) {
      console.error('Export to GeoPackage failed:', error);
      throw error;
    }
  }
  
  /**
   * Import features from GeoPackage format
   */
  async importFromGeoPackage(
    geoPackageData: GeoPackageData,
    projectId: string,
    options: {
      overwriteExisting?: boolean;
      validateGeometry?: boolean;
      skipInvalid?: boolean;
    } = {}
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    try {
      // Find home drops layer
      const homeDropLayer = geoPackageData.layers.find(l => 
        l.name === 'home_drops' || l.geometryType === 'Point'
      );
      
      if (!homeDropLayer) {
        throw new Error('No suitable layer found in GeoPackage');
      }
      
      // Process each feature
      for (const feature of homeDropLayer.features) {
        try {
          // Validate geometry if requested
          if (options.validateGeometry && !this.validateGeometry(feature.geometry)) {
            if (options.skipInvalid) {
              result.skipped++;
              result.errors.push(`Invalid geometry for feature ${feature.id}`);
              continue;
            } else {
              throw new Error(`Invalid geometry for feature ${feature.id}`);
            }
          }
          
          // Convert feature to capture
          const capture = await this.featureToCapture(feature, projectId);
          
          // Check if exists
          const existing = await homeDropCaptureService.getHomeDropCapture(capture.id);
          
          if (existing && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }
          
          // Import the capture
          if (existing) {
            await homeDropCaptureService.updateHomeDropCapture(capture.id, capture);
          } else {
            await homeDropCaptureService.createHomeDropCaptureFromImport(capture);
          }
          
          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to import feature ${feature.id}: ${error}`);
          if (!options.skipInvalid) {
            throw error;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Import from GeoPackage failed:', error);
      throw error;
    }
  }
  
  /**
   * Convert home drop capture to GeoPackage feature
   */
  private captureToFeature(capture: HomeDropCapture): GeoPackageFeature {
    const mappings = this.fieldMappings.get('home_drops') || [];
    const properties: Record<string, any> = {};
    
    // Apply field mappings
    for (const mapping of mappings) {
      const value = this.getNestedValue(capture, mapping.appField);
      
      if (value !== undefined || mapping.required) {
        // Apply transformation if defined
        if (mapping.transformation) {
          try {
            // Safe evaluation of transformation
            const transformFunc = new Function('value', 'capture', `return ${mapping.transformation}`);
            properties[mapping.qgisField] = transformFunc(value, capture);
          } catch {
            properties[mapping.qgisField] = value ?? mapping.defaultValue;
          }
        } else {
          properties[mapping.qgisField] = value ?? mapping.defaultValue;
        }
        
        // Convert dates to ISO strings
        if (mapping.dataType === 'date' && value instanceof Date) {
          properties[mapping.qgisField] = value.toISOString();
        }
      }
    }
    
    // Create GeoJSON feature
    return {
      id: capture.id,
      geometry: {
        type: 'Point',
        coordinates: [
          capture.gpsLocation?.longitude || 0,
          capture.gpsLocation?.latitude || 0
        ]
      },
      properties,
      crs: this.EPSG_WGS84
    };
  }
  
  /**
   * Convert GeoPackage feature to home drop capture
   */
  private async featureToCapture(
    feature: GeoPackageFeature,
    projectId: string
  ): Promise<Partial<HomeDropCapture>> {
    const mappings = this.fieldMappings.get('home_drops') || [];
    const capture: any = {
      projectId,
      id: feature.id || `IMPORT-${Date.now()}`
    };
    
    // Apply reverse field mappings
    for (const mapping of mappings) {
      const value = feature.properties[mapping.qgisField];
      
      if (value !== undefined) {
        // Convert data types
        let convertedValue = value;
        
        switch (mapping.dataType) {
          case 'date':
            convertedValue = new Date(value);
            break;
          case 'number':
            convertedValue = Number(value);
            break;
          case 'boolean':
            convertedValue = Boolean(value);
            break;
          case 'json':
            try {
              convertedValue = JSON.parse(value);
            } catch {
              convertedValue = value;
            }
            break;
        }
        
        // Set nested value
        this.setNestedValue(capture, mapping.appField, convertedValue);
      }
    }
    
    // Set geometry from feature
    if (feature.geometry.type === 'Point' && feature.geometry.coordinates.length >= 2) {
      capture.gpsLocation = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
        accuracy: feature.properties.accuracy || 10,
        timestamp: new Date()
      };
    }
    
    // Set default values for required fields
    capture.status = capture.status || 'draft';
    capture.syncStatus = 'pending';
    capture.approvalStatus = capture.approvalStatus || 'pending';
    capture.createdAt = new Date();
    capture.lastModified = new Date();
    capture.version = 1;
    
    return capture as Partial<HomeDropCapture>;
  }
  
  /**
   * Validate geometry
   */
  private validateGeometry(geometry: GeoPackageFeature['geometry']): boolean {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return false;
    }
    
    if (geometry.type === 'Point') {
      return Array.isArray(geometry.coordinates) && 
             geometry.coordinates.length >= 2 &&
             typeof geometry.coordinates[0] === 'number' &&
             typeof geometry.coordinates[1] === 'number' &&
             geometry.coordinates[0] >= -180 && geometry.coordinates[0] <= 180 &&
             geometry.coordinates[1] >= -90 && geometry.coordinates[1] <= 90;
    }
    
    // Add validation for other geometry types if needed
    return true;
  }
  
  /**
   * Calculate bounds for features
   */
  private calculateBounds(features: GeoPackageFeature[]): GeoPackageLayer['bounds'] {
    if (features.length === 0) {
      return undefined;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const feature of features) {
      if (feature.geometry.type === 'Point') {
        const [x, y] = feature.geometry.coordinates as number[];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    
    return {
      minX: minX === Infinity ? 0 : minX,
      minY: minY === Infinity ? 0 : minY,
      maxX: maxX === -Infinity ? 0 : maxX,
      maxY: maxY === -Infinity ? 0 : maxY
    };
  }
  
  /**
   * Get photo references for captures
   */
  private async getPhotoReferences(captures: HomeDropCapture[]): Promise<Record<string, string[]>> {
    const references: Record<string, string[]> = {};
    
    for (const capture of captures) {
      const photoUrls: string[] = [];
      
      // Collect photo URLs
      for (const [type, photo] of Object.entries(capture.photos)) {
        if (photo && typeof photo === 'object' && 'url' in photo) {
          photoUrls.push(photo.url);
        }
      }
      
      if (photoUrls.length > 0) {
        references[capture.id] = photoUrls;
      }
    }
    
    return references;
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
  
  /**
   * Generate QField project configuration
   */
  async generateQFieldProject(
    projectId: string,
    name: string,
    options: {
      baseMapUrl?: string;
      offlineAreas?: Array<{ name: string; bounds: [number, number, number, number] }>;
      autoSync?: boolean;
      syncInterval?: number;
    } = {}
  ): Promise<QFieldProject> {
    const project: QFieldProject = {
      id: `qfield-${projectId}`,
      name,
      description: `QField project for ${name}`,
      layers: ['home_drops'],
      baseMap: options.baseMapUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      offlineAreas: options.offlineAreas || [],
      syncSettings: {
        autoSync: options.autoSync ?? true,
        syncInterval: options.syncInterval ?? 30,
        conflictResolution: 'newest'
      }
    };
    
    // Store project configuration
    await localDB.appSettings.put({
      key: `qfield-project-${projectId}`,
      value: project,
      updatedAt: new Date()
    });
    
    return project;
  }
  
  /**
   * Convert GeoPackage to GeoJSON for visualization
   */
  geoPackageToGeoJSON(geoPackage: GeoPackageData): any {
    const features: any[] = [];
    
    for (const layer of geoPackage.layers) {
      for (const feature of layer.features) {
        features.push({
          type: 'Feature',
          id: feature.id,
          geometry: feature.geometry,
          properties: {
            ...feature.properties,
            _layer: layer.name
          }
        });
      }
    }
    
    return {
      type: 'FeatureCollection',
      features,
      crs: {
        type: 'name',
        properties: {
          name: this.EPSG_WGS84
        }
      }
    };
  }
  
  /**
   * Export field mappings configuration
   */
  exportFieldMappings(layerName: string = 'home_drops'): FieldMapping[] {
    return this.fieldMappings.get(layerName) || [];
  }
  
  /**
   * Import field mappings configuration
   */
  importFieldMappings(layerName: string, mappings: FieldMapping[]): void {
    this.fieldMappings.set(layerName, mappings);
  }
  
  /**
   * Get supported export formats
   */
  getSupportedFormats(): string[] {
    return ['geopackage', 'geojson', 'kml', 'csv', 'shapefile'];
  }
  
  /**
   * Validate QField project
   */
  validateQFieldProject(project: QFieldProject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!project.id) errors.push('Project ID is required');
    if (!project.name) errors.push('Project name is required');
    if (!project.layers || project.layers.length === 0) errors.push('At least one layer is required');
    
    if (project.syncSettings) {
      if (project.syncSettings.syncInterval < 1) {
        errors.push('Sync interval must be at least 1 minute');
      }
      if (!['local', 'remote', 'newest'].includes(project.syncSettings.conflictResolution)) {
        errors.push('Invalid conflict resolution strategy');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const qgisIntegrationService = new QGisIntegrationService();