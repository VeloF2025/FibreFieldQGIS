import { log } from '@/lib/logger';
import { db } from '@/lib/database';
import type {
  HomeDropCapture,
  HomeDropServiceConfig,
  HomeDropValidationRules
} from '@/types/home-drop.types';
import { poleCaptureService } from '../pole-capture.service';
import { coreHomeDropService } from './core-home-drop.service';

/**
 * Home Drop GPS Validation Service
 * 
 * Handles GPS location validation, accuracy checks, and distance calculations.
 * Validates proximity to originating poles and location accuracy thresholds.
 * 
 * Line count target: <200 lines
 */
export class HomeDropGPSService {
  private get config(): HomeDropServiceConfig {
    return coreHomeDropService.config;
  }

  private get validationRules(): HomeDropValidationRules {
    return coreHomeDropService.validationRules;
  }

  /**
   * Update GPS location for home drop capture
   */
  async updateGPSLocation(
    homeDropId: string,
    location: GeolocationCoordinates | undefined
  ): Promise<void> {
    if (!location) {
      throw new Error('GPS location is required');
    }

    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      throw new Error(`Home drop ${homeDropId} not found`);
    }

    // Validate GPS accuracy
    if (location.accuracy > this.config.gpsAccuracyThreshold) {
      log.warn(`⚠️ GPS accuracy (${location.accuracy}m) exceeds threshold (${this.config.gpsAccuracyThreshold}m)`, 
        { homeDropId, accuracy: location.accuracy }, "HomeDropGPSService");
    }

    // Get pole location for distance calculation
    const pole = await poleCaptureService.getPoleCapture(homeDropCapture.poleNumber);
    let distanceFromPole: number | undefined;

    if (pole?.gpsLocation) {
      distanceFromPole = this.calculateDistance(
        location.latitude,
        location.longitude,
        pole.gpsLocation.latitude,
        pole.gpsLocation.longitude
      );

      // Validate distance from pole
      if (distanceFromPole > this.validationRules.maxDistanceFromPole) {
        log.warn(`⚠️ Home drop is ${distanceFromPole.toFixed(1)}m from pole (max: ${this.validationRules.maxDistanceFromPole}m)`,
          { homeDropId, distanceFromPole }, "HomeDropGPSService");
      }
    }

    // Update home drop with GPS data
    await coreHomeDropService.updateHomeDropCapture(homeDropId, {
      gpsLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude || 0,
        accuracy: location.accuracy,
        timestamp: new Date().toISOString()
      },
      distanceFromPole,
      gpsValidated: location.accuracy <= this.config.gpsAccuracyThreshold,
      proximityValidated: !distanceFromPole || distanceFromPole <= this.validationRules.maxDistanceFromPole
    });

    log.info('✅ GPS location updated', { 
      homeDropId, 
      accuracy: location.accuracy, 
      distanceFromPole: distanceFromPole?.toFixed(1) || 'unknown'
    }, "HomeDropGPSService");
  }

  /**
   * Validate GPS requirements for home drop
   */
  async validateGPSRequirements(homeDropId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture) {
      return { isValid: false, errors: ['Home drop not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if GPS location exists
    if (!homeDropCapture.gpsLocation) {
      errors.push('GPS location is required');
      return { isValid: false, errors, warnings };
    }

    // Check GPS accuracy
    if (homeDropCapture.gpsLocation.accuracy > this.config.gpsAccuracyThreshold) {
      warnings.push(`GPS accuracy (${homeDropCapture.gpsLocation.accuracy}m) exceeds recommended threshold (${this.config.gpsAccuracyThreshold}m)`);
    }

    // Check distance from pole
    if (homeDropCapture.distanceFromPole && 
        homeDropCapture.distanceFromPole > this.validationRules.maxDistanceFromPole) {
      errors.push(`Distance from pole (${homeDropCapture.distanceFromPole.toFixed(1)}m) exceeds maximum allowed (${this.validationRules.maxDistanceFromPole}m)`);
    }

    // Check if coordinates are reasonable (not 0,0 or obviously invalid)
    if (homeDropCapture.gpsLocation.latitude === 0 && homeDropCapture.gpsLocation.longitude === 0) {
      errors.push('Invalid GPS coordinates (0,0)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get nearby home drops within a certain radius
   */
  async getNearbyHomeDrops(
    latitude: number,
    longitude: number,
    radiusMeters: number = 1000
  ): Promise<Array<HomeDropCapture & { distance: number }>> {
    const allHomeDrops = await coreHomeDropService.getAllHomeDropCaptures();
    const nearbyDrops: Array<HomeDropCapture & { distance: number }> = [];

    for (const drop of allHomeDrops) {
      if (drop.gpsLocation) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          drop.gpsLocation.latitude,
          drop.gpsLocation.longitude
        );

        if (distance <= radiusMeters) {
          nearbyDrops.push({ ...drop, distance });
        }
      }
    }

    // Sort by distance
    return nearbyDrops.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check for potential duplicate home drops at the same location
   */
  async checkForDuplicateLocations(
    homeDropId: string,
    toleranceMeters: number = 10
  ): Promise<HomeDropCapture[]> {
    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture?.gpsLocation) {
      return [];
    }

    const nearbyDrops = await this.getNearbyHomeDrops(
      homeDropCapture.gpsLocation.latitude,
      homeDropCapture.gpsLocation.longitude,
      toleranceMeters
    );

    // Filter out the current home drop
    return nearbyDrops
      .filter(drop => drop.id !== homeDropId)
      .map(({ distance, ...drop }) => drop);
  }

  /**
   * Generate GPS quality report
   */
  async generateGPSQualityReport(homeDropId: string): Promise<{
    accuracy: number;
    distanceFromPole?: number;
    isAccurate: boolean;
    isWithinRange: boolean;
    qualityScore: number; // 0-100
    recommendations: string[];
  }> {
    const homeDropCapture = await coreHomeDropService.getHomeDropCapture(homeDropId);
    if (!homeDropCapture?.gpsLocation) {
      return {
        accuracy: 0,
        isAccurate: false,
        isWithinRange: false,
        qualityScore: 0,
        recommendations: ['GPS location is required']
      };
    }

    const { accuracy } = homeDropCapture.gpsLocation;
    const { distanceFromPole } = homeDropCapture;

    const isAccurate = accuracy <= this.config.gpsAccuracyThreshold;
    const isWithinRange = !distanceFromPole || distanceFromPole <= this.validationRules.maxDistanceFromPole;

    // Calculate quality score (0-100)
    let qualityScore = 100;
    
    // Penalize for poor accuracy
    if (accuracy > this.config.gpsAccuracyThreshold) {
      const accuracyPenalty = Math.min(50, (accuracy - this.config.gpsAccuracyThreshold) * 2);
      qualityScore -= accuracyPenalty;
    }

    // Penalize for being too far from pole
    if (distanceFromPole && distanceFromPole > this.validationRules.maxDistanceFromPole) {
      const distancePenalty = Math.min(30, (distanceFromPole - this.validationRules.maxDistanceFromPole) * 0.1);
      qualityScore -= distancePenalty;
    }

    const recommendations: string[] = [];
    if (!isAccurate) {
      recommendations.push('Improve GPS accuracy by moving to open area with clear sky view');
    }
    if (!isWithinRange) {
      recommendations.push('Verify home drop location - may be too far from originating pole');
    }

    return {
      accuracy,
      distanceFromPole,
      isAccurate,
      isWithinRange,
      qualityScore: Math.max(0, qualityScore),
      recommendations
    };
  }
}

export const homeDropGPSService = new HomeDropGPSService();