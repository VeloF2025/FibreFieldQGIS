/**
 * QGIS Compatibility Service
 * 
 * Ensures full compatibility with QGIS and QField applications.
 * Handles QGIS-specific formatting, metadata, and style definitions.
 * 
 * Features:
 * - QGIS project integration and compatibility
 * - Style and symbology handling for field maps
 * - Layer configuration and metadata
 * - Form configuration for field data collection
 * - Attribute validation rules and constraints
 */

import { log } from '@/lib/logger';
import type {
  GeoPackageDatabase,
  ExtensionInfo,
  MetadataInfo,
  GeoPackageTable
} from './types';

/**
 * QGIS layer style definition
 */
export interface QgisLayerStyle {
  layerName: string;
  geometryType: string;
  styleName: string;
  styleQML: string;
  styleDescription?: string;
}

/**
 * QGIS form configuration
 */
export interface QgisFormConfig {
  layerName: string;
  formLayout: 'GeneratedLayout' | 'TabLayout' | 'UiFileLayout';
  formSuppression: 'SuppressDefault' | 'SuppressOn' | 'SuppressOff';
  fieldConfigs: QgisFieldConfig[];
}

/**
 * QGIS field configuration
 */
export interface QgisFieldConfig {
  fieldName: string;
  displayName: string;
  fieldType: string;
  widget: {
    type: 'TextEdit' | 'ValueMap' | 'Range' | 'DateTime' | 'CheckBox';
    config: Record<string, any>;
  };
  constraints?: {
    notNull?: boolean;
    unique?: boolean;
    expression?: string;
    expressionDescription?: string;
  };
}

/**
 * QGIS project metadata
 */
export interface QgisProjectMetadata {
  title: string;
  author: string;
  creation: Date;
  abstract?: string;
  keywords?: string[];
  contact?: {
    name: string;
    organization: string;
    email: string;
  };
}

/**
 * QGIS Compatibility Service
 * 
 * Ensures GeoPackage files are fully compatible with QGIS/QField
 * and provides optimal user experience for field data collection.
 */
export class QgisCompatibilityService {
  // QGIS extension definitions
  private readonly QGIS_EXTENSIONS = {
    RELATED_TABLES: 'gpkg_related_tables',
    METADATA: 'gpkg_metadata',
    SCHEMA: 'gpkg_schema',
    SPATIAL_INDEX: 'gpkg_rtree_index'
  };

  constructor() {
    log.info('QGIS Compatibility Service initialized', {}, 'QgisCompatibilityService');
  }

  /**
   * Apply QGIS compatibility enhancements to GeoPackage
   */
  async applyQgisCompatibility(
    database: GeoPackageDatabase,
    options: {
      includeStyles?: boolean;
      includeForms?: boolean;
      includeConstraints?: boolean;
      projectMetadata?: QgisProjectMetadata;
    } = {}
  ): Promise<GeoPackageDatabase> {
    const timerId = log.startTimer('applyQgisCompatibility', 'QgisCompatibilityService');
    
    try {
      log.info('Applying QGIS compatibility enhancements', {
        tableCount: database.tables.length,
        includeStyles: options.includeStyles,
        includeForms: options.includeForms
      }, 'QgisCompatibilityService');

      const enhanced = { ...database };

      // Add QGIS extensions
      enhanced.extensions = enhanced.extensions || [];
      enhanced.extensions.push(...this.createQgisExtensions());

      // Add QGIS-specific metadata
      if (options.projectMetadata) {
        enhanced.metadata.push(...this.createProjectMetadata(options.projectMetadata));
      }

      // Apply table-specific enhancements
      for (const table of enhanced.tables) {
        // Add layer styles
        if (options.includeStyles) {
          const style = this.createLayerStyle(table);
          enhanced.metadata.push(...this.createStyleMetadata(style));
        }

        // Add form configurations
        if (options.includeForms) {
          const formConfig = this.createFormConfiguration(table);
          enhanced.metadata.push(...this.createFormMetadata(formConfig));
        }

        // Add field constraints
        if (options.includeConstraints) {
          this.addFieldConstraints(table);
        }
      }

      log.info('QGIS compatibility applied successfully', {
        extensionCount: enhanced.extensions.length,
        metadataCount: enhanced.metadata.length
      }, 'QgisCompatibilityService');

      return enhanced;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to apply QGIS compatibility', {
        error: errorMessage
      }, 'QgisCompatibilityService', error as Error);
      throw new Error(`QGIS compatibility failed: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Create QGIS extension definitions
   */
  private createQgisExtensions(): ExtensionInfo[] {
    return [
      {
        extensionName: this.QGIS_EXTENSIONS.METADATA,
        definition: 'GeoPackage Metadata',
        scope: 'read-write'
      },
      {
        extensionName: this.QGIS_EXTENSIONS.SCHEMA,
        definition: 'GeoPackage Schema',
        scope: 'read-write'
      },
      {
        extensionName: this.QGIS_EXTENSIONS.SPATIAL_INDEX,
        definition: 'GeoPackage RTree Spatial Index',
        scope: 'write-only'
      }
    ];
  }

  /**
   * Create project-level metadata
   */
  private createProjectMetadata(metadata: QgisProjectMetadata): MetadataInfo[] {
    return [
      {
        id: 100,
        mdScope: 'geopackage',
        mdStandardUri: 'https://www.qgis.org/metadata',
        mimeType: 'application/json',
        metadata: JSON.stringify({
          type: 'project',
          title: metadata.title,
          author: metadata.author,
          creation: metadata.creation.toISOString(),
          abstract: metadata.abstract,
          keywords: metadata.keywords,
          contact: metadata.contact
        })
      }
    ];
  }

  /**
   * Create layer style for QGIS visualization
   */
  private createLayerStyle(table: GeoPackageTable): QgisLayerStyle {
    const layerName = table.tableName;
    let symbolizerConfig = '';
    let geometryType = 'Point';

    // Determine geometry type and create appropriate style
    if (table.geometryColumn) {
      const geomColumn = table.columns.find(col => col.name === table.geometryColumn);
      if (geomColumn?.comment?.includes('Point')) {
        geometryType = 'Point';
        symbolizerConfig = this.createPointSymbolizer(layerName);
      }
    }

    const styleQML = this.generateQMLStyle(layerName, geometryType, symbolizerConfig);

    return {
      layerName,
      geometryType,
      styleName: `${layerName}_default`,
      styleQML,
      styleDescription: `Default style for ${layerName} layer`
    };
  }

  /**
   * Create point symbolizer for home drops
   */
  private createPointSymbolizer(layerName: string): string {
    if (layerName.toLowerCase().includes('assignment')) {
      return `
        <symbol name="assignment" type="marker">
          <layer class="SimpleMarker">
            <prop k="color" v="255,165,0,255"/>
            <prop k="name" v="circle"/>
            <prop k="size" v="6"/>
            <prop k="outline_color" v="0,0,0,255"/>
            <prop k="outline_width" v="0.5"/>
          </layer>
        </symbol>`;
    } else if (layerName.toLowerCase().includes('homedrop')) {
      return `
        <symbol name="homedrop" type="marker">
          <layer class="SimpleMarker">
            <prop k="color" v="0,255,0,255"/>
            <prop k="name" v="square"/>
            <prop k="size" v="6"/>
            <prop k="outline_color" v="0,0,0,255"/>
            <prop k="outline_width" v="0.5"/>
          </layer>
        </symbol>`;
    }

    // Default style
    return `
      <symbol name="default" type="marker">
        <layer class="SimpleMarker">
          <prop k="color" v="255,0,0,255"/>
          <prop k="name" v="circle"/>
          <prop k="size" v="5"/>
          <prop k="outline_color" v="0,0,0,255"/>
          <prop k="outline_width" v="0.5"/>
        </layer>
      </symbol>`;
  }

  /**
   * Generate complete QML style definition
   */
  private generateQMLStyle(layerName: string, geometryType: string, symbolizer: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<qgis version="3.22.0" styleCategories="Symbology">
  <renderer-v2 type="singleSymbol" symbollevels="0">
    <symbols>
      ${symbolizer}
    </symbols>
  </renderer-v2>
</qgis>`;
  }

  /**
   * Create style metadata for QGIS
   */
  private createStyleMetadata(style: QgisLayerStyle): MetadataInfo[] {
    return [
      {
        id: 200 + Math.floor(Math.random() * 100),
        mdScope: 'table',
        mdStandardUri: 'https://www.qgis.org/style',
        mimeType: 'application/xml',
        metadata: style.styleQML
      }
    ];
  }

  /**
   * Create form configuration for field data collection
   */
  private createFormConfiguration(table: GeoPackageTable): QgisFormConfig {
    const fieldConfigs: QgisFieldConfig[] = [];

    for (const column of table.columns) {
      if (column.type === 'GEOMETRY' || column.name === 'id') continue;

      const fieldConfig = this.createFieldConfig(column);
      if (fieldConfig) {
        fieldConfigs.push(fieldConfig);
      }
    }

    return {
      layerName: table.tableName,
      formLayout: 'TabLayout',
      formSuppression: 'SuppressDefault',
      fieldConfigs
    };
  }

  /**
   * Create field configuration based on column definition
   */
  private createFieldConfig(column: any): QgisFieldConfig | null {
    let widget: any;
    const displayName = this.formatDisplayName(column.name);

    // Configure widget based on field name and type
    if (column.name.toLowerCase().includes('status')) {
      widget = {
        type: 'ValueMap',
        config: {
          map: {
            'Pending': 'pending',
            'In Progress': 'in_progress',
            'Completed': 'completed',
            'Approved': 'approved',
            'Rejected': 'rejected'
          }
        }
      };
    } else if (column.name.toLowerCase().includes('priority')) {
      widget = {
        type: 'ValueMap',
        config: {
          map: {
            'High': 'high',
            'Medium': 'medium',
            'Low': 'low'
          }
        }
      };
    } else if (column.name.toLowerCase().includes('date') || column.name.toLowerCase().includes('time')) {
      widget = {
        type: 'DateTime',
        config: {
          display_format: 'yyyy-MM-dd hh:mm:ss',
          calendar_popup: true
        }
      };
    } else if (column.type === 'INTEGER' && column.name.toLowerCase().includes('score')) {
      widget = {
        type: 'Range',
        config: {
          min: 0,
          max: 100,
          step: 1,
          style: 'SpinBox'
        }
      };
    } else if (column.name.toLowerCase().includes('approved') || column.name.toLowerCase().includes('activated')) {
      widget = {
        type: 'CheckBox',
        config: {
          checked_state: '1',
          unchecked_state: '0'
        }
      };
    } else {
      widget = {
        type: 'TextEdit',
        config: {
          multiline: column.name.toLowerCase().includes('notes') || column.name.toLowerCase().includes('reason')
        }
      };
    }

    return {
      fieldName: column.name,
      displayName,
      fieldType: column.type,
      widget,
      constraints: {
        notNull: column.notNull,
        unique: column.unique
      }
    };
  }

  /**
   * Create form metadata for QGIS
   */
  private createFormMetadata(formConfig: QgisFormConfig): MetadataInfo[] {
    return [
      {
        id: 300 + Math.floor(Math.random() * 100),
        mdScope: 'table',
        mdStandardUri: 'https://www.qgis.org/form',
        mimeType: 'application/json',
        metadata: JSON.stringify(formConfig)
      }
    ];
  }

  /**
   * Add field constraints for data validation
   */
  private addFieldConstraints(table: GeoPackageTable): void {
    table.constraints = table.constraints || [];

    // Add custom constraints based on field types
    for (const column of table.columns) {
      if (column.name.toLowerCase().includes('score')) {
        table.constraints.push({
          constraintName: `ck_${column.name}_range`,
          constraintType: 'CHECK',
          columnNames: [column.name],
          definition: `${column.name} >= 0 AND ${column.name} <= 100`
        });
      }
      
      if (column.name.toLowerCase().includes('priority')) {
        table.constraints.push({
          constraintName: `ck_${column.name}_values`,
          constraintType: 'CHECK',
          columnNames: [column.name],
          definition: `${column.name} IN ('high', 'medium', 'low')`
        });
      }

      if (column.name.toLowerCase().includes('status') && column.name.includes('installation')) {
        table.constraints.push({
          constraintName: `ck_${column.name}_values`,
          constraintType: 'CHECK',
          columnNames: [column.name],
          definition: `${column.name} IN ('pending', 'in_progress', 'completed', 'approved', 'rejected')`
        });
      }
    }
  }

  /**
   * Format field name for display in QGIS forms
   */
  private formatDisplayName(fieldName: string): string {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate spatial index SQL for QGIS compatibility
   */
  generateSpatialIndexSQL(tableName: string, geometryColumn: string = 'geom'): string[] {
    return [
      `CREATE VIRTUAL TABLE rtree_${tableName}_${geometryColumn} USING rtree(
        id INTEGER PRIMARY KEY,
        minx REAL,
        maxx REAL,
        miny REAL,
        maxy REAL
      )`,
      
      `INSERT INTO rtree_${tableName}_${geometryColumn}
       SELECT id, ST_MinX(${geometryColumn}), ST_MaxX(${geometryColumn}), 
              ST_MinY(${geometryColumn}), ST_MaxY(${geometryColumn})
       FROM ${tableName}
       WHERE ${geometryColumn} IS NOT NULL`,

      // Triggers to maintain spatial index
      `CREATE TRIGGER ${tableName}_${geometryColumn}_insert
       AFTER INSERT ON ${tableName}
       WHEN NEW.${geometryColumn} IS NOT NULL
       BEGIN
         INSERT OR REPLACE INTO rtree_${tableName}_${geometryColumn} VALUES (
           NEW.id,
           ST_MinX(NEW.${geometryColumn}),
           ST_MaxX(NEW.${geometryColumn}),
           ST_MinY(NEW.${geometryColumn}),
           ST_MaxY(NEW.${geometryColumn})
         );
       END`
    ];
  }

  /**
   * Validate QGIS compatibility
   */
  async validateQgisCompatibility(database: GeoPackageDatabase): Promise<{
    isCompatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for required extensions
    const hasMetadataExtension = database.extensions?.some(
      ext => ext.extensionName === this.QGIS_EXTENSIONS.METADATA
    );
    
    if (!hasMetadataExtension) {
      recommendations.push('Add metadata extension for better QGIS integration');
    }

    // Check spatial indexes
    for (const table of database.tables) {
      if (table.geometryColumn && !table.spatialIndex) {
        recommendations.push(`Add spatial index to table '${table.tableName}'`);
      }
    }

    // Check metadata quality
    if (database.metadata.length === 0) {
      recommendations.push('Add metadata for better project documentation');
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const qgisCompatibilityService = new QgisCompatibilityService();