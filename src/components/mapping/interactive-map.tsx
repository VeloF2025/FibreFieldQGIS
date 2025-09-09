/**
 * Interactive Map Component for FibreField Navigation
 * 
 * Features:
 * - OpenStreetMap base layer with offline support
 * - GPS positioning with accuracy display
 * - Home drop and pole visualization
 * - Touch-optimized interface for field use
 * - QGIS/QField compatible data layers
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLng, Map as LeafletMap } from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Target, 
  Layers, 
  Download, 
  Wifi, 
  WifiOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mappingService, type MapLayer, type MapConfig } from '@/services/navigation/mapping.service';
import { gpsService, type GPSPosition } from '@/services/gps.service';
import { navigationService, type NavigationPoint, type NavigationStatus } from '@/services/navigation/navigation.service';
import type { HomeDropAssignment, HomeDropCapture } from '@/types/home-drop.types';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

/**
 * Custom map icons
 */
const createIcon = (type: 'home-drop' | 'pole' | 'assignment' | 'current-location' | 'destination', color?: string) => {
  const icons = {
    'home-drop': {
      html: `<div class="bg-green-500 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
               <div class="w-2 h-2 bg-white rounded-full"></div>
             </div>`,
      size: [24, 24] as [number, number]
    },
    'pole': {
      html: `<div class="bg-blue-500 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
               <div class="w-3 h-3 bg-white rounded-sm"></div>
             </div>`,
      size: [32, 32] as [number, number]
    },
    'assignment': {
      html: `<div class="bg-red-500 w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
               <div class="w-2 h-2 bg-white rounded-full"></div>
             </div>`,
      size: [28, 28] as [number, number]
    },
    'current-location': {
      html: `<div class="bg-purple-500 w-6 h-6 rounded-full border-3 border-white shadow-lg animate-pulse">
               <div class="w-full h-full rounded-full bg-purple-400 opacity-30 animate-ping"></div>
             </div>`,
      size: [24, 24] as [number, number]
    },
    'destination': {
      html: `<div class="bg-orange-500 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
               <div class="w-3 h-3 bg-white transform rotate-45"></div>
             </div>`,
      size: [32, 32] as [number, number]
    }
  };

  const iconConfig = icons[type];
  
  return L.divIcon({
    html: iconConfig.html,
    iconSize: iconConfig.size,
    iconAnchor: [iconConfig.size[0] / 2, iconConfig.size[1] / 2],
    popupAnchor: [0, -iconConfig.size[1] / 2],
    className: 'custom-map-marker'
  });
};

/**
 * GPS Position Tracker Component
 */
function GPSTracker({ onPositionUpdate }: { onPositionUpdate?: (position: GPSPosition) => void }) {
  const map = useMap();
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const subscription = gpsService.position$.subscribe((pos) => {
      if (pos) {
        setPosition(pos);
        onPositionUpdate?.(pos);
        
        // Center map on first position or when tracking
        if (isTracking || !position) {
          map.setView([pos.latitude, pos.longitude], map.getZoom());
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [map, position, isTracking, onPositionUpdate]);

  const handleStartTracking = () => {
    setIsTracking(true);
    gpsService.startWatching({
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 30000
    });
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    gpsService.stopWatching();
  };

  return (
    <>
      {position && (
        <Marker
          position={[position.latitude, position.longitude]}
          icon={createIcon('current-location')}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-medium">Current Location</div>
              <div className="text-gray-600">
                Accuracy: {gpsService.formatAccuracy(position.accuracy)}
              </div>
              <div className="text-gray-600">
                {gpsService.formatCoordinates(position)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* GPS Control Button */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant={isTracking ? "default" : "outline"}
          onClick={isTracking ? handleStopTracking : handleStartTracking}
          className="bg-white shadow-lg"
        >
          {isTracking ? <Target className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
        </Button>
      </div>
    </>
  );
}

/**
 * Map Layer Toggle Component
 */
function LayerToggle({ layers, onLayerToggle }: { 
  layers: MapLayer[]; 
  onLayerToggle: (layerId: string) => void; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-white rounded-lg shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white"
        >
          <Layers className="w-4 h-4" />
        </Button>
        
        {isOpen && (
          <Card className="absolute top-full left-0 mt-2 p-3 min-w-48 max-w-64">
            <div className="text-sm font-medium mb-2">Map Layers</div>
            <div className="space-y-2">
              {layers.filter(l => l.type !== 'base').map((layer) => (
                <div key={layer.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{layer.name}</span>
                  <button
                    onClick={() => onLayerToggle(layer.id)}
                    className={cn(
                      "w-4 h-4 rounded border-2",
                      layer.visible 
                        ? "bg-blue-500 border-blue-500" 
                        : "border-gray-300"
                    )}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Navigation Status Display
 */
function NavigationStatusDisplay({ status }: { status: NavigationStatus }) {
  if (!status.isNavigating || !status.currentDestination) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <Card className="p-4 bg-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Navigating to</span>
          </div>
          <Badge variant="outline">
            {gpsService.formatDistance(status.distanceToDestination)}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          {status.currentDestination.name}
        </div>
        
        {status.currentInstruction && (
          <div className="text-sm bg-gray-50 p-2 rounded">
            {status.currentInstruction.instruction}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>ETA: {Math.round(status.timeToDestination / 60)}min</span>
          <span>{status.isOnRoute ? 'On route' : 'Off route'}</span>
        </div>
      </Card>
    </div>
  );
}

/**
 * Interactive Map Props
 */
interface InteractiveMapProps {
  assignments?: HomeDropAssignment[];
  homeDrops?: HomeDropCapture[];
  navigationRoute?: NavigationPoint[];
  onMarkerClick?: (type: 'assignment' | 'home-drop' | 'pole', id: string) => void;
  onMapClick?: (latitude: number, longitude: number) => void;
  height?: string;
  showNavigation?: boolean;
  showGPSTracker?: boolean;
  showLayerToggle?: boolean;
  className?: string;
}

/**
 * Interactive Map Component
 */
export function InteractiveMap({
  assignments = [],
  homeDrops = [],
  navigationRoute = [],
  onMarkerClick,
  onMapClick,
  height = '400px',
  showNavigation = true,
  showGPSTracker = true,
  showLayerToggle = true,
  className
}: InteractiveMapProps) {
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [navigationStatus, setNavigationStatus] = useState<NavigationStatus | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Subscribe to mapping service
  useEffect(() => {
    const configSubscription = mappingService.config$.subscribe(setMapConfig);
    const layersSubscription = mappingService.layers$.subscribe(setLayers);
    const statusSubscription = mappingService.status$.subscribe((status) => {
      setIsOffline(status.isOffline);
    });

    return () => {
      configSubscription.unsubscribe();
      layersSubscription.unsubscribe();
      statusSubscription.unsubscribe();
    };
  }, []);

  // Subscribe to navigation service
  useEffect(() => {
    if (showNavigation) {
      const subscription = navigationService.status$.subscribe(setNavigationStatus);
      return () => subscription.unsubscribe();
    }
  }, [showNavigation]);

  // Update layers with current data
  useEffect(() => {
    mappingService.loadAssignments(assignments);
  }, [assignments]);

  useEffect(() => {
    mappingService.loadHomeDrops(homeDrops);
  }, [homeDrops]);

  useEffect(() => {
    if (navigationRoute.length > 0) {
      mappingService.loadNavigationRoute(navigationRoute);
    } else {
      mappingService.clearNavigationRoute();
    }
  }, [navigationRoute]);

  // Handle layer toggle
  const handleLayerToggle = useCallback((layerId: string) => {
    mappingService.toggleLayerVisibility(layerId);
  }, []);

  // Handle map events
  const handleMapClick = useCallback((e: any) => {
    const { lat, lng } = e.latlng;
    onMapClick?.(lat, lng);
  }, [onMapClick]);

  // Handle position update from GPS
  const handlePositionUpdate = useCallback((position: GPSPosition) => {
    // Update map config center if needed
    if (mapConfig) {
      mappingService.updateConfig({
        center: [position.latitude, position.longitude]
      });
    }
  }, [mapConfig]);

  if (!mapConfig) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 rounded-lg", className)} style={{ height }}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)} style={{ height }}>
      {/* Offline indicator */}
      {isOffline && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline Mode
          </Badge>
        </div>
      )}

      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        minZoom={mapConfig.minZoom}
        maxZoom={mapConfig.maxZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={mapConfig.attribution}
        touchZoom={mapConfig.touchZoom}
        dragging={mapConfig.dragging}
        ref={mapRef}
      >
        {/* Base tile layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Assignment markers */}
        {assignments.map((assignment) => (
          <Marker
            key={`assignment-${assignment.id}`}
            position={[
              assignment.customer.location?.latitude || mapConfig.center[0],
              assignment.customer.location?.longitude || mapConfig.center[1]
            ]}
            icon={createIcon('assignment')}
            eventHandlers={{
              click: () => onMarkerClick?.('assignment', assignment.id)
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{assignment.customer.name}</div>
                <div className="text-gray-600">{assignment.customer.address}</div>
                <div className="mt-1">
                  <Badge variant="outline">
                    Pole: {assignment.poleNumber}
                  </Badge>
                  <Badge 
                    variant={assignment.priority === 'high' ? 'destructive' : 'default'}
                    className="ml-1"
                  >
                    {assignment.priority}
                  </Badge>
                </div>
                {assignment.installationNotes && (
                  <div className="text-gray-600 mt-1 text-xs">
                    {assignment.installationNotes}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Home drop markers */}
        {homeDrops.map((homeDrop) => (
          <Marker
            key={`home-drop-${homeDrop.id}`}
            position={[
              homeDrop.gpsLocation?.latitude || homeDrop.customer.location?.latitude || mapConfig.center[0],
              homeDrop.gpsLocation?.longitude || homeDrop.customer.location?.longitude || mapConfig.center[1]
            ]}
            icon={createIcon('home-drop')}
            eventHandlers={{
              click: () => onMarkerClick?.('home-drop', homeDrop.id)
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{homeDrop.customer.name}</div>
                <div className="text-gray-600">{homeDrop.customer.address}</div>
                <div className="mt-1">
                  <Badge variant="outline">
                    Pole: {homeDrop.poleNumber}
                  </Badge>
                  <Badge 
                    variant={homeDrop.status === 'completed' ? 'success' : 'default'}
                    className="ml-1"
                  >
                    {homeDrop.status}
                  </Badge>
                </div>
                {homeDrop.installation.powerReadings.opticalPower && (
                  <div className="text-xs text-gray-600 mt-1">
                    Power: {homeDrop.installation.powerReadings.opticalPower} dBm
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Navigation route */}
        {navigationRoute.length > 1 && (
          <Polyline
            positions={navigationRoute.map(point => [point.latitude, point.longitude])}
            color="#7c3aed"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Destination marker */}
        {navigationStatus?.currentDestination && (
          <Marker
            position={[
              navigationStatus.currentDestination.latitude,
              navigationStatus.currentDestination.longitude
            ]}
            icon={createIcon('destination')}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">Destination</div>
                <div className="text-gray-600">
                  {navigationStatus.currentDestination.name}
                </div>
                <div className="text-gray-600">
                  {gpsService.formatDistance(navigationStatus.distanceToDestination)} away
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* GPS Tracker */}
        {showGPSTracker && <GPSTracker onPositionUpdate={handlePositionUpdate} />}

        {/* Map click handler */}
        <MapClickHandler onClick={handleMapClick} />
      </MapContainer>

      {/* Layer toggle */}
      {showLayerToggle && (
        <LayerToggle layers={layers} onLayerToggle={handleLayerToggle} />
      )}

      {/* Navigation status */}
      {showNavigation && navigationStatus && (
        <NavigationStatusDisplay status={navigationStatus} />
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Map Click Handler Component
 */
function MapClickHandler({ onClick }: { onClick: (e: any) => void }) {
  useMapEvents({
    click: onClick
  });
  return null;
}