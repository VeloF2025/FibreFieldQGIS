// GPS Service for FibreField
import { BehaviorSubject } from 'rxjs';
import { log } from '@/lib/logger';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  requiredAccuracy?: number; // Required accuracy in meters
  maxAttempts?: number; // Max attempts to get required accuracy
}

export interface GPSError {
  code: number;
  message: string;
  timestamp: number;
}

class GPSService {
  private watchId: number | null = null;
  private currentPosition = new BehaviorSubject<GPSPosition | null>(null);
  private isWatching = new BehaviorSubject<boolean>(false);
  private lastError = new BehaviorSubject<GPSError | null>(null);
  
  // Observable streams
  position$ = this.currentPosition.asObservable();
  watching$ = this.isWatching.asObservable();
  error$ = this.lastError.asObservable();
  
  constructor() {
    // Check if geolocation is available
    if (!this.isGeolocationAvailable()) {
      log.warn('Geolocation is not available in this browser', {}, 'GPSService');
    }
  }
  
  // Check if geolocation is available
  isGeolocationAvailable(): boolean {
    return 'geolocation' in navigator;
  }
  
  // Get current position (one-time)
  async getCurrentPosition(options?: GPSOptions): Promise<GPSPosition> {
    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation is not available');
    }
    
    const defaultOptions: GPSOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
      requiredAccuracy: 10,
      maxAttempts: 5
    };
    
    const opts = { ...defaultOptions, ...options };
    let attempts = 0;
    
    while (attempts < (opts.maxAttempts || 5)) {
      try {
        const position = await this.getPositionOnce(opts);
        
        // Check if accuracy meets requirements
        if (opts.requiredAccuracy && position.accuracy > opts.requiredAccuracy) {
          attempts++;
          if (attempts >= (opts.maxAttempts || 5)) {
            // Return best attempt even if accuracy not met
            log.warn('GPS accuracy exceeds required after maximum attempts', {
              actualAccuracy: position.accuracy,
              requiredAccuracy: opts.requiredAccuracy,
              attempts
            }, 'GPSService');
            return position;
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        this.currentPosition.next(position);
        return position;
      } catch (error) {
        attempts++;
        if (attempts >= (opts.maxAttempts || 5)) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Failed to get GPS position after maximum attempts');
  }
  
  // Get position once (promise wrapper)
  private getPositionOnce(options: GPSOptions): Promise<GPSPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition = this.convertToGPSPosition(position);
          resolve(gpsPosition);
        },
        (error) => {
          const gpsError = this.convertToGPSError(error);
          this.lastError.next(gpsError);
          reject(new Error(gpsError.message));
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }
  
  // Start watching position
  startWatching(options?: GPSOptions): void {
    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation is not available');
    }
    
    if (this.watchId !== null) {
      this.stopWatching();
    }
    
    const defaultOptions: GPSOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };
    
    const opts = { ...defaultOptions, ...options };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPosition = this.convertToGPSPosition(position);
        this.currentPosition.next(gpsPosition);
        this.lastError.next(null);
      },
      (error) => {
        const gpsError = this.convertToGPSError(error);
        this.lastError.next(gpsError);
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge
      }
    );
    
    this.isWatching.next(true);
  }
  
  // Stop watching position
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching.next(false);
    }
  }
  
  // Convert GeolocationPosition to GPSPosition
  private convertToGPSPosition(position: GeolocationPosition): GPSPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  }
  
  // Convert GeolocationPositionError to GPSError
  private convertToGPSError(error: GeolocationPositionError): GPSError {
    let message = 'Unknown GPS error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'GPS permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'GPS position unavailable. Please check your device settings.';
        break;
      case error.TIMEOUT:
        message = 'GPS request timed out. Please try again.';
        break;
    }
    
    return {
      code: error.code,
      message,
      timestamp: Date.now()
    };
  }
  
  // Format coordinates for display
  formatCoordinates(position: GPSPosition): string {
    const lat = position.latitude.toFixed(6);
    const lng = position.longitude.toFixed(6);
    const latDir = position.latitude >= 0 ? 'N' : 'S';
    const lngDir = position.longitude >= 0 ? 'E' : 'W';
    
    return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lng))}°${lngDir}`;
  }
  
  // Format accuracy for display
  formatAccuracy(accuracy: number): string {
    if (accuracy < 1) {
      return `${(accuracy * 100).toFixed(0)}cm`;
    } else if (accuracy < 1000) {
      return `${accuracy.toFixed(1)}m`;
    } else {
      return `${(accuracy / 1000).toFixed(2)}km`;
    }
  }
  
  // Check if accuracy is acceptable
  isAccuracyAcceptable(accuracy: number, requiredAccuracy: number = 10): boolean {
    return accuracy <= requiredAccuracy;
  }
  
  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  // Calculate bearing between two points
  calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLng = this.toRadians(lng2 - lng1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }
  
  // Convert degrees to radians
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  // Convert radians to degrees
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
  
  // Get compass direction from bearing
  getCompassDirection(bearing: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }
  
  // Format distance for display
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }
  
  // Get current position value
  getCurrentPositionValue(): GPSPosition | null {
    return this.currentPosition.value;
  }
  
  // Get last error value
  getLastErrorValue(): GPSError | null {
    return this.lastError.value;
  }
  
  // Check if currently watching
  isCurrentlyWatching(): boolean {
    return this.isWatching.value;
  }
  
  // Clear current position
  clearPosition(): void {
    this.currentPosition.next(null);
    this.lastError.next(null);
  }
}

export const gpsService = new GPSService();