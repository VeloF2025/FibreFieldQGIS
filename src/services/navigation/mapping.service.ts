/**
 * Mapping Service for FibreField Navigation
 * 
 * Provides QGIS/QField compatible mapping with:
 * - OpenStreetMap base layer support
 * - Offline map tile caching (MBTiles)
 * - GeoPackage layer loading for poles/drops
 * - Coordinate system support (EPSG:4326)
 * - Offline capability with cached map data
 */

import { BehaviorSubject, Observable } from 'rxjs';
import type { HomeDropCapture, HomeDropAssignment } from '@/types/home-drop.types';
import type { NavigationPoint } from './navigation.service';

/**
 * Map Layer Types
 */
export type MapLayerType = 'base' | 'poles' | 'home-drops' | 'assignments' | 'routes' | 'offline-tiles';

/**
 * Map Layer Configuration
 */
export interface MapLayer {
  id: string;
  name: string;
  type: MapLayerType;
  visible: boolean;
  opacity: number;
  source: MapLayerSource;
  style?: MapLayerStyle;
  cluster?: boolean;
  interactive?: boolean;
}

/**
 * Map Layer Source
 */
export interface MapLayerSource {
  type: 'geojson' | 'raster' | 'vector' | 'geopackage';
  url?: string;
  data?: any;
  tileSize?: number;
  attribution?: string;
  offline?: boolean;
  cacheKey?: string;
}

/**
 * Map Layer Style
 */
export interface MapLayerStyle {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  opacity?: number;
  radius?: number;
  icon?: MapIconStyle;
}

/**
 * Map Icon Style
 */
export interface MapIconStyle {
  iconUrl: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
}

/**
 * Map Bounds
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Map Configuration
 */
export interface MapConfig {
  center: [number, number]; // [latitude, longitude]
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds?: MapBounds;
  offline: boolean;
  touchZoom: boolean;
  dragging: boolean;
  attribution: boolean;
}

/**
 * Offline Map Tile
 */
export interface OfflineMapTile {
  id: string;
  x: number;
  y: number;
  z: number;
  data: string; // Base64 encoded tile image
  timestamp: Date;
  size: number;
  format: 'png' | 'jpg';
}

/**
 * GeoPackage Feature
 */
export interface GeoPackageFeature {
  id: string;
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[] | number[][] | number[][][];
  properties: Record<string, any>;
  layerName: string;
}

/**
 * Map Status
 */
export interface MapStatus {
  isLoaded: boolean;
  isOffline: boolean;
  center: [number, number];
  zoom: number;
  bounds: MapBounds;
  visibleLayers: string[];
  offlineTileCount: number;
  cacheSize: number; // In bytes
}

/**
 * Mapping Service Implementation
 */
class MappingService {
  private mapConfig = new BehaviorSubject<MapConfig>({
    center: [43.6532, -79.3832], // Toronto default
    zoom: 13,
    minZoom: 8,
    maxZoom: 18,
    offline: false,
    touchZoom: true,
    dragging: true,
    attribution: true
  });

  private mapLayers = new BehaviorSubject<MapLayer[]>([]);
  private mapStatus = new BehaviorSubject<MapStatus>({
    isLoaded: false,
    isOffline: false,
    center: [43.6532, -79.3832],
    zoom: 13,
    bounds: { north: 0, south: 0, east: 0, west: 0 },
    visibleLayers: [],
    offlineTileCount: 0,
    cacheSize: 0
  });

  // Observable streams
  config$ = this.mapConfig.asObservable();
  layers$ = this.mapLayers.asObservable();
  status$ = this.mapStatus.asObservable();

  // Offline tile storage (using IndexedDB)
  private offlineTiles = new Map<string, OfflineMapTile>();
  private readonly TILE_CACHE_NAME = 'fibrefield-map-tiles';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.initializeMapping();
  }

  /**
   * Initialize mapping service
   */
  private async initializeMapping(): Promise<void> {
    try {
      // Load offline tiles from IndexedDB
      await this.loadOfflineTiles();

      // Setup default layers
      this.setupDefaultLayers();

      // Update status
      this.updateStatus({ isLoaded: true });
      
      console.log('Mapping service initialized');
    } catch (error) {
      console.error('Failed to initialize mapping service:', error);
    }
  }

  /**
   * Setup default map layers
   */
  private setupDefaultLayers(): void {
    const defaultLayers: MapLayer[] = [
      {
        id: 'osm-base',
        name: 'OpenStreetMap',
        type: 'base',
        visible: true,
        opacity: 1,
        source: {
          type: 'raster',
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors',
          offline: true,
          cacheKey: 'osm'
        }
      },
      {
        id: 'poles-layer',
        name: 'Poles',
        type: 'poles',
        visible: true,
        opacity: 1,
        source: {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        },
        style: {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.8,
          radius: 8,
          weight: 2,
          icon: {
            iconUrl: '/icons/pole-marker.png',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
          }
        },
        cluster: true,
        interactive: true
      },
      {
        id: 'home-drops-layer',
        name: 'Home Drops',
        type: 'home-drops',
        visible: true,
        opacity: 1,
        source: {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        },
        style: {
          color: '#16a34a',
          fillColor: '#22c55e',
          fillOpacity: 0.8,
          radius: 6,
          weight: 2,
          icon: {
            iconUrl: '/icons/home-drop-marker.png',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
          }
        },
        cluster: false,
        interactive: true
      },
      {
        id: 'assignments-layer',
        name: 'Assignments',
        type: 'assignments',
        visible: true,
        opacity: 1,
        source: {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        },
        style: {
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.8,
          radius: 8,
          weight: 2,
          icon: {
            iconUrl: '/icons/assignment-marker.png',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
          }
        },
        cluster: false,
        interactive: true
      },
      {
        id: 'routes-layer',
        name: 'Navigation Routes',
        type: 'routes',
        visible: true,
        opacity: 1,
        source: {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        },
        style: {
          color: '#7c3aed',
          weight: 4,
          opacity: 0.8
        },
        interactive: false
      }
    ];

    this.mapLayers.next(defaultLayers);
  }

  /**
   * Update map configuration
   */
  updateConfig(config: Partial<MapConfig>): void {
    const currentConfig = this.mapConfig.value;
    this.mapConfig.next({ ...currentConfig, ...config });
  }

  /**
   * Add or update map layer
   */
  updateLayer(layer: MapLayer): void {
    const layers = this.mapLayers.value;
    const existingIndex = layers.findIndex(l => l.id === layer.id);
    
    // Check if layer actually changed to prevent infinite loops
    if (existingIndex >= 0) {
      const existingLayer = layers[existingIndex];
      // Deep comparison to prevent unnecessary updates
      if (JSON.stringify(existingLayer) === JSON.stringify(layer)) {
        return; // No change, skip update
      }
      layers[existingIndex] = layer;
    } else {
      layers.push(layer);
    }
    
    this.mapLayers.next([...layers]);
  }

  /**
   * Remove map layer
   */
  removeLayer(layerId: string): void {
    const layers = this.mapLayers.value.filter(l => l.id !== layerId);
    this.mapLayers.next(layers);
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(layerId: string): void {
    const layers = this.mapLayers.value;
    const layer = layers.find(l => l.id === layerId);
    
    if (layer) {
      layer.visible = !layer.visible;
      this.mapLayers.next([...layers]);
    }
  }

  /**
   * Update layer opacity
   */
  updateLayerOpacity(layerId: string, opacity: number): void {
    const layers = this.mapLayers.value;
    const layer = layers.find(l => l.id === layerId);
    
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.mapLayers.next([...layers]);
    }
  }

  /**
   * Load home drop assignments as GeoJSON layer
   */
  loadAssignments(assignments: HomeDropAssignment[]): void {
    const features = assignments.map(assignment => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          assignment.customer.location?.longitude || 0,
          assignment.customer.location?.latitude || 0
        ]
      },
      properties: {
        id: assignment.id,
        homeDropId: assignment.homeDropId,
        poleNumber: assignment.poleNumber,
        customerName: assignment.customer.name,
        customerAddress: assignment.customer.address,
        status: assignment.status,
        priority: assignment.priority,
        assignedTo: assignment.assignedTo,
        scheduledDate: assignment.scheduledDate?.toISOString(),
        installationNotes: assignment.installationNotes
      }
    }));

    const assignmentLayer = this.mapLayers.value.find(l => l.id === 'assignments-layer');
    if (assignmentLayer) {
      const newData = {
        type: 'FeatureCollection',
        features
      };
      
      // Only update if data has actually changed
      const existingFeatures = assignmentLayer.source.data?.features || [];
      if (JSON.stringify(existingFeatures) !== JSON.stringify(features)) {
        assignmentLayer.source.data = newData;
        this.updateLayer(assignmentLayer);
      }
    }
  }

  /**
   * Load home drop captures as GeoJSON layer
   */
  loadHomeDrops(homeDrops: HomeDropCapture[]): void {
    const features = homeDrops.map(homeDrop => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          homeDrop.gpsLocation?.longitude || homeDrop.customer.location?.longitude || 0,
          homeDrop.gpsLocation?.latitude || homeDrop.customer.location?.latitude || 0
        ]
      },
      properties: {
        id: homeDrop.id,
        poleNumber: homeDrop.poleNumber,
        customerName: homeDrop.customer.name,
        customerAddress: homeDrop.customer.address,
        status: homeDrop.status,
        syncStatus: homeDrop.syncStatus,
        capturedBy: homeDrop.capturedByName || homeDrop.capturedBy,
        capturedAt: homeDrop.capturedAt?.toISOString(),
        opticalPower: homeDrop.installation.powerReadings.opticalPower,
        serviceActive: homeDrop.installation.serviceConfig.activationStatus
      }
    }));

    const homeDropsLayer = this.mapLayers.value.find(l => l.id === 'home-drops-layer');
    if (homeDropsLayer) {
      const newData = {
        type: 'FeatureCollection',
        features
      };
      
      // Only update if data has actually changed
      const existingFeatures = homeDropsLayer.source.data?.features || [];
      if (JSON.stringify(existingFeatures) !== JSON.stringify(features)) {
        homeDropsLayer.source.data = newData;
        this.updateLayer(homeDropsLayer);
      }
    }
  }

  /**
   * Load navigation route as GeoJSON layer
   */
  loadNavigationRoute(points: NavigationPoint[]): void {
    if (points.length < 2) {
      this.clearNavigationRoute();
      return;
    }

    const coordinates = points.map(point => [point.longitude, point.latitude]);
    
    const routeFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates
      },
      properties: {
        type: 'navigation-route',
        distance: 0, // Will be calculated by routing service
        estimatedTime: 0
      }
    };

    // Add waypoint markers
    const waypointFeatures = points.map((point, index) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        type: 'waypoint',
        name: point.name,
        order: index,
        isStart: index === 0,
        isEnd: index === points.length - 1
      }
    }));

    const routesLayer = this.mapLayers.value.find(l => l.id === 'routes-layer');
    if (routesLayer) {
      const newFeatures = [routeFeature, ...waypointFeatures];
      const newData = {
        type: 'FeatureCollection',
        features: newFeatures
      };
      
      // Only update if data has actually changed
      const existingFeatures = routesLayer.source.data?.features || [];
      if (JSON.stringify(existingFeatures) !== JSON.stringify(newFeatures)) {
        routesLayer.source.data = newData;
        this.updateLayer(routesLayer);
      }
    }
  }

  /**
   * Clear navigation route
   */
  clearNavigationRoute(): void {
    const routesLayer = this.mapLayers.value.find(l => l.id === 'routes-layer');
    if (routesLayer) {
      const newData = {
        type: 'FeatureCollection',
        features: []
      };
      
      // Only update if layer has features to clear
      const existingFeatures = routesLayer.source.data?.features || [];
      if (existingFeatures.length > 0) {
        routesLayer.source.data = newData;
        this.updateLayer(routesLayer);
      }
    }
  }

  /**
   * Download offline tiles for area
   */
  async downloadOfflineTiles(bounds: MapBounds, minZoom: number = 10, maxZoom: number = 16): Promise<void> {
    try {
      const tiles: OfflineMapTile[] = [];
      
      for (let z = minZoom; z <= maxZoom; z++) {
        const northWestTile = this.lonLatToTile(bounds.west, bounds.north, z);
        const southEastTile = this.lonLatToTile(bounds.east, bounds.south, z);
        
        for (let x = northWestTile.x; x <= southEastTile.x; x++) {
          for (let y = northWestTile.y; y <= southEastTile.y; y++) {
            try {
              const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
              const response = await fetch(tileUrl);
              
              if (response.ok) {
                const blob = await response.blob();
                const base64 = await this.blobToBase64(blob);
                
                const tile: OfflineMapTile = {
                  id: `${z}-${x}-${y}`,
                  x,
                  y,
                  z,
                  data: base64,
                  timestamp: new Date(),
                  size: blob.size,
                  format: 'png'
                };
                
                tiles.push(tile);
                this.offlineTiles.set(tile.id, tile);
              }
            } catch (error) {
              console.warn(`Failed to download tile ${z}/${x}/${y}:`, error);
            }
          }
        }
      }

      // Save to IndexedDB
      await this.saveOfflineTiles(tiles);
      
      // Update status
      this.updateStatus({
        offlineTileCount: this.offlineTiles.size,
        cacheSize: this.calculateCacheSize()
      });

      console.log(`Downloaded ${tiles.length} offline tiles`);
    } catch (error) {
      console.error('Failed to download offline tiles:', error);
      throw error;
    }
  }

  /**
   * Clear offline tile cache
   */
  async clearOfflineCache(): Promise<void> {
    try {
      this.offlineTiles.clear();
      
      // Clear from IndexedDB
      const db = await this.openTileDatabase();
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      await store.clear();
      
      this.updateStatus({
        offlineTileCount: 0,
        cacheSize: 0
      });
      
      console.log('Offline tile cache cleared');
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }

  /**
   * Get offline tile by coordinates
   */
  getOfflineTile(x: number, y: number, z: number): OfflineMapTile | null {
    const tileId = `${z}-${x}-${y}`;
    return this.offlineTiles.get(tileId) || null;
  }

  /**
   * Export data to GeoPackage format (for QGIS/QField)
   */
  async exportToGeoPackage(assignments: HomeDropAssignment[], homeDrops: HomeDropCapture[]): Promise<Blob> {
    // This would typically use a GeoPackage library
    // For now, return as GeoJSON which is compatible with QGIS
    
    const assignmentFeatures = assignments.map(assignment => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          assignment.customer.location?.longitude || 0,
          assignment.customer.location?.latitude || 0
        ]
      },
      properties: {
        type: 'assignment',
        id: assignment.id,
        homeDropId: assignment.homeDropId,
        poleNumber: assignment.poleNumber,
        customerName: assignment.customer.name,
        customerAddress: assignment.customer.address,
        status: assignment.status,
        priority: assignment.priority,
        assignedTo: assignment.assignedTo,
        scheduledDate: assignment.scheduledDate?.toISOString(),
        createdAt: assignment.assignedAt.toISOString()
      }
    }));

    const homeDropFeatures = homeDrops.map(homeDrop => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          homeDrop.gpsLocation?.longitude || 0,
          homeDrop.gpsLocation?.latitude || 0
        ]
      },
      properties: {
        type: 'home_drop',
        id: homeDrop.id,
        poleNumber: homeDrop.poleNumber,
        customerName: homeDrop.customer.name,
        customerAddress: homeDrop.customer.address,
        status: homeDrop.status,
        syncStatus: homeDrop.syncStatus,
        capturedBy: homeDrop.capturedByName,
        capturedAt: homeDrop.capturedAt?.toISOString(),
        opticalPower: homeDrop.installation.powerReadings.opticalPower,
        serviceActive: homeDrop.installation.serviceConfig.activationStatus
      }
    }));

    const geoPackage = {
      type: 'FeatureCollection',
      name: 'FibreField Export',
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:EPSG::4326'
        }
      },
      features: [...assignmentFeatures, ...homeDropFeatures]
    };

    const jsonString = JSON.stringify(geoPackage, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Utility: Convert longitude/latitude to tile coordinates
   */
  private lonLatToTile(lon: number, lat: number, zoom: number): { x: number, y: number } {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
  }

  /**
   * Utility: Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Load offline tiles from IndexedDB
   */
  private async loadOfflineTiles(): Promise<void> {
    try {
      const db = await this.openTileDatabase();
      const transaction = db.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const tiles = request.result as OfflineMapTile[];
          tiles.forEach(tile => {
            this.offlineTiles.set(tile.id, tile);
          });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Could not load offline tiles:', error);
    }
  }

  /**
   * Save offline tiles to IndexedDB
   */
  private async saveOfflineTiles(tiles: OfflineMapTile[]): Promise<void> {
    const db = await this.openTileDatabase();
    const transaction = db.transaction(['tiles'], 'readwrite');
    const store = transaction.objectStore('tiles');
    
    for (const tile of tiles) {
      await store.put(tile);
    }
  }

  /**
   * Open IndexedDB for tile storage
   */
  private openTileDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.TILE_CACHE_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tiles')) {
          const store = db.createObjectStore('tiles', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('zoom', 'z', { unique: false });
        }
      };
    });
  }

  /**
   * Calculate total cache size
   */
  private calculateCacheSize(): number {
    let totalSize = 0;
    this.offlineTiles.forEach(tile => {
      totalSize += tile.size;
    });
    return totalSize;
  }

  /**
   * Update map status
   */
  private updateStatus(updates: Partial<MapStatus>): void {
    const currentStatus = this.mapStatus.value;
    this.mapStatus.next({ ...currentStatus, ...updates });
  }

  /**
   * Get current map status
   */
  getStatus(): MapStatus {
    return this.mapStatus.value;
  }

  /**
   * Get current map config
   */
  getConfig(): MapConfig {
    return this.mapConfig.value;
  }

  /**
   * Get current map layers
   */
  getLayers(): MapLayer[] {
    return this.mapLayers.value;
  }
}

export const mappingService = new MappingService();
export type { 
  MapLayer, 
  MapLayerSource, 
  MapLayerStyle, 
  MapConfig, 
  MapBounds, 
  MapStatus,
  OfflineMapTile,
  GeoPackageFeature,
  MapLayerType
};