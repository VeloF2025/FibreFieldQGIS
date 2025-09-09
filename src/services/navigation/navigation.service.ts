/**
 * Navigation Service for FibreField Home Drop Navigation
 * 
 * Provides GPS-guided navigation to assigned home drop locations with:
 * - Turn-by-turn navigation interface
 * - Route optimization for multiple assignments
 * - Distance calculation and proximity alerts
 * - Battery-optimized GPS usage
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { gpsService, type GPSPosition } from '@/services/gps.service';
import type { HomeDropAssignment } from '@/types/home-drop.types';

/**
 * Navigation Point - Generic waypoint interface
 */
export interface NavigationPoint {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  type: 'home-drop' | 'pole' | 'waypoint';
  address?: string;
  notes?: string;
}

/**
 * Navigation Route - Optimized route between points
 */
export interface NavigationRoute {
  id: string;
  points: NavigationPoint[];
  distance: number; // Total distance in meters
  estimatedTime: number; // Estimated time in seconds
  instructions: NavigationInstruction[];
  optimized: boolean; // Whether route has been optimized
}

/**
 * Navigation Instruction - Turn-by-turn directions
 */
export interface NavigationInstruction {
  id: string;
  stepNumber: number;
  instruction: string;
  distance: number; // Distance to this step in meters
  bearing: number; // Compass bearing
  type: 'start' | 'turn-left' | 'turn-right' | 'straight' | 'arrive';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Navigation Status - Current navigation state
 */
export interface NavigationStatus {
  isNavigating: boolean;
  currentDestination: NavigationPoint | null;
  currentRoute: NavigationRoute | null;
  currentInstruction: NavigationInstruction | null;
  nextInstruction: NavigationInstruction | null;
  distanceToDestination: number;
  timeToDestination: number;
  distanceToNextTurn: number;
  isOnRoute: boolean;
  routeDeviation: number; // Meters off route
}

/**
 * Proximity Alert Configuration
 */
export interface ProximityAlert {
  homeDropId: string;
  distance: number; // Alert distance in meters
  triggered: boolean;
  timestamp?: Date;
}

/**
 * Navigation Options
 */
export interface NavigationOptions {
  proximityAlertDistance?: number; // Default 50m
  routeOptimization?: boolean; // Enable route optimization
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  walkingMode?: boolean; // For final approach navigation
  batteryOptimized?: boolean; // Reduce GPS frequency
}

/**
 * Navigation Service Implementation
 */
class NavigationService {
  private currentStatus = new BehaviorSubject<NavigationStatus>({
    isNavigating: false,
    currentDestination: null,
    currentRoute: null,
    currentInstruction: null,
    nextInstruction: null,
    distanceToDestination: 0,
    timeToDestination: 0,
    distanceToNextTurn: 0,
    isOnRoute: false,
    routeDeviation: 0
  });

  private proximityAlerts = new BehaviorSubject<ProximityAlert[]>([]);
  private activeAlerts = new BehaviorSubject<ProximityAlert[]>([]);
  
  // Observable streams
  status$ = this.currentStatus.asObservable();
  proximityAlerts$ = this.proximityAlerts.asObservable();
  activeAlerts$ = this.activeAlerts.asObservable();

  private watchPositionId: number | null = null;
  private lastKnownPosition: GPSPosition | null = null;

  constructor() {
    this.initializeNavigation();
  }

  /**
   * Initialize navigation service
   */
  private initializeNavigation(): void {
    // Listen to GPS position updates
    gpsService.position$.subscribe((position) => {
      if (position) {
        this.lastKnownPosition = position;
        this.updateNavigationStatus(position);
        this.checkProximityAlerts(position);
      }
    });
  }

  /**
   * Start navigation to a home drop assignment
   */
  async startNavigation(assignment: HomeDropAssignment, options?: NavigationOptions): Promise<void> {
    try {
      // Convert assignment to navigation point
      const destination = this.assignmentToNavigationPoint(assignment);
      
      // Start GPS watching if not already active
      if (!gpsService.isCurrentlyWatching()) {
        const gpsOptions = {
          enableHighAccuracy: !options?.batteryOptimized,
          timeout: 30000,
          maximumAge: options?.batteryOptimized ? 10000 : 5000
        };
        gpsService.startWatching(gpsOptions);
      }

      // Get current position
      const currentPosition = await gpsService.getCurrentPosition();

      // Create simple route (can be enhanced with routing service)
      const route = await this.createRoute(currentPosition, destination, options);

      // Setup proximity alert
      this.setupProximityAlert(assignment.homeDropId, options?.proximityAlertDistance || 50);

      // Update status
      this.updateStatus({
        isNavigating: true,
        currentDestination: destination,
        currentRoute: route,
        currentInstruction: route.instructions[0] || null,
        nextInstruction: route.instructions[1] || null,
        distanceToDestination: route.distance,
        timeToDestination: route.estimatedTime,
        distanceToNextTurn: 0,
        isOnRoute: true,
        routeDeviation: 0
      });

      console.log('Navigation started to:', assignment.customer.address);
    } catch (error) {
      console.error('Failed to start navigation:', error);
      throw error;
    }
  }

  /**
   * Start multi-assignment navigation with route optimization
   */
  async startMultiAssignmentNavigation(assignments: HomeDropAssignment[], options?: NavigationOptions): Promise<void> {
    if (assignments.length === 0) {
      throw new Error('No assignments provided');
    }

    try {
      // Convert assignments to navigation points
      const destinations = assignments.map(assignment => 
        this.assignmentToNavigationPoint(assignment)
      );

      // Get current position
      const currentPosition = await gpsService.getCurrentPosition();

      // Optimize route if requested
      let optimizedDestinations = destinations;
      if (options?.routeOptimization !== false) {
        optimizedDestinations = await this.optimizeRoute(currentPosition, destinations);
      }

      // Create multi-point route
      const route = await this.createMultiPointRoute(currentPosition, optimizedDestinations, options);

      // Setup proximity alerts for all assignments
      assignments.forEach(assignment => {
        this.setupProximityAlert(assignment.homeDropId, options?.proximityAlertDistance || 50);
      });

      // Start GPS watching
      if (!gpsService.isCurrentlyWatching()) {
        const gpsOptions = {
          enableHighAccuracy: !options?.batteryOptimized,
          timeout: 30000,
          maximumAge: options?.batteryOptimized ? 10000 : 5000
        };
        gpsService.startWatching(gpsOptions);
      }

      // Update status
      this.updateStatus({
        isNavigating: true,
        currentDestination: optimizedDestinations[0],
        currentRoute: route,
        currentInstruction: route.instructions[0] || null,
        nextInstruction: route.instructions[1] || null,
        distanceToDestination: route.distance,
        timeToDestination: route.estimatedTime,
        distanceToNextTurn: 0,
        isOnRoute: true,
        routeDeviation: 0
      });

      console.log(`Multi-assignment navigation started for ${assignments.length} locations`);
    } catch (error) {
      console.error('Failed to start multi-assignment navigation:', error);
      throw error;
    }
  }

  /**
   * Stop navigation
   */
  stopNavigation(): void {
    // Stop GPS watching to save battery
    gpsService.stopWatching();

    // Clear proximity alerts
    this.proximityAlerts.next([]);
    this.activeAlerts.next([]);

    // Reset status
    this.updateStatus({
      isNavigating: false,
      currentDestination: null,
      currentRoute: null,
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestination: 0,
      timeToDestination: 0,
      distanceToNextTurn: 0,
      isOnRoute: false,
      routeDeviation: 0
    });

    console.log('Navigation stopped');
  }

  /**
   * Convert assignment to navigation point
   */
  private assignmentToNavigationPoint(assignment: HomeDropAssignment): NavigationPoint {
    return {
      id: assignment.homeDropId,
      latitude: assignment.customer.location?.latitude || 0,
      longitude: assignment.customer.location?.longitude || 0,
      name: assignment.customer.name,
      type: 'home-drop',
      address: assignment.customer.address,
      notes: assignment.installationNotes
    };
  }

  /**
   * Create simple route between two points
   */
  private async createRoute(start: GPSPosition, destination: NavigationPoint, options?: NavigationOptions): Promise<NavigationRoute> {
    const distance = gpsService.calculateDistance(
      start.latitude,
      start.longitude,
      destination.latitude,
      destination.longitude
    );

    const bearing = gpsService.calculateBearing(
      start.latitude,
      start.longitude,
      destination.latitude,
      destination.longitude
    );

    // Simple straight-line route (can be enhanced with routing API)
    const instructions: NavigationInstruction[] = [
      {
        id: 'start',
        stepNumber: 1,
        instruction: 'Head towards destination',
        distance: 0,
        bearing: bearing,
        type: 'start',
        coordinates: [start.longitude, start.latitude]
      },
      {
        id: 'arrive',
        stepNumber: 2,
        instruction: `Arrive at ${destination.name}`,
        distance: distance,
        bearing: bearing,
        type: 'arrive',
        coordinates: [destination.longitude, destination.latitude]
      }
    ];

    // Estimate time (walking speed ~5 km/h, driving ~30 km/h)
    const speed = options?.walkingMode ? 1.4 : 8.33; // m/s
    const estimatedTime = Math.round(distance / speed);

    return {
      id: `route-${Date.now()}`,
      points: [
        {
          id: 'start',
          latitude: start.latitude,
          longitude: start.longitude,
          name: 'Current Location',
          type: 'waypoint'
        },
        destination
      ],
      distance,
      estimatedTime,
      instructions,
      optimized: false
    };
  }

  /**
   * Create multi-point route
   */
  private async createMultiPointRoute(start: GPSPosition, destinations: NavigationPoint[], options?: NavigationOptions): Promise<NavigationRoute> {
    let totalDistance = 0;
    let totalTime = 0;
    const instructions: NavigationInstruction[] = [];
    const points: NavigationPoint[] = [];

    // Add starting point
    points.push({
      id: 'start',
      latitude: start.latitude,
      longitude: start.longitude,
      name: 'Current Location',
      type: 'waypoint'
    });

    let currentLat = start.latitude;
    let currentLng = start.longitude;
    let stepNumber = 1;

    // Create route through all destinations
    for (let i = 0; i < destinations.length; i++) {
      const destination = destinations[i];
      const distance = gpsService.calculateDistance(currentLat, currentLng, destination.latitude, destination.longitude);
      const bearing = gpsService.calculateBearing(currentLat, currentLng, destination.latitude, destination.longitude);

      if (i === 0) {
        instructions.push({
          id: `start`,
          stepNumber: stepNumber++,
          instruction: `Head towards ${destination.name}`,
          distance: totalDistance,
          bearing,
          type: 'start',
          coordinates: [currentLng, currentLat]
        });
      }

      instructions.push({
        id: `arrive-${i}`,
        stepNumber: stepNumber++,
        instruction: `Arrive at ${destination.name}`,
        distance: totalDistance + distance,
        bearing,
        type: 'arrive',
        coordinates: [destination.longitude, destination.latitude]
      });

      points.push(destination);
      totalDistance += distance;
      
      // Update current position for next leg
      currentLat = destination.latitude;
      currentLng = destination.longitude;

      // Add continuation instruction for next destination (if not last)
      if (i < destinations.length - 1) {
        const nextDestination = destinations[i + 1];
        const nextBearing = gpsService.calculateBearing(currentLat, currentLng, nextDestination.latitude, nextDestination.longitude);
        
        instructions.push({
          id: `continue-${i}`,
          stepNumber: stepNumber++,
          instruction: `Continue to ${nextDestination.name}`,
          distance: totalDistance,
          bearing: nextBearing,
          type: 'straight',
          coordinates: [currentLng, currentLat]
        });
      }
    }

    // Estimate total time
    const speed = options?.walkingMode ? 1.4 : 8.33; // m/s
    totalTime = Math.round(totalDistance / speed);

    return {
      id: `multi-route-${Date.now()}`,
      points,
      distance: totalDistance,
      estimatedTime: totalTime,
      instructions,
      optimized: options?.routeOptimization !== false
    };
  }

  /**
   * Optimize route using simple nearest neighbor algorithm
   * (Can be enhanced with more sophisticated algorithms)
   */
  private async optimizeRoute(start: GPSPosition, destinations: NavigationPoint[]): Promise<NavigationPoint[]> {
    if (destinations.length <= 1) return destinations;

    const optimized: NavigationPoint[] = [];
    const remaining = [...destinations];
    let currentLat = start.latitude;
    let currentLng = start.longitude;

    // Simple nearest neighbor optimization
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // Find nearest unvisited destination
      for (let i = 0; i < remaining.length; i++) {
        const distance = gpsService.calculateDistance(
          currentLat,
          currentLng,
          remaining[i].latitude,
          remaining[i].longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add nearest to optimized route
      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      currentLat = nearest.latitude;
      currentLng = nearest.longitude;
    }

    return optimized;
  }

  /**
   * Setup proximity alert for home drop
   */
  private setupProximityAlert(homeDropId: string, distance: number): void {
    const alerts = this.proximityAlerts.value;
    const existingAlert = alerts.find(alert => alert.homeDropId === homeDropId);

    if (!existingAlert) {
      alerts.push({
        homeDropId,
        distance,
        triggered: false
      });
      this.proximityAlerts.next([...alerts]);
    }
  }

  /**
   * Check proximity alerts based on current position
   */
  private checkProximityAlerts(position: GPSPosition): void {
    const alerts = this.proximityAlerts.value;
    const activeAlerts: ProximityAlert[] = [];
    const status = this.currentStatus.value;

    alerts.forEach(alert => {
      if (status.currentDestination && status.currentDestination.id === alert.homeDropId) {
        const distance = gpsService.calculateDistance(
          position.latitude,
          position.longitude,
          status.currentDestination.latitude,
          status.currentDestination.longitude
        );

        if (distance <= alert.distance && !alert.triggered) {
          alert.triggered = true;
          alert.timestamp = new Date();
          activeAlerts.push(alert);
          console.log(`Proximity alert: Within ${alert.distance}m of ${status.currentDestination.name}`);
        }
      }
    });

    if (activeAlerts.length > 0) {
      this.activeAlerts.next(activeAlerts);
    }
  }

  /**
   * Update navigation status based on current position
   */
  private updateNavigationStatus(position: GPSPosition): void {
    const status = this.currentStatus.value;
    
    if (!status.isNavigating || !status.currentDestination) {
      return;
    }

    // Calculate distance to destination
    const distanceToDestination = gpsService.calculateDistance(
      position.latitude,
      position.longitude,
      status.currentDestination.latitude,
      status.currentDestination.longitude
    );

    // Update status
    this.updateStatus({
      ...status,
      distanceToDestination,
      timeToDestination: Math.round(distanceToDestination / 8.33), // Estimate at ~30km/h
    });
  }

  /**
   * Update navigation status
   */
  private updateStatus(newStatus: Partial<NavigationStatus>): void {
    const currentStatus = this.currentStatus.value;
    this.currentStatus.next({ ...currentStatus, ...newStatus });
  }

  /**
   * Get current navigation status
   */
  getCurrentStatus(): NavigationStatus {
    return this.currentStatus.value;
  }

  /**
   * Get active proximity alerts
   */
  getActiveAlerts(): ProximityAlert[] {
    return this.activeAlerts.value;
  }

  /**
   * Clear proximity alert
   */
  clearProximityAlert(homeDropId: string): void {
    const alerts = this.proximityAlerts.value.filter(alert => alert.homeDropId !== homeDropId);
    this.proximityAlerts.next(alerts);

    const activeAlerts = this.activeAlerts.value.filter(alert => alert.homeDropId !== homeDropId);
    this.activeAlerts.next(activeAlerts);
  }

  /**
   * Clear all proximity alerts
   */
  clearAllProximityAlerts(): void {
    this.proximityAlerts.next([]);
    this.activeAlerts.next([]);
  }

  /**
   * Calculate ETA to destination
   */
  calculateETA(distance: number, walkingMode: boolean = false): Date {
    const speed = walkingMode ? 1.4 : 8.33; // m/s (walking vs driving)
    const timeInSeconds = distance / speed;
    return new Date(Date.now() + timeInSeconds * 1000);
  }

  /**
   * Format navigation instruction
   */
  formatInstruction(instruction: NavigationInstruction): string {
    const distance = gpsService.formatDistance(instruction.distance);
    const direction = gpsService.getCompassDirection(instruction.bearing);
    
    return `${instruction.instruction} (${distance} ${direction})`;
  }
}

export const navigationService = new NavigationService();
export type { NavigationPoint, NavigationRoute, NavigationInstruction, NavigationStatus, ProximityAlert, NavigationOptions };