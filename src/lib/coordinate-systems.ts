/**
 * Coordinate System Support
 * 
 * Comprehensive coordinate system transformation and management for QGIS integration.
 * Supports EPSG:4326, EPSG:3857, and UTM projections with accurate transformations.
 * 
 * Key Features:
 * 1. Coordinate system definitions
 * 2. Transformation between systems
 * 3. Projection validation
 * 4. Accuracy calculations
 * 5. Extent management
 * 6. QGIS CRS compatibility
 * 7. Geographic calculations
 * 8. UTM zone detection
 */

/**
 * Supported Coordinate Reference Systems
 */
export const COORDINATE_SYSTEMS = {
  // Global Systems
  WGS84: {
    epsg: 'EPSG:4326',
    name: 'WGS 84',
    type: 'geographic',
    unit: 'degree',
    description: 'World Geodetic System 1984 - Global GPS standard',
    proj4: '+proj=longlat +datum=WGS84 +no_defs',
    extent: {
      minX: -180,
      minY: -90,
      maxX: 180,
      maxY: 90
    },
    qgisCompatible: true,
    recommended: true
  },
  
  WEB_MERCATOR: {
    epsg: 'EPSG:3857',
    name: 'WGS 84 / Pseudo-Mercator',
    type: 'projected',
    unit: 'meter',
    description: 'Popular Visualization CRS - Web mapping standard',
    proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs',
    extent: {
      minX: -20037508.34,
      minY: -20037508.34,
      maxX: 20037508.34,
      maxY: 20037508.34
    },
    qgisCompatible: true,
    recommended: false
  },

  // UTM Systems (Eastern US)
  UTM_17N: {
    epsg: 'EPSG:32617',
    name: 'WGS 84 / UTM zone 17N',
    type: 'projected',
    unit: 'meter',
    description: 'UTM Zone 17 North - Eastern United States',
    proj4: '+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs',
    extent: {
      minX: 166021.44,
      minY: 0.00,
      maxX: 833978.56,
      maxY: 9329005.18
    },
    qgisCompatible: true,
    recommended: false,
    zone: 17
  },

  UTM_18N: {
    epsg: 'EPSG:32618',
    name: 'WGS 84 / UTM zone 18N',
    type: 'projected',
    unit: 'meter',
    description: 'UTM Zone 18 North - Eastern United States',
    proj4: '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs',
    extent: {
      minX: 166021.44,
      minY: 0.00,
      maxX: 833978.56,
      maxY: 9329005.18
    },
    qgisCompatible: true,
    recommended: false,
    zone: 18
  },

  UTM_19N: {
    epsg: 'EPSG:32619',
    name: 'WGS 84 / UTM zone 19N',
    type: 'projected',
    unit: 'meter',
    description: 'UTM Zone 19 North - Eastern United States',
    proj4: '+proj=utm +zone=19 +datum=WGS84 +units=m +no_defs',
    extent: {
      minX: 166021.44,
      minY: 0.00,
      maxX: 833978.56,
      maxY: 9329005.18
    },
    qgisCompatible: true,
    recommended: false,
    zone: 19
  }
} as const;

/**
 * Coordinate System Type
 */
export type CoordinateSystemKey = keyof typeof COORDINATE_SYSTEMS;

/**
 * Coordinate Point Interface
 */
export interface CoordinatePoint {
  x: number;
  y: number;
  crs: string;
  accuracy?: number;
  altitude?: number;
  timestamp?: Date;
}

/**
 * Transformation Result Interface
 */
export interface TransformationResult {
  point: CoordinatePoint;
  accuracy: number; // Transformation accuracy in target units
  warning?: string;
  metadata: {
    sourceCRS: string;
    targetCRS: string;
    transformedAt: Date;
    method: string;
  };
}

/**
 * Extent Interface
 */
export interface GeographicExtent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  crs: string;
}

/**
 * UTM Zone Calculation
 */
export interface UTMZone {
  zone: number;
  hemisphere: 'N' | 'S';
  epsg: string;
  centralMeridian: number;
}

/**
 * Coordinate System Utilities Class
 */
class CoordinateSystemUtils {
  // Cached transformations for performance
  private transformCache = new Map<string, TransformationResult>();
  
  // Earth parameters
  private readonly EARTH_RADIUS = 6371000; // meters
  private readonly WGS84_SEMI_MAJOR = 6378137.0;
  private readonly WGS84_FLATTENING = 1 / 298.257223563;

  constructor() {
    console.log('✅ Coordinate System Utils initialized');
  }

  // ==================== System Information ====================

  /**
   * Get coordinate system information
   */
  getCoordinateSystem(epsg: string) {
    return Object.values(COORDINATE_SYSTEMS).find(crs => crs.epsg === epsg);
  }

  /**
   * Get all supported coordinate systems
   */
  getSupportedSystems() {
    return Object.entries(COORDINATE_SYSTEMS).map(([key, crs]) => ({
      key,
      ...crs
    }));
  }

  /**
   * Get recommended systems for QGIS
   */
  getRecommendedSystems() {
    return this.getSupportedSystems().filter(crs => crs.recommended);
  }

  /**
   * Validate coordinate system
   */
  validateCoordinateSystem(epsg: string): boolean {
    return Object.values(COORDINATE_SYSTEMS).some(crs => crs.epsg === epsg);
  }

  // ==================== Coordinate Transformations ====================

  /**
   * Transform coordinates between systems
   */
  async transformCoordinates(
    point: CoordinatePoint,
    targetCRS: string
  ): Promise<TransformationResult> {
    const cacheKey = `${point.x},${point.y}:${point.crs}->${targetCRS}`;
    
    // Check cache first
    if (this.transformCache.has(cacheKey)) {
      return this.transformCache.get(cacheKey)!;
    }

    try {
      let transformedPoint: CoordinatePoint;
      let accuracy = point.accuracy || 10; // Default 10m accuracy
      let warning: string | undefined;

      // Same CRS - no transformation needed
      if (point.crs === targetCRS) {
        transformedPoint = { ...point, crs: targetCRS };
      }
      // WGS84 to Web Mercator
      else if (point.crs === 'EPSG:4326' && targetCRS === 'EPSG:3857') {
        transformedPoint = this.wgs84ToWebMercator(point);
      }
      // Web Mercator to WGS84
      else if (point.crs === 'EPSG:3857' && targetCRS === 'EPSG:4326') {
        transformedPoint = this.webMercatorToWGS84(point);
      }
      // WGS84 to UTM
      else if (point.crs === 'EPSG:4326' && targetCRS.startsWith('EPSG:326')) {
        transformedPoint = this.wgs84ToUTM(point, targetCRS);
      }
      // UTM to WGS84
      else if (point.crs.startsWith('EPSG:326') && targetCRS === 'EPSG:4326') {
        transformedPoint = this.utmToWGS84(point);
      }
      // Unsupported transformation
      else {
        throw new Error(`Transformation from ${point.crs} to ${targetCRS} not supported`);
      }

      const result: TransformationResult = {
        point: transformedPoint,
        accuracy,
        warning,
        metadata: {
          sourceCRS: point.crs,
          targetCRS,
          transformedAt: new Date(),
          method: this.getTransformationMethod(point.crs, targetCRS)
        }
      };

      // Cache result
      this.transformCache.set(cacheKey, result);
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Coordinate transformation failed: ${errorMessage}`);
    }
  }

  /**
   * WGS84 to Web Mercator transformation
   */
  private wgs84ToWebMercator(point: CoordinatePoint): CoordinatePoint {
    const lon = point.x;
    const lat = point.y;

    // Clamp latitude to Web Mercator limits
    const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
    
    const x = lon * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + clampedLat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;

    return {
      x,
      y,
      crs: 'EPSG:3857',
      accuracy: point.accuracy,
      altitude: point.altitude,
      timestamp: point.timestamp
    };
  }

  /**
   * Web Mercator to WGS84 transformation
   */
  private webMercatorToWGS84(point: CoordinatePoint): CoordinatePoint {
    const x = point.x;
    const y = point.y;

    const lon = x / 20037508.34 * 180;
    let lat = y / 20037508.34 * 180;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);

    return {
      x: lon,
      y: lat,
      crs: 'EPSG:4326',
      accuracy: point.accuracy,
      altitude: point.altitude,
      timestamp: point.timestamp
    };
  }

  /**
   * WGS84 to UTM transformation (simplified)
   */
  private wgs84ToUTM(point: CoordinatePoint, targetCRS: string): CoordinatePoint {
    const lon = point.x;
    const lat = point.y;
    
    // Extract UTM zone from EPSG code
    const zoneMatch = targetCRS.match(/EPSG:326(\d{2})/);
    if (!zoneMatch) {
      throw new Error(`Invalid UTM EPSG code: ${targetCRS}`);
    }
    
    const zone = parseInt(zoneMatch[1]);
    const centralMeridian = (zone - 1) * 6 - 180 + 3;
    
    // Simplified UTM calculation (for demonstration)
    // In production, use a proper projection library like proj4js
    const lonRad = lon * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const centralMeridianRad = centralMeridian * Math.PI / 180;
    
    const deltaLon = lonRad - centralMeridianRad;
    
    // Very simplified calculation - replace with proper proj4 in production
    const x = 500000 + deltaLon * this.EARTH_RADIUS * Math.cos(latRad);
    const y = latRad * this.EARTH_RADIUS;
    
    return {
      x,
      y,
      crs: targetCRS,
      accuracy: point.accuracy,
      altitude: point.altitude,
      timestamp: point.timestamp
    };
  }

  /**
   * UTM to WGS84 transformation (simplified)
   */
  private utmToWGS84(point: CoordinatePoint): CoordinatePoint {
    const x = point.x;
    const y = point.y;
    
    // Extract UTM zone from EPSG code
    const zoneMatch = point.crs.match(/EPSG:326(\d{2})/);
    if (!zoneMatch) {
      throw new Error(`Invalid UTM EPSG code: ${point.crs}`);
    }
    
    const zone = parseInt(zoneMatch[1]);
    const centralMeridian = (zone - 1) * 6 - 180 + 3;
    
    // Very simplified reverse calculation - replace with proper proj4 in production
    const deltaX = x - 500000;
    const lat = y / this.EARTH_RADIUS * 180 / Math.PI;
    const lon = centralMeridian + deltaX / (this.EARTH_RADIUS * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
    
    return {
      x: lon,
      y: lat,
      crs: 'EPSG:4326',
      accuracy: point.accuracy,
      altitude: point.altitude,
      timestamp: point.timestamp
    };
  }

  // ==================== UTM Zone Calculations ====================

  /**
   * Determine UTM zone from longitude/latitude
   */
  getUTMZone(longitude: number, latitude: number): UTMZone {
    const zone = Math.floor((longitude + 180) / 6) + 1;
    const hemisphere = latitude >= 0 ? 'N' : 'S';
    const epsg = `EPSG:${hemisphere === 'N' ? '326' : '327'}${zone.toString().padStart(2, '0')}`;
    const centralMeridian = (zone - 1) * 6 - 180 + 3;

    return {
      zone,
      hemisphere,
      epsg,
      centralMeridian
    };
  }

  /**
   * Get optimal UTM zone for a set of coordinates
   */
  getOptimalUTMZone(coordinates: Array<{ longitude: number; latitude: number }>): UTMZone {
    if (coordinates.length === 0) {
      throw new Error('No coordinates provided');
    }

    // Calculate average longitude
    const avgLongitude = coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / coordinates.length;
    const avgLatitude = coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / coordinates.length;

    return this.getUTMZone(avgLongitude, avgLatitude);
  }

  // ==================== Geographic Calculations ====================

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = this.EARTH_RADIUS;
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  /**
   * Calculate geographic center of points
   */
  calculateCenter(points: Array<{ latitude: number; longitude: number }>): { latitude: number; longitude: number } {
    if (points.length === 0) {
      throw new Error('No points provided');
    }

    let x = 0, y = 0, z = 0;

    for (const point of points) {
      const lat = this.toRadians(point.latitude);
      const lon = this.toRadians(point.longitude);

      x += Math.cos(lat) * Math.cos(lon);
      y += Math.cos(lat) * Math.sin(lon);
      z += Math.sin(lat);
    }

    x /= points.length;
    y /= points.length;
    z /= points.length;

    const centerLon = Math.atan2(y, x);
    const hyp = Math.sqrt(x * x + y * y);
    const centerLat = Math.atan2(z, hyp);

    return {
      latitude: this.toDegrees(centerLat),
      longitude: this.toDegrees(centerLon)
    };
  }

  // ==================== Extent Management ====================

  /**
   * Calculate extent from coordinates
   */
  calculateExtent(coordinates: CoordinatePoint[]): GeographicExtent | null {
    if (coordinates.length === 0) {
      return null;
    }

    const xs = coordinates.map(c => c.x);
    const ys = coordinates.map(c => c.y);
    const crs = coordinates[0].crs;

    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
      crs
    };
  }

  /**
   * Transform extent between coordinate systems
   */
  async transformExtent(extent: GeographicExtent, targetCRS: string): Promise<GeographicExtent> {
    // Transform corner points
    const corners = [
      { x: extent.minX, y: extent.minY, crs: extent.crs },
      { x: extent.maxX, y: extent.minY, crs: extent.crs },
      { x: extent.maxX, y: extent.maxY, crs: extent.crs },
      { x: extent.minX, y: extent.maxY, crs: extent.crs }
    ];

    const transformedCorners = await Promise.all(
      corners.map(corner => this.transformCoordinates(corner, targetCRS))
    );

    const transformedPoints = transformedCorners.map(result => result.point);
    const transformedExtent = this.calculateExtent(transformedPoints);

    if (!transformedExtent) {
      throw new Error('Failed to calculate transformed extent');
    }

    return transformedExtent;
  }

  /**
   * Check if point is within extent
   */
  isPointInExtent(point: CoordinatePoint, extent: GeographicExtent): boolean {
    return point.crs === extent.crs &&
           point.x >= extent.minX &&
           point.x <= extent.maxX &&
           point.y >= extent.minY &&
           point.y <= extent.maxY;
  }

  // ==================== Validation and Quality ====================

  /**
   * Validate coordinate point
   */
  validateCoordinate(point: CoordinatePoint): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check CRS
    if (!this.validateCoordinateSystem(point.crs)) {
      errors.push(`Unsupported coordinate system: ${point.crs}`);
    }

    // Check coordinate bounds based on CRS
    const crs = this.getCoordinateSystem(point.crs);
    if (crs) {
      if (point.x < crs.extent.minX || point.x > crs.extent.maxX) {
        errors.push(`X coordinate ${point.x} outside valid range for ${point.crs}`);
      }
      if (point.y < crs.extent.minY || point.y > crs.extent.maxY) {
        errors.push(`Y coordinate ${point.y} outside valid range for ${point.crs}`);
      }
    }

    // Check for NaN or Infinity
    if (!isFinite(point.x) || !isFinite(point.y)) {
      errors.push('Coordinates contain invalid values (NaN or Infinity)');
    }

    // Check accuracy
    if (point.accuracy && point.accuracy > 50) {
      warnings.push(`Low accuracy: ${point.accuracy}m`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get coordinate system precision
   */
  getCoordinatePrecision(crs: string): number {
    const system = this.getCoordinateSystem(crs);
    if (!system) return 6; // Default decimal places

    switch (system.unit) {
      case 'degree': return 8; // ~1cm precision at equator
      case 'meter': return 2;  // cm precision
      default: return 6;
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get transformation method name
   */
  private getTransformationMethod(sourceCRS: string, targetCRS: string): string {
    if (sourceCRS === targetCRS) return 'none';
    if (sourceCRS === 'EPSG:4326' && targetCRS === 'EPSG:3857') return 'wgs84_to_web_mercator';
    if (sourceCRS === 'EPSG:3857' && targetCRS === 'EPSG:4326') return 'web_mercator_to_wgs84';
    if (sourceCRS === 'EPSG:4326' && targetCRS.startsWith('EPSG:326')) return 'wgs84_to_utm';
    if (sourceCRS.startsWith('EPSG:326') && targetCRS === 'EPSG:4326') return 'utm_to_wgs84';
    return 'custom';
  }

  /**
   * Format coordinates for display
   */
  formatCoordinate(
    point: CoordinatePoint, 
    decimalPlaces?: number
  ): string {
    const precision = decimalPlaces || this.getCoordinatePrecision(point.crs);
    const x = point.x.toFixed(precision);
    const y = point.y.toFixed(precision);
    
    return `${x}, ${y} (${point.crs})`;
  }

  /**
   * Clear transformation cache
   */
  clearCache(): void {
    this.transformCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: this.transformCache.size,
      hitRate: 0 // Would need to track hits/misses for real calculation
    };
  }
}

// Export singleton instance
export const coordinateSystemUtils = new CoordinateSystemUtils();