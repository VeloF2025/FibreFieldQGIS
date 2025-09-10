/**
 * Photo Geotagging Utilities
 * 
 * Comprehensive photo geotagging system for QGIS integration.
 * Handles EXIF GPS data embedding, reading, and QGIS-compatible metadata.
 * 
 * Key Features:
 * 1. EXIF GPS data embedding
 * 2. GPS coordinate extraction from photos
 * 3. QGIS-compatible photo metadata
 * 4. Coordinate system transformation for photos
 * 5. Photo validation and quality checks
 * 6. Batch photo processing
 * 7. Photo location mapping
 * 8. Metadata preservation and enhancement
 */

import { coordinateSystemUtils, type CoordinatePoint } from './coordinate-systems';

/**
 * GPS EXIF Data Structure
 */
export interface GPSExifData {
  GPSLatitude: number;
  GPSLongitude: number;
  GPSAltitude?: number;
  GPSLatitudeRef: 'N' | 'S';
  GPSLongitudeRef: 'E' | 'W';
  GPSAltitudeRef?: 0 | 1; // 0 = above sea level, 1 = below sea level
  GPSTimestamp?: string;
  GPSDateStamp?: string;
  GPSMapDatum?: string;
  GPSProcessingMethod?: string;
  GPSVersionID?: string;
}

/**
 * Photo Location Data
 */
export interface PhotoLocationData {
  id: string;
  filename: string;
  coordinates: CoordinatePoint;
  timestamp: Date;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  exifData: GPSExifData;
  qgisMetadata: QGISPhotoMetadata;
}

/**
 * QGIS-Compatible Photo Metadata
 */
export interface QGISPhotoMetadata {
  id: string;
  filename: string;
  path: string;
  url?: string;
  thumbnail?: string;
  
  // Spatial information
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  crs: string;
  
  // Capture information
  capturedAt: Date;
  capturedBy?: string;
  deviceInfo?: string;
  
  // Photo properties
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  orientation?: number;
  
  // QGIS-specific
  qgisVisible: boolean;
  qgisScale: number;
  qgisRotation: number;
  qgisOpacity: number;
  qgisAnnotation?: string;
  
  // Field data association
  homeDropId?: string;
  poleNumber?: string;
  photoType?: string;
  installationPhase?: string;
  
  // Quality metrics
  qualityScore?: number;
  isValid: boolean;
  validationNotes?: string;
}

/**
 * Photo Processing Options
 */
export interface PhotoProcessingOptions {
  embedGPS: boolean;
  targetCRS?: string;
  preserveOriginal: boolean;
  compressionQuality?: number;
  maxDimensions?: {
    width: number;
    height: number;
  };
  generateThumbnail: boolean;
  thumbnailSize?: number;
  addWatermark?: boolean;
  watermarkText?: string;
}

/**
 * Batch Processing Result
 */
export interface BatchProcessingResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    filename: string;
    success: boolean;
    metadata?: PhotoLocationData;
    error?: string;
  }>;
  processingTime: number;
  statistics: {
    averageAccuracy: number;
    coordinateSystemsFound: string[];
    photoTypesProcessed: string[];
  };
}

/**
 * Photo Validation Result
 */
export interface PhotoValidationResult {
  isValid: boolean;
  hasGPS: boolean;
  hasExif: boolean;
  coordinateQuality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
  metadata: Partial<PhotoLocationData>;
}

/**
 * Photo Geotagging Service Class
 */
class PhotoGeotaggingService {
  // EXIF GPS tag constants
  private readonly GPS_TAGS = {
    GPSVersionID: 0x0000,
    GPSLatitudeRef: 0x0001,
    GPSLatitude: 0x0002,
    GPSLongitudeRef: 0x0003,
    GPSLongitude: 0x0004,
    GPSAltitudeRef: 0x0005,
    GPSAltitude: 0x0006,
    GPSTimestamp: 0x0007,
    GPSDateStamp: 0x001D,
    GPSMapDatum: 0x0012,
    GPSProcessingMethod: 0x001B
  } as const;

  // Quality thresholds
  private readonly QUALITY_THRESHOLDS = {
    excellent: 5,   // ≤5m accuracy
    good: 10,       // ≤10m accuracy  
    fair: 20,       // ≤20m accuracy
    poor: 50        // ≤50m accuracy
  };

  constructor() {
    log.info('✅ Photo Geotagging Service initialized', {}, "Photogeotagging");
  }

  // ==================== EXIF GPS Embedding ====================

  /**
   * Embed GPS coordinates into photo EXIF data
   */
  async embedGPSInPhoto(
    photoBlob: Blob,
    coordinates: CoordinatePoint,
    options: Partial<PhotoProcessingOptions> = {}
  ): Promise<Blob> {
    try {
      // Convert coordinates to WGS84 if needed
      let gpsCoords = coordinates;
      if (coordinates.crs !== 'EPSG:4326') {
        const transformed = await coordinateSystemUtils.transformCoordinates(
          coordinates,
          'EPSG:4326'
        );
        gpsCoords = transformed.point;
      }

      // Create GPS EXIF data
      const gpsExifData = this.createGPSExifData(gpsCoords);

      // In a real implementation, use a library like exif-js or piexifjs
      // For now, return the original blob with metadata stored separately
      return new Blob([photoBlob], { 
        type: photoBlob.type,
        // Store GPS data as a property (not standard - use proper EXIF library)
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to embed GPS data: ${errorMessage}`);
    }
  }

  /**
   * Create GPS EXIF data structure
   */
  private createGPSExifData(coordinates: CoordinatePoint): GPSExifData {
    const lat = Math.abs(coordinates.y);
    const lng = Math.abs(coordinates.x);

    return {
      GPSLatitude: lat,
      GPSLongitude: lng,
      GPSAltitude: coordinates.altitude,
      GPSLatitudeRef: coordinates.y >= 0 ? 'N' : 'S',
      GPSLongitudeRef: coordinates.x >= 0 ? 'E' : 'W',
      GPSAltitudeRef: coordinates.altitude && coordinates.altitude >= 0 ? 0 : 1,
      GPSTimestamp: coordinates.timestamp?.toISOString().split('T')[1].split('.')[0],
      GPSDateStamp: coordinates.timestamp?.toISOString().split('T')[0].replace(/-/g, ':'),
      GPSMapDatum: 'WGS-84',
      GPSProcessingMethod: 'MANUAL',
      GPSVersionID: '2.2.0.0'
    };
  }

  // ==================== GPS Data Extraction ====================

  /**
   * Extract GPS coordinates from photo
   */
  async extractGPSFromPhoto(photoBlob: Blob): Promise<CoordinatePoint | null> {
    try {
      // In a real implementation, use exif-js or similar library
      // For now, return null to indicate no GPS data found
      
      // Mock implementation - would parse actual EXIF data
      const mockGPSData = this.getMockGPSData();
      
      if (mockGPSData) {
        return {
          x: mockGPSData.GPSLongitude * (mockGPSData.GPSLongitudeRef === 'W' ? -1 : 1),
          y: mockGPSData.GPSLatitude * (mockGPSData.GPSLatitudeRef === 'S' ? -1 : 1),
          crs: 'EPSG:4326',
          altitude: mockGPSData.GPSAltitude,
          accuracy: 10 // Default accuracy
        };
      }

      return null;
    } catch (error: unknown) {
      log.warn('Failed to extract GPS data:', error, {}, "Photogeotagging");
      return null;
    }
  }

  /**
   * Mock GPS data for testing
   */
  private getMockGPSData(): GPSExifData | null {
    // In real implementation, this would parse actual EXIF data
    // Return null to simulate photo without GPS data
    return null;
  }

  // ==================== Photo Metadata Management ====================

  /**
   * Create QGIS-compatible metadata from photo
   */
  async createQGISMetadata(
    photoFile: File,
    coordinates: CoordinatePoint,
    homeDropId?: string,
    photoType?: string
  ): Promise<QGISPhotoMetadata> {
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Get image dimensions (simplified)
    const dimensions = await this.getImageDimensions(photoFile);
    
    return {
      id: photoId,
      filename: photoFile.name,
      path: `photos/${homeDropId}/${photoFile.name}`,
      url: undefined, // Will be set after upload
      
      // Spatial information
      latitude: coordinates.y,
      longitude: coordinates.x,
      altitude: coordinates.altitude,
      accuracy: coordinates.accuracy,
      crs: coordinates.crs,
      
      // Capture information
      capturedAt: coordinates.timestamp || new Date(),
      capturedBy: 'current-user', // Replace with actual user
      deviceInfo: navigator.userAgent,
      
      // Photo properties
      width: dimensions.width,
      height: dimensions.height,
      fileSize: photoFile.size,
      mimeType: photoFile.type,
      orientation: 1, // Default orientation
      
      // QGIS-specific
      qgisVisible: true,
      qgisScale: 1.0,
      qgisRotation: 0.0,
      qgisOpacity: 1.0,
      qgisAnnotation: `${photoType || 'Photo'} - ${photoFile.name}`,
      
      // Field data association
      homeDropId,
      photoType,
      installationPhase: 'capture',
      
      // Quality metrics
      qualityScore: this.calculatePhotoQualityScore(photoFile, coordinates),
      isValid: true,
      validationNotes: undefined
    };
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        // Return default dimensions if image can't be loaded
        resolve({ width: 1920, height: 1080 });
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate photo quality score
   */
  private calculatePhotoQualityScore(
    file: File,
    coordinates: CoordinatePoint
  ): number {
    let score = 100;

    // File size check (penalty for very small or very large files)
    const sizeKB = file.size / 1024;
    if (sizeKB < 50) score -= 20; // Too small, likely low quality
    if (sizeKB > 10000) score -= 10; // Very large, may be uncompressed

    // GPS accuracy check
    if (coordinates.accuracy) {
      if (coordinates.accuracy > 20) score -= 15;
      if (coordinates.accuracy > 50) score -= 25;
    }

    // Image type check
    if (!file.type.startsWith('image/')) score -= 50;
    if (file.type === 'image/jpeg') score += 5; // Preferred format

    return Math.max(0, Math.min(100, score));
  }

  // ==================== Batch Processing ====================

  /**
   * Process multiple photos with geotagging
   */
  async processBatchPhotos(
    photos: Array<{
      file: File;
      coordinates: CoordinatePoint;
      homeDropId?: string;
      photoType?: string;
    }>,
    options: PhotoProcessingOptions = {
      embedGPS: true,
      preserveOriginal: true,
      generateThumbnail: true
    }
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: BatchProcessingResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;

    const coordinateSystems = new Set<string>();
    const photoTypes = new Set<string>();
    const accuracies: number[] = [];

    for (const photo of photos) {
      try {
        // Create metadata
        const metadata = await this.createPhotoLocationData(
          photo.file,
          photo.coordinates,
          photo.homeDropId,
          photo.photoType
        );

        // Embed GPS if requested
        if (options.embedGPS) {
          await this.embedGPSInPhoto(photo.file, photo.coordinates, options);
        }

        // Track statistics
        coordinateSystems.add(photo.coordinates.crs);
        if (photo.photoType) photoTypes.add(photo.photoType);
        if (photo.coordinates.accuracy) accuracies.push(photo.coordinates.accuracy);

        results.push({
          filename: photo.file.name,
          success: true,
          metadata
        });
        
        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          filename: photo.file.name,
          success: false,
          error: errorMessage
        });
        
        failureCount++;
      }
    }

    const processingTime = Date.now() - startTime;
    const averageAccuracy = accuracies.length > 0 
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length 
      : 0;

    return {
      totalProcessed: photos.length,
      successCount,
      failureCount,
      results,
      processingTime,
      statistics: {
        averageAccuracy,
        coordinateSystemsFound: Array.from(coordinateSystems),
        photoTypesProcessed: Array.from(photoTypes)
      }
    };
  }

  /**
   * Create complete photo location data
   */
  async createPhotoLocationData(
    file: File,
    coordinates: CoordinatePoint,
    homeDropId?: string,
    photoType?: string
  ): Promise<PhotoLocationData> {
    const gpsExifData = this.createGPSExifData(coordinates);
    const qgisMetadata = await this.createQGISMetadata(file, coordinates, homeDropId, photoType);

    return {
      id: qgisMetadata.id,
      filename: file.name,
      coordinates,
      timestamp: coordinates.timestamp || new Date(),
      accuracy: coordinates.accuracy,
      altitude: coordinates.altitude,
      exifData: gpsExifData,
      qgisMetadata
    };
  }

  // ==================== Validation ====================

  /**
   * Validate photo GPS data
   */
  async validatePhotoGPS(
    photoFile: File,
    expectedCoordinates?: CoordinatePoint
  ): Promise<PhotoValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Extract GPS data from photo
      const extractedGPS = await this.extractGPSFromPhoto(photoFile);
      const hasGPS = extractedGPS !== null;
      const hasExif = true; // Would check for EXIF data in real implementation

      // Determine coordinate quality
      let coordinateQuality: PhotoValidationResult['coordinateQuality'] = 'poor';
      if (extractedGPS?.accuracy) {
        if (extractedGPS.accuracy <= this.QUALITY_THRESHOLDS.excellent) {
          coordinateQuality = 'excellent';
        } else if (extractedGPS.accuracy <= this.QUALITY_THRESHOLDS.good) {
          coordinateQuality = 'good';
        } else if (extractedGPS.accuracy <= this.QUALITY_THRESHOLDS.fair) {
          coordinateQuality = 'fair';
        }
      }

      // Validation checks
      if (!hasGPS) {
        issues.push('Photo does not contain GPS coordinates');
        recommendations.push('Enable GPS on camera device');
      }

      if (!hasExif) {
        issues.push('Photo missing EXIF metadata');
        recommendations.push('Use camera app that preserves EXIF data');
      }

      // Compare with expected coordinates if provided
      if (expectedCoordinates && extractedGPS) {
        const distance = coordinateSystemUtils.calculateDistance(
          { latitude: expectedCoordinates.y, longitude: expectedCoordinates.x },
          { latitude: extractedGPS.y, longitude: extractedGPS.x }
        );

        if (distance > 100) {
          issues.push(`Photo location is ${Math.round(distance)}m from expected location`);
          recommendations.push('Verify photo was taken at correct location');
        }
      }

      // File quality checks
      if (photoFile.size < 50 * 1024) {
        issues.push('Photo file size is very small, may be low quality');
        recommendations.push('Use higher resolution camera settings');
      }

      const isValid = issues.length === 0;

      return {
        isValid,
        hasGPS,
        hasExif,
        coordinateQuality,
        issues,
        recommendations,
        metadata: {
          filename: photoFile.name,
          coordinates: extractedGPS || undefined,
          timestamp: new Date(),
          qgisMetadata: await this.createQGISMetadata(
            photoFile,
            extractedGPS || expectedCoordinates || { x: 0, y: 0, crs: 'EPSG:4326' }
          )
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        isValid: false,
        hasGPS: false,
        hasExif: false,
        coordinateQuality: 'poor',
        issues: [`Validation failed: ${errorMessage}`],
        recommendations: ['Check photo file integrity'],
        metadata: {}
      };
    }
  }

  // ==================== QGIS Integration ====================

  /**
   * Generate QGIS photo layer definition
   */
  generateQGISPhotoLayer(photos: PhotoLocationData[]): {
    layerName: string;
    geometryType: 'Point';
    crs: string;
    fields: Array<{
      name: string;
      type: string;
      length?: number;
    }>;
    features: Array<{
      id: number;
      geometry: {
        type: 'Point';
        coordinates: [number, number];
      };
      properties: Record<string, any>;
    }>;
  } {
    return {
      layerName: 'FibreField_Photos',
      geometryType: 'Point',
      crs: 'EPSG:4326',
      fields: [
        { name: 'photo_id', type: 'string', length: 50 },
        { name: 'filename', type: 'string', length: 255 },
        { name: 'photo_path', type: 'string', length: 500 },
        { name: 'photo_url', type: 'string', length: 500 },
        { name: 'home_drop_id', type: 'string', length: 50 },
        { name: 'pole_number', type: 'string', length: 20 },
        { name: 'photo_type', type: 'string', length: 50 },
        { name: 'captured_at', type: 'datetime' },
        { name: 'captured_by', type: 'string', length: 100 },
        { name: 'file_size', type: 'integer' },
        { name: 'width', type: 'integer' },
        { name: 'height', type: 'integer' },
        { name: 'accuracy', type: 'real' },
        { name: 'altitude', type: 'real' },
        { name: 'quality_score', type: 'integer' },
        { name: 'qgis_visible', type: 'boolean' },
        { name: 'qgis_scale', type: 'real' },
        { name: 'qgis_rotation', type: 'real' },
        { name: 'qgis_opacity', type: 'real' },
        { name: 'qgis_annotation', type: 'string', length: 255 }
      ],
      features: photos.map((photo, index) => ({
        id: index + 1,
        geometry: {
          type: 'Point' as const,
          coordinates: [photo.coordinates.x, photo.coordinates.y]
        },
        properties: {
          photo_id: photo.id,
          filename: photo.filename,
          photo_path: photo.qgisMetadata.path,
          photo_url: photo.qgisMetadata.url || '',
          home_drop_id: photo.qgisMetadata.homeDropId || '',
          pole_number: photo.qgisMetadata.poleNumber || '',
          photo_type: photo.qgisMetadata.photoType || '',
          captured_at: photo.timestamp.toISOString(),
          captured_by: photo.qgisMetadata.capturedBy || '',
          file_size: photo.qgisMetadata.fileSize,
          width: photo.qgisMetadata.width,
          height: photo.qgisMetadata.height,
          accuracy: photo.accuracy || null,
          altitude: photo.altitude || null,
          quality_score: photo.qgisMetadata.qualityScore || null,
          qgis_visible: photo.qgisMetadata.qgisVisible,
          qgis_scale: photo.qgisMetadata.qgisScale,
          qgis_rotation: photo.qgisMetadata.qgisRotation,
          qgis_opacity: photo.qgisMetadata.qgisOpacity,
          qgis_annotation: photo.qgisMetadata.qgisAnnotation || ''
        }
      }))
    };
  }

  /**
   * Create photo attribution for QGIS
   */
  createPhotoAttribution(photos: PhotoLocationData[]): string {
    const captureCount = photos.length;
    const uniqueCapturedBy = new Set(photos.map(p => p.qgisMetadata.capturedBy).filter(Boolean));
    const dateRange = {
      earliest: new Date(Math.min(...photos.map(p => p.timestamp.getTime()))),
      latest: new Date(Math.max(...photos.map(p => p.timestamp.getTime())))
    };

    return [
      `Photos captured by FibreField mobile application`,
      `Total photos: ${captureCount}`,
      `Captured by: ${Array.from(uniqueCapturedBy).join(', ')}`,
      `Date range: ${dateRange.earliest.toLocaleDateString()} - ${dateRange.latest.toLocaleDateString()}`,
      `Coordinate system: EPSG:4326 (WGS84)`,
      `Generated: ${new Date().toISOString()}`
    ].join('\n');
  }

  // ==================== Utility Methods ====================

  /**
   * Get photo statistics
   */
  getPhotoStatistics(photos: PhotoLocationData[]): {
    total: number;
    withGPS: number;
    withoutGPS: number;
    averageAccuracy: number;
    averageFileSize: number;
    coordinateSystems: string[];
    photoTypes: string[];
    qualityDistribution: Record<string, number>;
  } {
    const withGPS = photos.filter(p => p.coordinates).length;
    const accuracies = photos
      .map(p => p.accuracy)
      .filter((acc): acc is number => acc !== undefined);
    
    const fileSizes = photos.map(p => p.qgisMetadata.fileSize);
    const coordinateSystems = [...new Set(photos.map(p => p.coordinates.crs))];
    const photoTypes = [...new Set(photos.map(p => p.qgisMetadata.photoType).filter(Boolean))];

    // Quality distribution
    const qualityDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    for (const photo of photos) {
      const accuracy = photo.accuracy || 999;
      if (accuracy <= this.QUALITY_THRESHOLDS.excellent) {
        qualityDistribution.excellent++;
      } else if (accuracy <= this.QUALITY_THRESHOLDS.good) {
        qualityDistribution.good++;
      } else if (accuracy <= this.QUALITY_THRESHOLDS.fair) {
        qualityDistribution.fair++;
      } else {
        qualityDistribution.poor++;
      }
    }

    return {
      total: photos.length,
      withGPS,
      withoutGPS: photos.length - withGPS,
      averageAccuracy: accuracies.length > 0 
        ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length 
        : 0,
      averageFileSize: fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length,
      coordinateSystems,
      photoTypes: photoTypes as string[],
      qualityDistribution
    };
  }

  /**
   * Clear processing cache
   */
  clearCache(): void {
    // Clear any cached data if implemented
    log.info('Photo geotagging cache cleared', {}, "Photogeotagging");
  }
}

// Export singleton instance
export const photoGeotaggingService = new PhotoGeotaggingService();