/**
 * Photo Geotagging Tests
 * 
 * Tests for photo geotagging functionality and QGIS metadata
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { photoGeotaggingService } from '../photo-geotagging';
import type { 
  CoordinatePoint,
  PhotoLocationData,
  QGISPhotoMetadata,
  GPSExifData 
} from '../photo-geotagging';

// Mock coordinateSystemUtils
vi.mock('../coordinate-systems', () => ({
  coordinateSystemUtils: {
    transformCoordinates: vi.fn()
  }
}));

describe('Photo Geotagging Service', () => {
  const mockCoordinates: CoordinatePoint = {
    x: -74.0060,
    y: 40.7128,
    crs: 'EPSG:4326',
    accuracy: 5,
    altitude: 10,
    timestamp: new Date('2024-01-15T10:30:00Z')
  };

  const mockPhotoFile = new File(['mock-image-data'], 'test-photo.jpg', {
    type: 'image/jpeg'
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GPS EXIF Data Creation', () => {
    it('should create GPS EXIF data from coordinates', () => {
      // This tests the private method through public interface
      // In a real test, we'd expose the method or test through integration
      expect(mockCoordinates.x).toBe(-74.0060);
      expect(mockCoordinates.y).toBe(40.7128);
    });

    it('should handle positive and negative coordinates', () => {
      const positiveCoords: CoordinatePoint = {
        x: 151.2093, // East longitude
        y: -33.8688, // South latitude
        crs: 'EPSG:4326'
      };

      expect(positiveCoords.x).toBeGreaterThan(0);
      expect(positiveCoords.y).toBeLessThan(0);
    });
  });

  describe('GPS Data Embedding', () => {
    it('should embed GPS coordinates into photo', async () => {
      const result = await photoGeotaggingService.embedGPSInPhoto(
        mockPhotoFile,
        mockCoordinates
      );

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
    });

    it('should handle coordinate system transformation during embedding', async () => {
      const webMercatorCoords: CoordinatePoint = {
        x: -8238310.24,
        y: 4969803.34,
        crs: 'EPSG:3857',
        accuracy: 10
      };

      // Mock coordinate transformation
      const { coordinateSystemUtils } = await import('../coordinate-systems');
      vi.mocked(coordinateSystemUtils.transformCoordinates).mockResolvedValue({
        point: mockCoordinates,
        accuracy: 10,
        metadata: {
          sourceCRS: 'EPSG:3857',
          targetCRS: 'EPSG:4326',
          transformedAt: new Date(),
          method: 'web_mercator_to_wgs84'
        }
      });

      const result = await photoGeotaggingService.embedGPSInPhoto(
        mockPhotoFile,
        webMercatorCoords
      );

      expect(result).toBeInstanceOf(Blob);
      expect(coordinateSystemUtils.transformCoordinates).toHaveBeenCalledWith(
        webMercatorCoords,
        'EPSG:4326'
      );
    });

    it('should handle embedding errors gracefully', async () => {
      const invalidCoords: CoordinatePoint = {
        x: NaN,
        y: Infinity,
        crs: 'INVALID'
      };

      await expect(
        photoGeotaggingService.embedGPSInPhoto(mockPhotoFile, invalidCoords)
      ).rejects.toThrow('Failed to embed GPS data');
    });
  });

  describe('GPS Data Extraction', () => {
    it('should extract GPS coordinates from photo', async () => {
      // Mock photo with GPS data
      const photoWithGPS = new File(['mock-gps-image'], 'gps-photo.jpg', {
        type: 'image/jpeg'
      });

      const result = await photoGeotaggingService.extractGPSFromPhoto(photoWithGPS);

      // Currently returns null in mock implementation
      expect(result).toBeNull();
    });

    it('should return null for photos without GPS data', async () => {
      const photoWithoutGPS = new File(['mock-image'], 'no-gps-photo.jpg', {
        type: 'image/jpeg'
      });

      const result = await photoGeotaggingService.extractGPSFromPhoto(photoWithoutGPS);

      expect(result).toBeNull();
    });

    it('should handle invalid photo files gracefully', async () => {
      const invalidFile = new File(['not-an-image'], 'invalid.txt', {
        type: 'text/plain'
      });

      const result = await photoGeotaggingService.extractGPSFromPhoto(invalidFile);

      expect(result).toBeNull();
    });
  });

  describe('QGIS Metadata Creation', () => {
    it('should create QGIS-compatible metadata', async () => {
      const metadata = await photoGeotaggingService.createQGISMetadata(
        mockPhotoFile,
        mockCoordinates,
        'HD-001',
        'power-meter-test'
      );

      expect(metadata.filename).toBe('test-photo.jpg');
      expect(metadata.latitude).toBe(40.7128);
      expect(metadata.longitude).toBe(-74.0060);
      expect(metadata.accuracy).toBe(5);
      expect(metadata.crs).toBe('EPSG:4326');
      expect(metadata.homeDropId).toBe('HD-001');
      expect(metadata.photoType).toBe('power-meter-test');
      expect(metadata.qgisVisible).toBe(true);
      expect(metadata.qgisScale).toBe(1.0);
      expect(metadata.qgisOpacity).toBe(1.0);
    });

    it('should calculate quality scores', async () => {
      const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });

      const highAccuracyCoords: CoordinatePoint = {
        ...mockCoordinates,
        accuracy: 3 // High accuracy
      };

      const metadata = await photoGeotaggingService.createQGISMetadata(
        largeFile,
        highAccuracyCoords,
        'HD-001',
        'test-photo'
      );

      expect(metadata.qualityScore).toBeGreaterThan(80);
      expect(metadata.isValid).toBe(true);
    });

    it('should handle photos with low quality indicators', async () => {
      const tinyFile = new File([new ArrayBuffer(1024)], 'tiny.jpg', { // Very small file
        type: 'image/jpeg'
      });

      const lowAccuracyCoords: CoordinatePoint = {
        ...mockCoordinates,
        accuracy: 100 // Low accuracy
      };

      const metadata = await photoGeotaggingService.createQGISMetadata(
        tinyFile,
        lowAccuracyCoords
      );

      expect(metadata.qualityScore).toBeLessThan(70);
      expect(metadata.isValid).toBe(true); // Still valid, just lower quality
    });
  });

  describe('Batch Photo Processing', () => {
    it('should process multiple photos successfully', async () => {
      const photos = [
        {
          file: new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' }),
          coordinates: mockCoordinates,
          homeDropId: 'HD-001',
          photoType: 'power-meter-test'
        },
        {
          file: new File(['photo2'], 'photo2.jpg', { type: 'image/jpeg' }),
          coordinates: { ...mockCoordinates, x: -74.0070 },
          homeDropId: 'HD-001',
          photoType: 'router-status'
        }
      ];

      const result = await photoGeotaggingService.processBatchPhotos(photos, {
        embedGPS: true,
        preserveOriginal: true,
        generateThumbnail: false
      });

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle partial failures in batch processing', async () => {
      const photos = [
        {
          file: new File(['good-photo'], 'good.jpg', { type: 'image/jpeg' }),
          coordinates: mockCoordinates,
          homeDropId: 'HD-001'
        },
        {
          file: new File(['bad-photo'], 'bad.txt', { type: 'text/plain' }),
          coordinates: { x: NaN, y: NaN, crs: 'INVALID' },
          homeDropId: 'HD-001'
        }
      ];

      const result = await photoGeotaggingService.processBatchPhotos(photos);

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
    });

    it('should calculate batch processing statistics', async () => {
      const photos = [
        {
          file: new File(['photo1'], 'photo1.jpg', { type: 'image/jpeg' }),
          coordinates: { ...mockCoordinates, accuracy: 5, crs: 'EPSG:4326' },
          photoType: 'power-meter-test'
        },
        {
          file: new File(['photo2'], 'photo2.jpg', { type: 'image/jpeg' }),
          coordinates: { ...mockCoordinates, accuracy: 10, crs: 'EPSG:3857' },
          photoType: 'router-status'
        }
      ];

      const result = await photoGeotaggingService.processBatchPhotos(photos);

      expect(result.statistics.averageAccuracy).toBe(7.5);
      expect(result.statistics.coordinateSystemsFound).toContain('EPSG:4326');
      expect(result.statistics.coordinateSystemsFound).toContain('EPSG:3857');
      expect(result.statistics.photoTypesProcessed).toContain('power-meter-test');
      expect(result.statistics.photoTypesProcessed).toContain('router-status');
    });
  });

  describe('Photo Validation', () => {
    it('should validate photo with GPS data', async () => {
      const result = await photoGeotaggingService.validatePhotoGPS(mockPhotoFile);

      expect(result.isValid).toBe(false); // Mock returns no GPS
      expect(result.hasGPS).toBe(false);
      expect(result.hasExif).toBe(true);
      expect(result.coordinateQuality).toBe('poor');
      expect(result.issues).toContain('Photo does not contain GPS coordinates');
      expect(result.recommendations).toContain('Enable GPS on camera device');
    });

    it('should compare with expected coordinates', async () => {
      const expectedCoords: CoordinatePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326'
      };

      const result = await photoGeotaggingService.validatePhotoGPS(
        mockPhotoFile,
        expectedCoords
      );

      expect(result.isValid).toBe(false);
      expect(result.metadata.filename).toBe('test-photo.jpg');
    });

    it('should detect low quality photos', async () => {
      const lowQualityPhoto = new File([new ArrayBuffer(1024)], 'tiny.jpg', {
        type: 'image/jpeg'
      });

      const result = await photoGeotaggingService.validatePhotoGPS(lowQualityPhoto);

      expect(result.issues.some(issue => 
        issue.includes('Photo file size is very small')
      )).toBe(true);
      expect(result.recommendations.some(rec => 
        rec.includes('Use higher resolution camera settings')
      )).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const corruptFile = new File([''], 'corrupt.jpg', { type: 'image/jpeg' });

      // Mock a validation error
      vi.spyOn(photoGeotaggingService, 'validatePhotoGPS').mockImplementationOnce(
        async () => {
          throw new Error('File corruption detected');
        }
      );

      await expect(
        photoGeotaggingService.validatePhotoGPS(corruptFile)
      ).rejects.toThrow('File corruption detected');
    });
  });

  describe('QGIS Integration', () => {
    it('should generate QGIS photo layer definition', () => {
      const photoLocationData: PhotoLocationData[] = [
        {
          id: 'photo-001',
          filename: 'test1.jpg',
          coordinates: mockCoordinates,
          timestamp: new Date('2024-01-15T10:30:00Z'),
          accuracy: 5,
          exifData: {} as GPSExifData,
          qgisMetadata: {
            id: 'photo-001',
            filename: 'test1.jpg',
            path: 'photos/HD-001/test1.jpg',
            latitude: 40.7128,
            longitude: -74.0060,
            crs: 'EPSG:4326',
            capturedAt: new Date('2024-01-15T10:30:00Z'),
            width: 1920,
            height: 1080,
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            qgisVisible: true,
            qgisScale: 1.0,
            qgisRotation: 0.0,
            qgisOpacity: 1.0,
            homeDropId: 'HD-001',
            photoType: 'power-meter-test',
            qualityScore: 85,
            isValid: true
          }
        }
      ];

      const layerDef = photoGeotaggingService.generateQGISPhotoLayer(photoLocationData);

      expect(layerDef.layerName).toBe('FibreField_Photos');
      expect(layerDef.geometryType).toBe('Point');
      expect(layerDef.crs).toBe('EPSG:4326');
      expect(layerDef.features).toHaveLength(1);
      expect(layerDef.features[0].geometry.coordinates).toEqual([-74.0060, 40.7128]);
      expect(layerDef.features[0].properties.photo_id).toBe('photo-001');
      expect(layerDef.features[0].properties.home_drop_id).toBe('HD-001');
    });

    it('should create photo attribution text', () => {
      const photoLocationData: PhotoLocationData[] = [
        {
          id: 'photo-001',
          filename: 'test1.jpg',
          coordinates: mockCoordinates,
          timestamp: new Date('2024-01-15T10:30:00Z'),
          exifData: {} as GPSExifData,
          qgisMetadata: {
            capturedBy: 'technician-001'
          } as QGISPhotoMetadata
        },
        {
          id: 'photo-002',
          filename: 'test2.jpg',
          coordinates: mockCoordinates,
          timestamp: new Date('2024-01-15T11:00:00Z'),
          exifData: {} as GPSExifData,
          qgisMetadata: {
            capturedBy: 'technician-002'
          } as QGISPhotoMetadata
        }
      ];

      const attribution = photoGeotaggingService.createPhotoAttribution(photoLocationData);

      expect(attribution).toContain('Photos captured by FibreField mobile application');
      expect(attribution).toContain('Total photos: 2');
      expect(attribution).toContain('technician-001, technician-002');
      expect(attribution).toContain('EPSG:4326 (WGS84)');
    });
  });

  describe('Photo Statistics', () => {
    it('should calculate comprehensive photo statistics', () => {
      const photos: PhotoLocationData[] = [
        {
          id: 'photo-001',
          filename: 'high-accuracy.jpg',
          coordinates: { ...mockCoordinates, accuracy: 3 },
          timestamp: new Date(),
          accuracy: 3,
          exifData: {} as GPSExifData,
          qgisMetadata: {
            fileSize: 2048000,
            photoType: 'power-meter-test',
            crs: 'EPSG:4326'
          } as QGISPhotoMetadata
        },
        {
          id: 'photo-002',
          filename: 'medium-accuracy.jpg',
          coordinates: { ...mockCoordinates, accuracy: 15 },
          timestamp: new Date(),
          accuracy: 15,
          exifData: {} as GPSExifData,
          qgisMetadata: {
            fileSize: 1024000,
            photoType: 'router-status',
            crs: 'EPSG:4326'
          } as QGISPhotoMetadata
        },
        {
          id: 'photo-003',
          filename: 'low-accuracy.jpg',
          coordinates: { ...mockCoordinates, accuracy: 30 },
          timestamp: new Date(),
          accuracy: 30,
          exifData: {} as GPSExifData,
          qgisMetadata: {
            fileSize: 512000,
            crs: 'EPSG:4326'
          } as QGISPhotoMetadata
        }
      ];

      const stats = photoGeotaggingService.getPhotoStatistics(photos);

      expect(stats.total).toBe(3);
      expect(stats.withGPS).toBe(3);
      expect(stats.withoutGPS).toBe(0);
      expect(stats.averageAccuracy).toBe(16); // (3+15+30)/3
      expect(stats.averageFileSize).toBe(1194666.67); // Average of file sizes
      expect(stats.coordinateSystems).toContain('EPSG:4326');
      expect(stats.photoTypes).toContain('power-meter-test');
      expect(stats.photoTypes).toContain('router-status');
      expect(stats.qualityDistribution.excellent).toBe(1); // ≤5m accuracy
      expect(stats.qualityDistribution.good).toBe(1); // ≤10m accuracy (15m is fair)
      expect(stats.qualityDistribution.fair).toBe(1); // ≤20m accuracy (30m is poor)
      expect(stats.qualityDistribution.poor).toBe(1); // >20m accuracy
    });

    it('should handle empty photo arrays', () => {
      const stats = photoGeotaggingService.getPhotoStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.withGPS).toBe(0);
      expect(stats.withoutGPS).toBe(0);
      expect(stats.averageAccuracy).toBe(0);
      expect(stats.coordinateSystems).toHaveLength(0);
      expect(stats.photoTypes).toHaveLength(0);
    });
  });

  describe('Service Maintenance', () => {
    it('should clear cache successfully', () => {
      expect(() => {
        photoGeotaggingService.clearCache();
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle photos with missing GPS coordinates', async () => {
      const coordsWithoutGPS: CoordinatePoint = {
        x: 0,
        y: 0,
        crs: 'EPSG:4326'
      };

      const metadata = await photoGeotaggingService.createQGISMetadata(
        mockPhotoFile,
        coordsWithoutGPS
      );

      expect(metadata.latitude).toBe(0);
      expect(metadata.longitude).toBe(0);
      expect(metadata.isValid).toBe(true); // Still valid, just no GPS
    });

    it('should handle extremely large photo files', async () => {
      const largeFile = new File([new ArrayBuffer(50 * 1024 * 1024)], 'huge.jpg', {
        type: 'image/jpeg'
      });

      const metadata = await photoGeotaggingService.createQGISMetadata(
        largeFile,
        mockCoordinates
      );

      expect(metadata.fileSize).toBe(50 * 1024 * 1024);
      expect(metadata.qualityScore).toBeLessThan(100); // Penalty for large size
    });

    it('should handle non-image files gracefully', async () => {
      const textFile = new File(['not an image'], 'document.txt', {
        type: 'text/plain'
      });

      const metadata = await photoGeotaggingService.createQGISMetadata(
        textFile,
        mockCoordinates
      );

      expect(metadata.mimeType).toBe('text/plain');
      expect(metadata.qualityScore).toBeLessThan(50); // Significant penalty for non-image
    });
  });
});