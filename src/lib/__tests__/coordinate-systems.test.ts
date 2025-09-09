/**
 * Coordinate Systems Tests
 * 
 * Tests for coordinate system transformations and utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { coordinateSystemUtils, COORDINATE_SYSTEMS } from '../coordinate-systems';
import type { CoordinatePoint } from '../coordinate-systems';

describe('Coordinate Systems Utils', () => {
  beforeEach(() => {
    coordinateSystemUtils.clearCache();
  });

  describe('Coordinate System Information', () => {
    it('should return valid coordinate system information', () => {
      const wgs84 = coordinateSystemUtils.getCoordinateSystem('EPSG:4326');
      
      expect(wgs84).toBeDefined();
      expect(wgs84?.epsg).toBe('EPSG:4326');
      expect(wgs84?.name).toBe('WGS 84');
      expect(wgs84?.type).toBe('geographic');
      expect(wgs84?.recommended).toBe(true);
    });

    it('should return undefined for invalid coordinate systems', () => {
      const invalid = coordinateSystemUtils.getCoordinateSystem('EPSG:99999');
      expect(invalid).toBeUndefined();
    });

    it('should list all supported coordinate systems', () => {
      const systems = coordinateSystemUtils.getSupportedSystems();
      
      expect(systems).toHaveLength(5); // WGS84, Web Mercator, 3 UTM zones
      expect(systems.some(s => s.epsg === 'EPSG:4326')).toBe(true);
      expect(systems.some(s => s.epsg === 'EPSG:3857')).toBe(true);
    });

    it('should return only recommended systems', () => {
      const recommended = coordinateSystemUtils.getRecommendedSystems();
      
      expect(recommended).toHaveLength(1);
      expect(recommended[0].epsg).toBe('EPSG:4326');
    });

    it('should validate coordinate system codes', () => {
      expect(coordinateSystemUtils.validateCoordinateSystem('EPSG:4326')).toBe(true);
      expect(coordinateSystemUtils.validateCoordinateSystem('EPSG:3857')).toBe(true);
      expect(coordinateSystemUtils.validateCoordinateSystem('EPSG:99999')).toBe(false);
      expect(coordinateSystemUtils.validateCoordinateSystem('INVALID')).toBe(false);
    });
  });

  describe('Coordinate Transformations', () => {
    it('should transform WGS84 to Web Mercator', async () => {
      const sourcePoint: CoordinatePoint = {
        x: -74.0060, // longitude
        y: 40.7128,  // latitude
        crs: 'EPSG:4326',
        accuracy: 5
      };

      const result = await coordinateSystemUtils.transformCoordinates(
        sourcePoint,
        'EPSG:3857'
      );

      expect(result.point.crs).toBe('EPSG:3857');
      expect(result.point.x).toBeCloseTo(-8238310, -2); // Approximately
      expect(result.point.y).toBeCloseTo(4969803, -2);  // Approximately
      expect(result.accuracy).toBe(5);
      expect(result.metadata.sourceCRS).toBe('EPSG:4326');
      expect(result.metadata.targetCRS).toBe('EPSG:3857');
    });

    it('should transform Web Mercator to WGS84', async () => {
      const sourcePoint: CoordinatePoint = {
        x: -8238310.24,
        y: 4969803.34,
        crs: 'EPSG:3857',
        accuracy: 10
      };

      const result = await coordinateSystemUtils.transformCoordinates(
        sourcePoint,
        'EPSG:4326'
      );

      expect(result.point.crs).toBe('EPSG:4326');
      expect(result.point.x).toBeCloseTo(-74.0060, 3);
      expect(result.point.y).toBeCloseTo(40.7128, 3);
      expect(result.accuracy).toBe(10);
    });

    it('should handle same CRS transformation (no-op)', async () => {
      const sourcePoint: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326'
      };

      const result = await coordinateSystemUtils.transformCoordinates(
        sourcePoint,
        'EPSG:4326'
      );

      expect(result.point).toEqual(sourcePoint);
      expect(result.metadata.method).toBe('none');
    });

    it('should reject invalid coordinate transformations', async () => {
      const sourcePoint: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326'
      };

      await expect(
        coordinateSystemUtils.transformCoordinates(sourcePoint, 'EPSG:99999')
      ).rejects.toThrow('Transformation from EPSG:4326 to EPSG:99999 not supported');
    });

    it('should handle coordinate precision correctly', () => {
      const degreePrecision = coordinateSystemUtils.getCoordinatePrecision('EPSG:4326');
      const meterPrecision = coordinateSystemUtils.getCoordinatePrecision('EPSG:3857');
      const defaultPrecision = coordinateSystemUtils.getCoordinatePrecision('EPSG:99999');

      expect(degreePrecision).toBe(8);
      expect(meterPrecision).toBe(2);
      expect(defaultPrecision).toBe(6);
    });
  });

  describe('UTM Zone Calculations', () => {
    it('should determine correct UTM zone from coordinates', () => {
      // New York City coordinates
      const nycZone = coordinateSystemUtils.getUTMZone(-74.0060, 40.7128);
      
      expect(nycZone.zone).toBe(18);
      expect(nycZone.hemisphere).toBe('N');
      expect(nycZone.epsg).toBe('EPSG:32618');
      expect(nycZone.centralMeridian).toBe(-75);
    });

    it('should determine southern hemisphere UTM zones', () => {
      // Sydney, Australia coordinates
      const sydneyZone = coordinateSystemUtils.getUTMZone(151.2093, -33.8688);
      
      expect(sydneyZone.zone).toBe(56);
      expect(sydneyZone.hemisphere).toBe('S');
      expect(sydneyZone.epsg).toBe('EPSG:32756');
    });

    it('should find optimal UTM zone for multiple coordinates', () => {
      const coordinates = [
        { longitude: -74.0060, latitude: 40.7128 }, // NYC
        { longitude: -73.9857, latitude: 40.7484 }, // NYC area
        { longitude: -74.0445, latitude: 40.6892 }  // NYC area
      ];

      const optimalZone = coordinateSystemUtils.getOptimalUTMZone(coordinates);
      
      expect(optimalZone.zone).toBe(18);
      expect(optimalZone.hemisphere).toBe('N');
    });

    it('should handle empty coordinate array', () => {
      expect(() => {
        coordinateSystemUtils.getOptimalUTMZone([]);
      }).toThrow('No coordinates provided');
    });
  });

  describe('Geographic Calculations', () => {
    it('should calculate distance between points correctly', () => {
      const point1 = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const point2 = { latitude: 34.0522, longitude: -118.2437 }; // LA

      const distance = coordinateSystemUtils.calculateDistance(point1, point2);
      
      // Distance between NYC and LA is approximately 3,944 km
      expect(distance).toBeCloseTo(3944000, -3); // Within 1km
    });

    it('should calculate bearing between points', () => {
      const point1 = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const point2 = { latitude: 40.7589, longitude: -73.9851 }; // Times Square

      const bearing = coordinateSystemUtils.calculateBearing(point1, point2);
      
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should calculate geographic center of points', () => {
      const points = [
        { latitude: 40.7128, longitude: -74.0060 }, // NYC
        { latitude: 40.7589, longitude: -73.9851 }, // Times Square  
        { latitude: 40.6782, longitude: -73.9442 }  // Brooklyn
      ];

      const center = coordinateSystemUtils.calculateCenter(points);
      
      expect(center.latitude).toBeCloseTo(40.72, 1);
      expect(center.longitude).toBeCloseTo(-73.98, 1);
    });

    it('should handle empty points array for center calculation', () => {
      expect(() => {
        coordinateSystemUtils.calculateCenter([]);
      }).toThrow('No points provided');
    });
  });

  describe('Extent Management', () => {
    it('should calculate extent from coordinates', () => {
      const coordinates: CoordinatePoint[] = [
        { x: -74.0060, y: 40.7128, crs: 'EPSG:4326' },
        { x: -73.9857, y: 40.7484, crs: 'EPSG:4326' },
        { x: -74.0445, y: 40.6892, crs: 'EPSG:4326' }
      ];

      const extent = coordinateSystemUtils.calculateExtent(coordinates);
      
      expect(extent).not.toBeNull();
      expect(extent!.minX).toBe(-74.0445);
      expect(extent!.maxX).toBe(-73.9857);
      expect(extent!.minY).toBe(40.6892);
      expect(extent!.maxY).toBe(40.7484);
      expect(extent!.crs).toBe('EPSG:4326');
    });

    it('should return null for empty coordinates', () => {
      const extent = coordinateSystemUtils.calculateExtent([]);
      expect(extent).toBeNull();
    });

    it('should transform extent between coordinate systems', async () => {
      const wgs84Extent = {
        minX: -74.1,
        minY: 40.7,
        maxX: -73.9,
        maxY: 40.8,
        crs: 'EPSG:4326'
      };

      const transformedExtent = await coordinateSystemUtils.transformExtent(
        wgs84Extent,
        'EPSG:3857'
      );

      expect(transformedExtent.crs).toBe('EPSG:3857');
      expect(transformedExtent.minX).toBeLessThan(transformedExtent.maxX);
      expect(transformedExtent.minY).toBeLessThan(transformedExtent.maxY);
    });

    it('should check if point is within extent', () => {
      const extent = {
        minX: -75,
        minY: 40,
        maxX: -73,
        maxY: 41,
        crs: 'EPSG:4326'
      };

      const insidePoint: CoordinatePoint = {
        x: -74,
        y: 40.5,
        crs: 'EPSG:4326'
      };

      const outsidePoint: CoordinatePoint = {
        x: -72,
        y: 42,
        crs: 'EPSG:4326'
      };

      expect(coordinateSystemUtils.isPointInExtent(insidePoint, extent)).toBe(true);
      expect(coordinateSystemUtils.isPointInExtent(outsidePoint, extent)).toBe(false);
    });
  });

  describe('Coordinate Validation', () => {
    it('should validate correct coordinates', () => {
      const validPoint: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326',
        accuracy: 5
      };

      const validation = coordinateSystemUtils.validateCoordinate(validPoint);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid coordinates', () => {
      const invalidPoint: CoordinatePoint = {
        x: 200, // Invalid longitude for WGS84
        y: 100, // Invalid latitude for WGS84
        crs: 'EPSG:4326'
      };

      const validation = coordinateSystemUtils.validateCoordinate(invalidPoint);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect unsupported coordinate systems', () => {
      const pointWithInvalidCRS: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:99999'
      };

      const validation = coordinateSystemUtils.validateCoordinate(pointWithInvalidCRS);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Unsupported coordinate system'))).toBe(true);
    });

    it('should warn about low accuracy', () => {
      const lowAccuracyPoint: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326',
        accuracy: 100 // Low accuracy
      };

      const validation = coordinateSystemUtils.validateCoordinate(lowAccuracyPoint);
      
      expect(validation.warnings.some(w => w.includes('Low accuracy'))).toBe(true);
    });

    it('should detect NaN and Infinity values', () => {
      const nanPoint: CoordinatePoint = {
        x: NaN,
        y: Infinity,
        crs: 'EPSG:4326'
      };

      const validation = coordinateSystemUtils.validateCoordinate(nanPoint);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('invalid values'))).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should format coordinates correctly', () => {
      const point: CoordinatePoint = {
        x: -74.006012345,
        y: 40.712812345,
        crs: 'EPSG:4326'
      };

      const formatted = coordinateSystemUtils.formatCoordinate(point);
      
      expect(formatted).toContain('-74.00601235');
      expect(formatted).toContain('40.71281235');
      expect(formatted).toContain('EPSG:4326');
    });

    it('should format coordinates with custom precision', () => {
      const point: CoordinatePoint = {
        x: -74.123456789,
        y: 40.987654321,
        crs: 'EPSG:4326'
      };

      const formatted = coordinateSystemUtils.formatCoordinate(point, 3);
      
      expect(formatted).toContain('-74.123');
      expect(formatted).toContain('40.988');
    });

    it('should manage transformation cache', () => {
      coordinateSystemUtils.clearCache();
      
      const stats = coordinateSystemUtils.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle extreme coordinate values', async () => {
      // Test coordinates at extent boundaries
      const extremePoints = [
        { x: -180, y: -90, crs: 'EPSG:4326' }, // Southwest corner
        { x: 180, y: 90, crs: 'EPSG:4326' },   // Northeast corner
        { x: 0, y: 0, crs: 'EPSG:4326' }       // Origin
      ];

      for (const point of extremePoints) {
        const validation = coordinateSystemUtils.validateCoordinate(point);
        expect(validation.isValid).toBe(true);
      }
    });

    it('should handle Web Mercator extent limitations', async () => {
      // Web Mercator has latitude limits of ~±85.0511°
      const extremeLatPoint: CoordinatePoint = {
        x: 0,
        y: 89, // Beyond Web Mercator limit
        crs: 'EPSG:4326'
      };

      const result = await coordinateSystemUtils.transformCoordinates(
        extremeLatPoint,
        'EPSG:3857'
      );

      // Should clamp to Web Mercator limits
      expect(result.point.y).toBeLessThan(20037509); // Max Web Mercator Y
    });

    it('should maintain precision during multiple transformations', async () => {
      const originalPoint: CoordinatePoint = {
        x: -74.006012345,
        y: 40.712812345,
        crs: 'EPSG:4326'
      };

      // Transform to Web Mercator and back
      const toWebMercator = await coordinateSystemUtils.transformCoordinates(
        originalPoint,
        'EPSG:3857'
      );
      
      const backToWGS84 = await coordinateSystemUtils.transformCoordinates(
        toWebMercator.point,
        'EPSG:4326'
      );

      // Should maintain reasonable precision (within 0.001 degrees ~ 100m)
      expect(backToWGS84.point.x).toBeCloseTo(originalPoint.x, 3);
      expect(backToWGS84.point.y).toBeCloseTo(originalPoint.y, 3);
    });
  });
});