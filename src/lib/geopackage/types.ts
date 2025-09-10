/**
 * GeoPackage Types and Interfaces
 * 
 * Shared type definitions for GeoPackage handling across all modules.
 * Contains interfaces for database structure, geometry types, and configuration.
 */

/**
 * GeoPackage Database Structure
 */
export interface GeoPackageDatabase {
  tables: GeoPackageTable[];
  spatialRefSys: SpatialReferenceSystem[];
  geometryColumns: GeometryColumnInfo[];
  contents: ContentInfo[];
  metadata: MetadataInfo[];
  extensions?: ExtensionInfo[];
}

/**
 * GeoPackage Table Structure
 */
export interface GeoPackageTable {
  tableName: string;
  columns: GeoPackageColumn[];
  geometryColumn?: string;
  spatialIndex?: boolean;
  features?: GeoPackageFeature[];
  constraints?: TableConstraint[];
}

/**
 * GeoPackage Column Definition
 */
export interface GeoPackageColumn {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'GEOMETRY';
  notNull?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  defaultValue?: any;
  checkConstraint?: string;
  comment?: string;
}

/**
 * GeoPackage Feature
 */
export interface GeoPackageFeature {
  id: number | string;
  geometry?: Uint8Array; // WKB encoded geometry
  properties: Record<string, any>;
}

/**
 * Spatial Reference System
 */
export interface SpatialReferenceSystem {
  srsName: string;
  srsId: number;
  organization: string;
  organizationCoordsysId: number;
  definition: string; // WKT or PROJ string
  description?: string;
}

/**
 * Geometry Column Information
 */
export interface GeometryColumnInfo {
  tableName: string;
  columnName: string;
  geometryType: GeometryType;
  srs: SpatialReferenceSystem;
  hasZ: boolean;
  hasM: boolean;
}

/**
 * Content Information
 */
export interface ContentInfo {
  tableName: string;
  dataType: 'features' | 'tiles' | 'attributes';
  identifier: string;
  description?: string;
  lastChange?: Date;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  srsId?: number;
}

/**
 * Metadata Information
 */
export interface MetadataInfo {
  id: number;
  mdScope: 'geopackage' | 'table' | 'column' | 'row' | 'rowcol';
  mdStandardUri: string;
  mimeType: string;
  metadata: string;
}

/**
 * Extension Information
 */
export interface ExtensionInfo {
  tableName?: string;
  columnName?: string;
  extensionName: string;
  definition: string;
  scope: 'read-write' | 'write-only';
}

/**
 * Table Constraint
 */
export interface TableConstraint {
  constraintName: string;
  constraintType: 'PRIMARY KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN KEY';
  columnNames: string[];
  definition: string;
}

/**
 * Geometry Types
 */
export type GeometryType = 
  | 'POINT'
  | 'LINESTRING'
  | 'POLYGON'
  | 'MULTIPOINT'
  | 'MULTILINESTRING'
  | 'MULTIPOLYGON'
  | 'GEOMETRYCOLLECTION'
  | 'GEOMETRY';

/**
 * WKB Geometry Types (for binary encoding)
 */
export const WKB_GEOMETRY_TYPES = {
  POINT: 1,
  LINESTRING: 2,
  POLYGON: 3,
  MULTIPOINT: 4,
  MULTILINESTRING: 5,
  MULTIPOLYGON: 6,
  GEOMETRYCOLLECTION: 7,
  POINTZ: 1001,
  LINESTRINGZ: 1002,
  POLYGONZ: 1003
} as const;

/**
 * Standard Spatial Reference Systems
 */
export const STANDARD_SRS: Record<string, SpatialReferenceSystem> = {
  'EPSG:4326': {
    srsName: 'WGS 84',
    srsId: 4326,
    organization: 'EPSG',
    organizationCoordsysId: 4326,
    definition: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.01745329251994328]]',
    description: 'World Geodetic System 1984'
  },
  'EPSG:3857': {
    srsName: 'WGS 84 / Pseudo-Mercator',
    srsId: 3857,
    organization: 'EPSG',
    organizationCoordsysId: 3857,
    definition: 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]]]',
    description: 'Popular Visualization CRS / Pseudo-Mercator'
  }
};

/**
 * GeoPackage Configuration
 */
export interface GeoPackageConfig {
  applicationId: number;
  userVersion: number;
  spatialIndexEnabled: boolean;
  rtreeIndexEnabled: boolean;
  metadataEnabled: boolean;
  extensionsEnabled: boolean;
  compressionEnabled: boolean;
}

/**
 * Import Options
 */
export interface GeoPackageImportOptions {
  targetTable?: string;
  spatialFilter?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  attributeFilter?: Record<string, any>;
  transformCRS?: string;
  createSpatialIndex?: boolean;
  validateGeometry?: boolean;
}

/**
 * Export Options
 */
export interface GeoPackageExportOptions {
  tableName: string;
  layerName?: string;
  description?: string;
  targetCRS?: string;
  includeMetadata?: boolean;
  createSpatialIndex?: boolean;
  compressionLevel?: number;
  customAttributes?: Record<string, any>;
}

/**
 * Database Extent
 */
export interface DatabaseExtent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Decoded Geometry
 */
export interface DecodedGeometry {
  type: string;
  coordinates: number[];
}