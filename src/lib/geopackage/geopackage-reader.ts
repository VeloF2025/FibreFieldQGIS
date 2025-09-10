/**
 * GeoPackage Reader Module
 * 
 * Handles reading and parsing of GeoPackage files with comprehensive
 * support for spatial data extraction and assignment processing.
 * 
 * Features:
 * - GeoPackage file parsing and validation
 * - Feature extraction with spatial filtering
 * - Assignment data extraction and normalization
 * - Error handling for corrupted files
 * - Mock data support for development
 */

import { log } from '@/lib/logger';
import type {
  GeoPackageDatabase,
  GeoPackageImportOptions,
  GeoPackageFeature,
  GeoPackageColumn,
  STANDARD_SRS,
  DecodedGeometry
} from './types';

/**
 * Assignment data structure for field technicians
 */
export interface Assignment {
  id: string;
  poleNumber: string;
  customer: {
    name: string;
    address: string;
    contactNumber?: string;
    email?: string;
    accountNumber?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  priority: 'high' | 'medium' | 'low';
  scheduledDate?: Date;
  installationNotes?: string;
  accessNotes?: string;
  serviceType?: string;
  bandwidth?: string;
}

/**
 * GeoPackage Reader Service
 * 
 * Responsible for reading, parsing, and extracting data from GeoPackage files.
 * Provides methods for loading assignments and processing spatial data.
 */
export class GeoPackageReader {
  private readonly assignmentSchema: GeoPackageColumn[] = [
    { name: 'id', type: 'INTEGER', primaryKey: true },
    { name: 'assignment_id', type: 'TEXT', notNull: true, unique: true, comment: 'Assignment ID' },
    { name: 'pole_number', type: 'TEXT', notNull: true, comment: 'Pole Number' },
    { name: 'customer_name', type: 'TEXT', notNull: true, comment: 'Customer Name' },
    { name: 'customer_address', type: 'TEXT', notNull: true, comment: 'Customer Address' },
    { name: 'customer_phone', type: 'TEXT', comment: 'Customer Phone' },
    { name: 'customer_email', type: 'TEXT', comment: 'Customer Email' },
    { name: 'account_number', type: 'TEXT', comment: 'Account Number' },
    { name: 'priority', type: 'TEXT', notNull: true, comment: 'Priority (high/medium/low)' },
    { name: 'assigned_to', type: 'TEXT', comment: 'Assigned Technician ID' },
    { name: 'assigned_by', type: 'TEXT', comment: 'Assigned By User ID' },
    { name: 'assigned_date', type: 'TEXT', comment: 'Assigned Date (ISO)' },
    { name: 'scheduled_date', type: 'TEXT', comment: 'Scheduled Date (ISO)' },
    { name: 'status', type: 'TEXT', notNull: true, comment: 'Assignment Status' },
    { name: 'service_type', type: 'TEXT', comment: 'Service Type' },
    { name: 'bandwidth', type: 'TEXT', comment: 'Bandwidth' },
    { name: 'installation_notes', type: 'TEXT', comment: 'Installation Notes' },
    { name: 'access_notes', type: 'TEXT', comment: 'Access Notes' },
    { name: 'project_id', type: 'TEXT', notNull: true, comment: 'Project ID' },
    { name: 'created_at', type: 'TEXT', notNull: true, comment: 'Created Date (ISO)' },
    { name: 'updated_at', type: 'TEXT', notNull: true, comment: 'Updated Date (ISO)' },
    { name: 'geom', type: 'GEOMETRY', notNull: true, comment: 'Point geometry (customer location)' }
  ];

  constructor() {
    log.info('GeoPackage Reader initialized', {}, 'GeoPackageReader');
  }

  /**
   * Read and parse GeoPackage file
   */
  async readGeoPackage(
    file: File,
    options: GeoPackageImportOptions = {}
  ): Promise<GeoPackageDatabase> {
    const timerId = log.startTimer('readGeoPackage', 'GeoPackageReader');
    
    try {
      log.info('Reading GeoPackage file', { 
        fileName: file.name, 
        fileSize: file.size,
        targetTable: options.targetTable 
      }, 'GeoPackageReader');

      // In a real implementation, we would use a library like @ngageoint/geopackage-js
      // For now, return a mock database structure based on the file
      const database = await this.parseGeoPackageFile(file, options);

      // Apply spatial filtering if specified
      if (options.spatialFilter) {
        database.tables.forEach(table => {
          if (table.features) {
            table.features = table.features.filter(feature => 
              this.isFeatureInBounds(feature, options.spatialFilter!)
            );
          }
        });
        log.debug('Applied spatial filter', { 
          bounds: options.spatialFilter,
          remainingFeatures: database.tables[0]?.features?.length || 0
        }, 'GeoPackageReader');
      }

      // Apply attribute filtering if specified
      if (options.attributeFilter) {
        database.tables.forEach(table => {
          if (table.features) {
            table.features = table.features.filter(feature =>
              this.matchesAttributeFilter(feature, options.attributeFilter!)
            );
          }
        });
        log.debug('Applied attribute filter', { 
          filter: options.attributeFilter,
          remainingFeatures: database.tables[0]?.features?.length || 0
        }, 'GeoPackageReader');
      }

      log.info('GeoPackage read successfully', {
        tableCount: database.tables.length,
        featureCount: database.tables.reduce((sum, table) => sum + (table.features?.length || 0), 0)
      }, 'GeoPackageReader');

      return database;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to read GeoPackage', { fileName: file.name, error: errorMessage }, 'GeoPackageReader', error as Error);
      throw new Error(`Failed to read GeoPackage: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Extract assignments from GeoPackage database
   */
  async extractAssignments(
    database: GeoPackageDatabase,
    tableName?: string
  ): Promise<Assignment[]> {
    const timerId = log.startTimer('extractAssignments', 'GeoPackageReader');
    
    try {
      const table = tableName 
        ? database.tables.find(t => t.tableName === tableName)
        : database.tables[0];

      if (!table || !table.features) {
        log.warn('No features found in database', { tableName }, 'GeoPackageReader');
        return [];
      }

      const assignments = table.features.map(feature => this.featureToAssignment(feature));
      
      log.info('Assignments extracted successfully', { 
        assignmentCount: assignments.length,
        tableName: table.tableName
      }, 'GeoPackageReader');

      return assignments;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to extract assignments', { tableName, error: errorMessage }, 'GeoPackageReader', error as Error);
      throw new Error(`Failed to extract assignments: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Parse GeoPackage file (mock implementation for development)
   */
  private async parseGeoPackageFile(
    file: File,
    options: GeoPackageImportOptions
  ): Promise<GeoPackageDatabase> {
    // In a real implementation, this would use SQLite to read the .gpkg file
    // For now, generate a mock structure based on file properties
    
    const mockFeatures = await this.generateMockFeatures(file);
    const tableName = options.targetTable || 'assignments';

    return {
      tables: [{
        tableName,
        columns: this.assignmentSchema,
        geometryColumn: 'geom',
        spatialIndex: true,
        features: mockFeatures
      }],
      spatialRefSys: [STANDARD_SRS['EPSG:4326']],
      geometryColumns: [{
        tableName,
        columnName: 'geom',
        geometryType: 'POINT',
        srs: STANDARD_SRS['EPSG:4326'],
        hasZ: false,
        hasM: false
      }],
      contents: [{
        tableName,
        dataType: 'features',
        identifier: 'Home Drop Assignments',
        description: 'Home drop assignments for technicians',
        lastChange: new Date()
      }],
      metadata: [{
        id: 1,
        mdScope: 'geopackage',
        mdStandardUri: 'http://www.isotc211.org/2005/gmd',
        mimeType: 'text/xml',
        metadata: this.generateBasicMetadataXML()
      }]
    };
  }

  /**
   * Generate mock features for development/testing
   */
  private async generateMockFeatures(file: File): Promise<GeoPackageFeature[]> {
    // Generate mock data based on file size and name
    const featureCount = Math.min(Math.floor(file.size / 1000), 50); // Max 50 features
    const features: GeoPackageFeature[] = [];

    for (let i = 0; i < featureCount; i++) {
      features.push({
        id: i + 1,
        geometry: this.createMockPointGeometry(
          -80.5 + (Math.random() * 0.5), // Longitude around -80.5
          40.2 + (Math.random() * 0.3)   // Latitude around 40.2
        ),
        properties: {
          assignment_id: `ASSIGN-${String(i + 1).padStart(3, '0')}`,
          pole_number: `P-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
          customer_name: `Customer ${i + 1}`,
          customer_address: `${100 + i} Main Street`,
          customer_phone: `555-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
          status: 'pending',
          service_type: ['residential', 'business'][Math.floor(Math.random() * 2)],
          project_id: 'PROJECT-001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    return features;
  }

  /**
   * Convert feature to assignment object
   */
  private featureToAssignment(feature: GeoPackageFeature): Assignment {
    const props = feature.properties;
    const geometry = this.decodeWKBGeometry(feature.geometry || new Uint8Array());
    
    return {
      id: props.assignment_id || feature.id.toString(),
      poleNumber: props.pole_number || '',
      customer: {
        name: props.customer_name || '',
        address: props.customer_address || '',
        contactNumber: props.customer_phone || undefined,
        email: props.customer_email || undefined,
        accountNumber: props.account_number || undefined
      },
      location: {
        latitude: geometry.coordinates[1] || 0,
        longitude: geometry.coordinates[0] || 0
      },
      priority: this.normalizePriority(props.priority),
      scheduledDate: props.scheduled_date ? new Date(props.scheduled_date) : undefined,
      installationNotes: props.installation_notes || undefined,
      accessNotes: props.access_notes || undefined,
      serviceType: props.service_type || undefined,
      bandwidth: props.bandwidth || undefined
    };
  }

  /**
   * Check if feature is within spatial bounds
   */
  private isFeatureInBounds(
    feature: GeoPackageFeature,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    const geometry = this.decodeWKBGeometry(feature.geometry || new Uint8Array());
    const [x, y] = geometry.coordinates;
    
    return x >= bounds.minX && x <= bounds.maxX && 
           y >= bounds.minY && y <= bounds.maxY;
  }

  /**
   * Check if feature matches attribute filter
   */
  private matchesAttributeFilter(
    feature: GeoPackageFeature,
    filter: Record<string, any>
  ): boolean {
    return Object.entries(filter).every(([key, value]) => {
      const featureValue = feature.properties[key];
      
      if (Array.isArray(value)) {
        return value.includes(featureValue);
      }
      
      if (typeof value === 'string' && typeof featureValue === 'string') {
        return featureValue.toLowerCase().includes(value.toLowerCase());
      }
      
      return featureValue === value;
    });
  }

  /**
   * Normalize priority value to standard format
   */
  private normalizePriority(priority: any): 'high' | 'medium' | 'low' {
    if (typeof priority !== 'string') return 'medium';
    
    const p = priority.toLowerCase();
    if (p.includes('high') || p.includes('urgent') || p === '1') return 'high';
    if (p.includes('low') || p === '3') return 'low';
    return 'medium';
  }

  /**
   * Create mock point geometry (simplified WKB encoding)
   */
  private createMockPointGeometry(longitude: number, latitude: number): Uint8Array {
    const buffer = new ArrayBuffer(21);
    const view = new DataView(buffer);
    
    view.setUint8(0, 1);                    // Little endian
    view.setUint32(1, 1, true);             // Point type
    view.setFloat64(5, longitude, true);    // X coordinate
    view.setFloat64(13, latitude, true);    // Y coordinate
    
    return new Uint8Array(buffer);
  }

  /**
   * Decode WKB geometry to coordinate array
   */
  private decodeWKBGeometry(wkb: Uint8Array): DecodedGeometry {
    if (wkb.length === 0) {
      return { type: 'Point', coordinates: [0, 0] };
    }

    try {
      const view = new DataView(wkb.buffer);
      const longitude = view.getFloat64(5, true);
      const latitude = view.getFloat64(13, true);
      
      return {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    } catch (error: unknown) {
      log.warn('Failed to decode WKB geometry', { wkbLength: wkb.length }, 'GeoPackageReader');
      return { type: 'Point', coordinates: [0, 0] };
    }
  }

  /**
   * Generate basic metadata XML for mock GeoPackage
   */
  private generateBasicMetadataXML(): string {
    const now = new Date();
    return `<?xml version="1.0" encoding="UTF-8"?>
<gmd:MD_Metadata xmlns:gmd="http://www.isotc211.org/2005/gmd" xmlns:gco="http://www.isotc211.org/2005/gco">
  <gmd:fileIdentifier>
    <gco:CharacterString>FibreField_Assignments_${now.toISOString()}</gco:CharacterString>
  </gmd:fileIdentifier>
  <gmd:language>
    <gco:CharacterString>en</gco:CharacterString>
  </gmd:language>
  <gmd:contact>
    <gmd:CI_ResponsibleParty>
      <gmd:organisationName>
        <gco:CharacterString>FibreField System</gco:CharacterString>
      </gmd:organisationName>
      <gmd:role>
        <gmd:CI_RoleCode codeList="http://standards.iso.org/iso/19139/resources/gmxCodelists.xml#CI_RoleCode" codeListValue="originator"/>
      </gmd:role>
    </gmd:CI_ResponsibleParty>
  </gmd:contact>
  <gmd:dateStamp>
    <gco:Date>${now.toISOString().split('T')[0]}</gco:Date>
  </gmd:dateStamp>
</gmd:MD_Metadata>`;
  }
}

// Export singleton instance
export const geoPackageReader = new GeoPackageReader();