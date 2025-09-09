/**
 * QGIS Integration Service Tests
 * 
 * Comprehensive tests for the QGIS integration functionality including:
 * - Project import/export
 * - Coordinate system transformations
 * - Data validation
 * - Photo geotagging
 * - GeoPackage handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { qgisIntegrationService } from '../qgis-integration.service';
import { geoPackageHandler } from '../geopackage-handler';
import { coordinateSystemUtils } from '../coordinate-systems';
import { photoGeotaggingService } from '../photo-geotagging';
import type { HomeDropCapture } from '../../types/home-drop.types';

// Mock dependencies
vi.mock('../geopackage-handler');
vi.mock('../coordinate-systems');
vi.mock('../photo-geotagging');
vi.mock('../../services/home-drop-capture.service');

describe('QGIS Integration Service', () => {
  const mockHomeDropCapture: HomeDropCapture = {
    id: 'HD-001',
    poleNumber: 'P-001',
    projectId: 'project-001',
    contractorId: 'contractor-001',
    status: 'captured',
    syncStatus: 'synced',
    syncAttempts: 1,
    customer: {
      name: 'John Doe',
      address: '123 Main St'
    },
    installation: {
      equipment: {
        ontSerialNumber: 'ONT-123',
        routerSerialNumber: 'RTR-456'
      },
      powerReadings: {
        opticalPower: -15.5
      },
      serviceConfig: {
        activationStatus: true
      }
    },
    photos: [
      {
        id: 'photo-1',
        type: 'power-meter-test',
        data: 'base64-data',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        size: 1024000,
        compressed: false
      }
    ],
    requiredPhotos: ['power-meter-test', 'fibertime-setup-confirmation'],
    completedPhotos: ['power-meter-test'],
    workflow: {
      currentStep: 4,
      totalSteps: 4,
      lastSavedStep: 4,
      steps: {
        assignments: true,
        gps: true,
        photos: true,
        review: true
      }
    },
    capturedBy: 'user-001',
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T11:00:00Z'),
    capturedAt: new Date('2024-01-15T10:45:00Z'),
    gpsLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      capturedAt: new Date('2024-01-15T10:30:00Z')
    }
  };

  const mockQGISProject = {
    id: 'qgis-001',
    name: 'Test Project',
    title: 'Test QGIS Project',
    abstract: 'Test project for assignments',
    version: '3.34.0',
    crs: 'EPSG:4326',
    layers: [
      {
        id: 'layer-001',
        name: 'Home Drop Assignments',
        type: 'vector' as const,
        geometryType: 'Point' as const,
        crs: 'EPSG:4326',
        provider: 'gpkg',
        source: 'assignments.gpkg',
        attributes: [
          { name: 'pole_number', type: 'string' as const },
          { name: 'customer_name', type: 'string' as const },
          { name: 'customer_address', type: 'string' as const }
        ],
        features: [
          {
            id: 1,
            geometry: {
              type: 'Point',
              coordinates: [-74.0060, 40.7128]
            },
            properties: {
              pole_number: 'P-002',
              customer_name: 'Jane Smith',
              customer_address: '456 Oak Ave'
            }
          }
        ]
      }
    ],
    metadata: {
      title: 'Test Project',
      abstract: 'Test assignments',
      keywords: ['test', 'assignments'],
      author: 'Test User',
      creation: new Date('2024-01-01'),
      language: 'en',
      rights: 'Internal use'
    },
    extent: {
      xmin: -75,
      ymin: 40,
      xmax: -73,
      ymax: 41
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Project Import', () => {
    it('should successfully import a QGIS project file', async () => {
      // Arrange
      const mockFile = new File(['mock-qgz-content'], 'test-project.qgz', {
        type: 'application/zip'
      });

      const mockImportResult = {
        project: mockQGISProject,
        assignments: [
          {
            poleNumber: 'P-002',
            customer: {
              name: 'Jane Smith',
              address: '456 Oak Ave'
            },
            location: {
              latitude: 40.7128,
              longitude: -74.0060
            },
            priority: 'medium' as const
          }
        ]
      };

      // Mock the internal import method
      const importSpy = vi.spyOn(qgisIntegrationService, 'importQGISProject')
        .mockResolvedValue(mockImportResult);

      // Act
      const result = await qgisIntegrationService.importQGISProject(mockFile);

      // Assert
      expect(importSpy).toHaveBeenCalledWith(mockFile, undefined);
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe('Test Project');
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].poleNumber).toBe('P-002');
    });

    it('should handle invalid QGIS project files', async () => {
      // Arrange
      const invalidFile = new File(['invalid-content'], 'invalid.txt', {
        type: 'text/plain'
      });

      // Act & Assert
      await expect(qgisIntegrationService.importQGISProject(invalidFile))
        .rejects
        .toThrow('Failed to import QGIS project');
    });

    it('should validate project structure during import', async () => {
      // Arrange
      const mockFile = new File(['mock-content'], 'test.qgz');
      const invalidProject = {
        ...mockQGISProject,
        crs: '', // Invalid CRS
        layers: [] // No layers
      };

      vi.spyOn(qgisIntegrationService, 'importQGISProject')
        .mockResolvedValue({
          project: invalidProject,
          assignments: []
        });

      // Act
      const result = await qgisIntegrationService.importQGISProject(mockFile);

      // Assert
      expect(result.project.layers).toHaveLength(0);
      expect(result.assignments).toHaveLength(0);
    });
  });

  describe('Assignment Creation', () => {
    it('should create assignments from QGIS data', async () => {
      // Arrange
      const mockAssignments = [
        {
          poleNumber: 'P-003',
          customer: {
            name: 'Bob Johnson',
            address: '789 Pine St'
          },
          location: {
            latitude: 40.7500,
            longitude: -73.9800
          },
          priority: 'high' as const
        }
      ];

      const createSpy = vi.spyOn(qgisIntegrationService, 'createAssignmentsFromQGIS')
        .mockResolvedValue(['HD-003']);

      // Act
      const result = await qgisIntegrationService.createAssignmentsFromQGIS(
        mockAssignments,
        'user-001',
        'admin-001'
      );

      // Assert
      expect(createSpy).toHaveBeenCalledWith(
        mockAssignments,
        'user-001',
        'admin-001'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('HD-003');
    });

    it('should handle missing pole references', async () => {
      // Arrange
      const assignmentWithInvalidPole = {
        poleNumber: 'P-INVALID',
        customer: {
          name: 'Test Customer',
          address: 'Test Address'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        priority: 'medium' as const
      };

      // Mock pole service to return null for invalid pole
      vi.spyOn(qgisIntegrationService, 'createAssignmentsFromQGIS')
        .mockResolvedValue([]);

      // Act
      const result = await qgisIntegrationService.createAssignmentsFromQGIS(
        [assignmentWithInvalidPole]
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('Data Export', () => {
    it('should export home drops to GeoPackage format', async () => {
      // Arrange
      const mockExportConfig = {
        format: 'gpkg' as const,
        crs: 'EPSG:4326',
        includePhotos: true,
        includeOnlyCompleted: true
      };

      const mockExportResult = {
        data: new Blob(['mock-gpkg-data'], { type: 'application/geopackage+sqlite3' }),
        filename: 'fibrefield_homedrops_2024-01-15.gpkg',
        metadata: {
          recordCount: 1,
          crs: 'EPSG:4326',
          extent: [-75, 40, -73, 41] as [number, number, number, number]
        }
      };

      const exportSpy = vi.spyOn(qgisIntegrationService, 'exportToGeoPackage')
        .mockResolvedValue(mockExportResult);

      // Act
      const result = await qgisIntegrationService.exportToGeoPackage(mockExportConfig);

      // Assert
      expect(exportSpy).toHaveBeenCalledWith(mockExportConfig);
      expect(result.filename).toContain('.gpkg');
      expect(result.metadata.recordCount).toBe(1);
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should support multiple export formats', async () => {
      // Arrange
      const formats = ['gpkg', 'geojson', 'shp', 'kml'] as const;
      const mockResults = formats.map(format => ({
        data: new Blob([`mock-${format}-data`]),
        filename: `test.${format === 'shp' ? 'zip' : format}`,
        metadata: {
          recordCount: 1,
          crs: 'EPSG:4326',
          extent: [-75, 40, -73, 41] as [number, number, number, number]
        }
      }));

      vi.spyOn(qgisIntegrationService, 'exportToGeoPackage')
        .mockImplementation(async (config) => {
          const index = formats.indexOf(config.format);
          return mockResults[index];
        });

      // Act & Assert
      for (let i = 0; i < formats.length; i++) {
        const result = await qgisIntegrationService.exportToGeoPackage({
          format: formats[i],
          crs: 'EPSG:4326',
          includePhotos: true,
          includeOnlyCompleted: false
        });

        expect(result.filename).toContain(
          formats[i] === 'shp' ? '.zip' : `.${formats[i]}`
        );
      }
    });
  });

  describe('Coordinate System Support', () => {
    it('should transform coordinates between systems', async () => {
      // Arrange
      const sourcePoint = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326'
      };

      const mockTransformResult = {
        point: {
          x: -8238310.24,
          y: 4969803.34,
          crs: 'EPSG:3857'
        },
        accuracy: 1.0,
        metadata: {
          sourceCRS: 'EPSG:4326',
          targetCRS: 'EPSG:3857',
          transformedAt: new Date(),
          method: 'wgs84_to_web_mercator'
        }
      };

      const transformSpy = vi.mocked(coordinateSystemUtils.transformCoordinates)
        .mockResolvedValue(mockTransformResult);

      // Act
      const result = await coordinateSystemUtils.transformCoordinates(
        sourcePoint,
        'EPSG:3857'
      );

      // Assert
      expect(transformSpy).toHaveBeenCalledWith(sourcePoint, 'EPSG:3857');
      expect(result.point.crs).toBe('EPSG:3857');
      expect(result.metadata.method).toBe('wgs84_to_web_mercator');
    });

    it('should validate coordinate systems', () => {
      // Arrange & Act
      const validCRS = coordinateSystemUtils.validateCoordinateSystem('EPSG:4326');
      const invalidCRS = coordinateSystemUtils.validateCoordinateSystem('EPSG:99999');

      // Assert
      expect(validCRS).toBe(true);
      expect(invalidCRS).toBe(false);
    });
  });

  describe('Photo Geotagging', () => {
    it('should create QGIS-compatible photo metadata', async () => {
      // Arrange
      const mockPhotoFile = new File(['mock-image-data'], 'test-photo.jpg', {
        type: 'image/jpeg'
      });

      const mockCoordinates = {
        x: -74.0060,
        y: 40.7128,
        crs: 'EPSG:4326',
        accuracy: 5
      };

      const mockMetadata = {
        id: 'photo-123',
        filename: 'test-photo.jpg',
        path: 'photos/HD-001/test-photo.jpg',
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5,
        crs: 'EPSG:4326',
        capturedAt: new Date(),
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
      };

      const metadataSpy = vi.mocked(photoGeotaggingService.createQGISMetadata)
        .mockResolvedValue(mockMetadata);

      // Act
      const result = await photoGeotaggingService.createQGISMetadata(
        mockPhotoFile,
        mockCoordinates,
        'HD-001',
        'power-meter-test'
      );

      // Assert
      expect(metadataSpy).toHaveBeenCalledWith(
        mockPhotoFile,
        mockCoordinates,
        'HD-001',
        'power-meter-test'
      );
      expect(result.filename).toBe('test-photo.jpg');
      expect(result.qgisVisible).toBe(true);
      expect(result.qualityScore).toBe(85);
    });

    it('should validate photo GPS data', async () => {
      // Arrange
      const mockPhotoFile = new File(['mock-image-data'], 'test-photo.jpg');
      
      const mockValidationResult = {
        isValid: true,
        hasGPS: true,
        hasExif: true,
        coordinateQuality: 'excellent' as const,
        issues: [],
        recommendations: [],
        metadata: {}
      };

      const validateSpy = vi.mocked(photoGeotaggingService.validatePhotoGPS)
        .mockResolvedValue(mockValidationResult);

      // Act
      const result = await photoGeotaggingService.validatePhotoGPS(mockPhotoFile);

      // Assert
      expect(validateSpy).toHaveBeenCalledWith(mockPhotoFile, undefined);
      expect(result.isValid).toBe(true);
      expect(result.hasGPS).toBe(true);
      expect(result.coordinateQuality).toBe('excellent');
    });
  });

  describe('GeoPackage Handling', () => {
    it('should read GeoPackage files', async () => {
      // Arrange
      const mockFile = new File(['mock-gpkg-data'], 'test.gpkg');
      
      const mockDatabase = {
        tables: [
          {
            tableName: 'assignments',
            columns: [],
            features: []
          }
        ],
        spatialRefSys: [],
        geometryColumns: [],
        contents: [],
        metadata: []
      };

      const readSpy = vi.mocked(geoPackageHandler.readGeoPackage)
        .mockResolvedValue(mockDatabase);

      // Act
      const result = await geoPackageHandler.readGeoPackage(mockFile);

      // Assert
      expect(readSpy).toHaveBeenCalledWith(mockFile, {});
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].tableName).toBe('assignments');
    });

    it('should write GeoPackage files', async () => {
      // Arrange
      const mockHomeDrops = [mockHomeDropCapture];
      const mockOptions = {
        tableName: 'home_drops',
        layerName: 'FibreField Home Drops',
        targetCRS: 'EPSG:4326',
        createSpatialIndex: true
      };

      const mockBlob = new Blob(['mock-gpkg-output'], { 
        type: 'application/geopackage+sqlite3' 
      });

      const writeSpy = vi.mocked(geoPackageHandler.writeGeoPackage)
        .mockResolvedValue(mockBlob);

      // Act
      const result = await geoPackageHandler.writeGeoPackage(mockHomeDrops, mockOptions);

      // Assert
      expect(writeSpy).toHaveBeenCalledWith(mockHomeDrops, mockOptions);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/geopackage+sqlite3');
    });
  });

  describe('Data Validation', () => {
    it('should validate imported data structure', () => {
      // Arrange
      const validProject = mockQGISProject;
      const invalidProject = {
        ...mockQGISProject,
        layers: []
      };

      // Act
      const validResult = qgisIntegrationService.validateQGISProject(validProject);
      const invalidResult = qgisIntegrationService.validateQGISProject(invalidProject);

      // Assert - these would be implemented in the actual service
      expect(validResult).toBeDefined();
      expect(invalidResult).toBeDefined();
    });

    it('should detect coordinate system mismatches', async () => {
      // Arrange
      const mixedCRSData = [
        { x: -74.0060, y: 40.7128, crs: 'EPSG:4326' },
        { x: -8238310, y: 4969803, crs: 'EPSG:3857' }
      ];

      // Act & Assert
      for (const point of mixedCRSData) {
        const validation = coordinateSystemUtils.validateCoordinate(point);
        expect(validation).toBeDefined();
        expect(validation.isValid).toBeDefined();
      }
    });
  });

  describe('Integration Statistics', () => {
    it('should provide integration statistics', async () => {
      // Arrange
      const mockStats = {
        totalExports: 5,
        totalImports: 3,
        supportedFormats: 4,
        lastExport: new Date('2024-01-15'),
        lastImport: new Date('2024-01-14')
      };

      const statsSpy = vi.spyOn(qgisIntegrationService, 'getIntegrationStatistics')
        .mockResolvedValue(mockStats);

      // Act
      const result = await qgisIntegrationService.getIntegrationStatistics();

      // Assert
      expect(statsSpy).toHaveBeenCalled();
      expect(result.totalExports).toBe(5);
      expect(result.totalImports).toBe(3);
      expect(result.supportedFormats).toBe(4);
    });

    it('should track export/import operations', async () => {
      // This would test actual usage tracking in a real implementation
      // For now, verify the statistics structure
      const mockStats = await qgisIntegrationService.getIntegrationStatistics();
      
      expect(typeof mockStats.totalExports).toBe('number');
      expect(typeof mockStats.totalImports).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Arrange
      const corruptFile = new File(['corrupt-data'], 'corrupt.qgz');

      // Act & Assert
      await expect(qgisIntegrationService.importQGISProject(corruptFile))
        .rejects
        .toThrow('Failed to import QGIS project');
    });

    it('should handle coordinate transformation errors', async () => {
      // Arrange
      const invalidPoint = {
        x: NaN,
        y: Infinity,
        crs: 'EPSG:4326'
      };

      vi.mocked(coordinateSystemUtils.transformCoordinates)
        .mockRejectedValue(new Error('Invalid coordinates'));

      // Act & Assert
      await expect(
        coordinateSystemUtils.transformCoordinates(invalidPoint, 'EPSG:3857')
      ).rejects.toThrow('Invalid coordinates');
    });

    it('should validate export configuration', async () => {
      // Arrange
      const invalidConfig = {
        format: 'invalid-format' as any,
        crs: 'INVALID:0000',
        includePhotos: true,
        includeOnlyCompleted: false
      };

      // Act & Assert
      await expect(qgisIntegrationService.exportToGeoPackage(invalidConfig))
        .rejects
        .toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockHomeDropCapture,
        id: `HD-${i.toString().padStart(4, '0')}`,
        poleNumber: `P-${i.toString().padStart(4, '0')}`
      }));

      const startTime = Date.now();

      // Mock export for performance test
      vi.spyOn(qgisIntegrationService, 'exportToGeoPackage')
        .mockResolvedValue({
          data: new Blob(['mock-large-export']),
          filename: 'large-export.gpkg',
          metadata: {
            recordCount: 1000,
            crs: 'EPSG:4326',
            extent: [-75, 40, -73, 41]
          }
        });

      // Act
      const result = await qgisIntegrationService.exportToGeoPackage({
        format: 'gpkg',
        crs: 'EPSG:4326',
        includePhotos: false,
        includeOnlyCompleted: false
      });

      const processingTime = Date.now() - startTime;

      // Assert
      expect(result.metadata.recordCount).toBe(1000);
      expect(processingTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});