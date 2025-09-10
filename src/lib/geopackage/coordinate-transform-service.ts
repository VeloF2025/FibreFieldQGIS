/**
 * Coordinate Transform Service
 * 
 * Handles coordinate system transformations between different spatial reference systems.
 * Provides comprehensive support for projection handling and coordinate validation.
 * 
 * Features:
 * - Coordinate system transformations (WGS84 ↔ Web Mercator)
 * - Projection handling and validation
 * - Spatial reference system management
 * - Coordinate bounds checking and validation
 * - Distance calculations and spatial operations
 */

import { log } from '@/lib/logger';
import type { SpatialReferenceSystem, STANDARD_SRS } from './types';

/**
 * Point coordinate interface
 */
export interface Point {
  x: number; // longitude or easting
  y: number; // latitude or northing
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Transformation parameters
 */
interface TransformationParams {
  sourceSRS: SpatialReferenceSystem;
  targetSRS: SpatialReferenceSystem;
  validateBounds?: boolean;
}

/**
 * Coordinate Transform Service
 * 
 * Provides coordinate transformation capabilities for GeoPackage operations.
 * Supports common transformations between WGS84 and Web Mercator projections.
 */
export class CoordinateTransformService {
  // Earth radius in meters (WGS84)
  private readonly EARTH_RADIUS = 6378137;
  
  // Maximum valid coordinate bounds for different SRS
  private readonly SRS_BOUNDS: Record<number, BoundingBox> = {
    4326: { minX: -180, minY: -90, maxX: 180, maxY: 90 }, // WGS84
    3857: { minX: -20037508.342789244, minY: -20037508.342789244, maxX: 20037508.342789244, maxY: 20037508.342789244 } // Web Mercator
  };

  constructor() {
    log.info('Coordinate Transform Service initialized', {}, 'CoordinateTransformService');
  }

  /**
   * Transform point from source to target coordinate system
   */
  async transformPoint(
    point: Point,
    sourceSRSId: number,
    targetSRSId: number,
    validateBounds: boolean = true
  ): Promise<Point> {
    const timerId = log.startTimer('transformPoint', 'CoordinateTransformService');
    
    try {
      // Skip transformation if source and target are the same
      if (sourceSRSId === targetSRSId) {
        return { ...point };
      }

      // Validate input coordinates
      if (validateBounds) {
        this.validatePointBounds(point, sourceSRSId);
      }

      let transformedPoint: Point;

      // Handle common transformations
      if (sourceSRSId === 4326 && targetSRSId === 3857) {
        transformedPoint = this.wgs84ToWebMercator(point);
      } else if (sourceSRSId === 3857 && targetSRSId === 4326) {
        transformedPoint = this.webMercatorToWgs84(point);
      } else {
        // For other transformations, use generic transformation
        transformedPoint = await this.genericTransform(point, sourceSRSId, targetSRSId);
      }

      // Validate output coordinates
      if (validateBounds) {
        this.validatePointBounds(transformedPoint, targetSRSId);
      }

      log.debug('Point transformed successfully', {
        source: { ...point, srsId: sourceSRSId },
        target: { ...transformedPoint, srsId: targetSRSId }
      }, 'CoordinateTransformService');

      return transformedPoint;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Point transformation failed', {
        point,
        sourceSRSId,
        targetSRSId,
        error: errorMessage
      }, 'CoordinateTransformService', error as Error);
      throw new Error(`Point transformation failed: ${errorMessage}`);
    } finally {
      log.endTimer(timerId);
    }
  }

  /**
   * Transform bounding box from source to target coordinate system
   */
  async transformBounds(
    bounds: BoundingBox,
    sourceSRSId: number,
    targetSRSId: number
  ): Promise<BoundingBox> {
    try {
      // Transform corner points
      const bottomLeft = await this.transformPoint(
        { x: bounds.minX, y: bounds.minY },
        sourceSRSId,
        targetSRSId
      );
      
      const topRight = await this.transformPoint(
        { x: bounds.maxX, y: bounds.maxY },
        sourceSRSId,
        targetSRSId
      );

      // For Web Mercator transformations, we need to check additional points
      // to handle the curvature properly
      if ((sourceSRSId === 4326 && targetSRSId === 3857) || 
          (sourceSRSId === 3857 && targetSRSId === 4326)) {
        
        const topLeft = await this.transformPoint(
          { x: bounds.minX, y: bounds.maxY },
          sourceSRSId,
          targetSRSId
        );
        
        const bottomRight = await this.transformPoint(
          { x: bounds.maxX, y: bounds.minY },
          sourceSRSId,
          targetSRSId
        );

        // Find the actual extent
        const allX = [bottomLeft.x, topRight.x, topLeft.x, bottomRight.x];
        const allY = [bottomLeft.y, topRight.y, topLeft.y, bottomRight.y];

        return {
          minX: Math.min(...allX),
          minY: Math.min(...allY),
          maxX: Math.max(...allX),
          maxY: Math.max(...allY)
        };
      }

      return {
        minX: Math.min(bottomLeft.x, topRight.x),
        minY: Math.min(bottomLeft.y, topRight.y),
        maxX: Math.max(bottomLeft.x, topRight.x),
        maxY: Math.max(bottomLeft.y, topRight.y)
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Bounds transformation failed', {
        bounds,
        sourceSRSId,
        targetSRSId,
        error: errorMessage
      }, 'CoordinateTransformService', error as Error);
      throw new Error(`Bounds transformation failed: ${errorMessage}`);
    }
  }

  /**
   * Transform WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)
   */
  private wgs84ToWebMercator(point: Point): Point {
    const x = point.x * Math.PI / 180 * this.EARTH_RADIUS;
    const y = Math.log(Math.tan((90 + point.y) * Math.PI / 360)) * this.EARTH_RADIUS;
    
    return { x, y };
  }

  /**
   * Transform Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
   */
  private webMercatorToWgs84(point: Point): Point {
    const x = point.x / this.EARTH_RADIUS * 180 / Math.PI;
    const y = (2 * Math.atan(Math.exp(point.y / this.EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI;
    
    return { x, y };
  }

  /**
   * Generic transformation for less common coordinate systems
   */
  private async genericTransform(
    point: Point,
    sourceSRSId: number,
    targetSRSId: number
  ): Promise<Point> {
    // In a real implementation, this would use a library like proj4js
    // For now, throw an error for unsupported transformations
    throw new Error(`Transformation from EPSG:${sourceSRSId} to EPSG:${targetSRSId} is not supported`);
  }

  /**
   * Validate point coordinates against SRS bounds
   */
  private validatePointBounds(point: Point, srsId: number): void {
    const bounds = this.SRS_BOUNDS[srsId];
    if (!bounds) {
      log.warn('Unknown SRS bounds', { srsId }, 'CoordinateTransformService');
      return;
    }

    if (point.x < bounds.minX || point.x > bounds.maxX ||
        point.y < bounds.minY || point.y > bounds.maxY) {
      throw new Error(
        `Point coordinates (${point.x}, ${point.y}) are outside valid bounds for EPSG:${srsId}`
      );
    }
  }

  /**
   * Calculate distance between two points in WGS84 coordinates
   */
  calculateDistance(point1: Point, point2: Point): number {
    // Haversine formula for great circle distance
    const lat1Rad = point1.y * Math.PI / 180;
    const lat2Rad = point2.y * Math.PI / 180;
    const deltaLatRad = (point2.y - point1.y) * Math.PI / 180;
    const deltaLonRad = (point2.x - point1.x) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS * c; // Distance in meters
  }

  /**
   * Calculate bearing between two points in WGS84 coordinates
   */
  calculateBearing(point1: Point, point2: Point): number {
    const lat1Rad = point1.y * Math.PI / 180;
    const lat2Rad = point2.y * Math.PI / 180;
    const deltaLonRad = (point2.x - point1.x) * Math.PI / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return (bearingRad * 180 / Math.PI + 360) % 360; // Convert to degrees and normalize
  }

  /**
   * Check if point is within bounding box
   */
  isPointInBounds(point: Point, bounds: BoundingBox): boolean {
    return point.x >= bounds.minX && point.x <= bounds.maxX &&
           point.y >= bounds.minY && point.y <= bounds.maxY;
  }

  /**
   * Expand bounding box to include point
   */
  expandBounds(bounds: BoundingBox, point: Point): BoundingBox {
    return {
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y)
    };
  }

  /**
   * Create bounding box from array of points
   */
  createBoundsFromPoints(points: Point[]): BoundingBox | null {
    if (points.length === 0) {
      return null;
    }

    let bounds: BoundingBox = {
      minX: points[0].x,
      minY: points[0].y,
      maxX: points[0].x,
      maxY: points[0].y
    };

    for (let i = 1; i < points.length; i++) {
      bounds = this.expandBounds(bounds, points[i]);
    }

    return bounds;
  }

  /**
   * Get supported coordinate reference systems
   */
  getSupportedSRS(): number[] {
    return Object.keys(this.SRS_BOUNDS).map(Number);
  }

  /**
   * Validate SRS ID is supported
   */
  isSRSSupported(srsId: number): boolean {
    return srsId in this.SRS_BOUNDS;
  }

  /**
   * Get SRS bounds for validation
   */
  getSRSBounds(srsId: number): BoundingBox | null {
    return this.SRS_BOUNDS[srsId] || null;
  }

  /**
   * Convert decimal degrees to degrees, minutes, seconds
   */
  toDMS(decimal: number, isLatitude: boolean = true): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2);
    
    const direction = isLatitude 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }

  /**
   * Convert degrees, minutes, seconds to decimal degrees
   */
  fromDMS(degrees: number, minutes: number, seconds: number, isNegative: boolean = false): number {
    const decimal = degrees + minutes / 60 + seconds / 3600;
    return isNegative ? -decimal : decimal;
  }
}

// Export singleton instance
export const coordinateTransformService = new CoordinateTransformService();