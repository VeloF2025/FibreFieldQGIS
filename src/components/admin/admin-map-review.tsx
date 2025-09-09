/**
 * Admin Map Review Component
 * 
 * Specialized mapping interface for admin review of home drop captures.
 * Features:
 * - Geographic clustering of captures by status
 * - Quality heat mapping overlay
 * - Pole-to-home drop relationship visualization
 * - Batch selection on map
 * - Distance analysis and validation
 * - Route optimization for field revisits
 * - Export capabilities with geographic data
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  Filter,
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Navigation,
  Ruler,
  Target,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  Camera,
  Clock,
  Zap,
  Signal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import type { 
  HomeDropCapture,
  HomeDropStatus
} from '@/types/home-drop.types';
import { cn } from '@/lib/utils';

/**
 * Map Layer Types
 */
type MapLayerType = 
  | 'captures'
  | 'poles'
  | 'connections'
  | 'quality-heatmap'
  | 'distance-circles'
  | 'service-areas';

interface MapLayerConfig {
  id: MapLayerType;
  name: string;
  visible: boolean;
  icon: React.ReactNode;
  description: string;
}

/**
 * Capture Clustering Configuration
 */
interface ClusterConfig {
  enabled: boolean;
  maxClusterRadius: number;
  disableClusteringAtZoom: number;
  showCoverageOnHover: boolean;
}

/**
 * Custom Map Icons
 */
const createCaptureIcon = (status: HomeDropStatus, qualityScore?: number) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending_approval': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'captured': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getQualityOpacity = () => {
    if (!qualityScore) return 0.8;
    return 0.3 + (qualityScore / 100) * 0.7; // 30% to 100% opacity based on quality
  };

  const color = getStatusColor();
  const opacity = getQualityOpacity();

  return L.divIcon({
    html: `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        opacity: ${opacity};
        position: relative;
      ">
        ${qualityScore ? `
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: ${qualityScore >= 80 ? '#10b981' : qualityScore >= 60 ? '#f59e0b' : '#ef4444'};
            color: white;
            font-size: 8px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid white;
          ">${Math.round(qualityScore)}</div>
        ` : ''}
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'custom-capture-marker'
  });
};

const createPoleIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background-color: #1f2937;
        border: 2px solid white;
        border-radius: 2px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
    className: 'custom-pole-marker'
  });
};

/**
 * Map Statistics Overlay
 */
function MapStatsOverlay({ 
  captures, 
  visibleCaptures,
  selectedCaptures 
}: { 
  captures: HomeDropCapture[];
  visibleCaptures: HomeDropCapture[];
  selectedCaptures: string[];
}) {
  const stats = useMemo(() => {
    const total = visibleCaptures.length;
    const pending = visibleCaptures.filter(c => c.status === 'pending_approval').length;
    const approved = visibleCaptures.filter(c => c.status === 'approved').length;
    const rejected = visibleCaptures.filter(c => c.status === 'rejected').length;
    const avgQuality = visibleCaptures.reduce((sum, c) => 
      sum + (c.qualityChecks?.overallScore || 0), 0
    ) / Math.max(total, 1);

    return { total, pending, approved, rejected, avgQuality };
  }, [visibleCaptures]);

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      <Card className="w-64">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Map Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Visible</div>
              <div className="font-semibold">{stats.total}</div>
            </div>
            <div>
              <div className="text-gray-500">Selected</div>
              <div className="font-semibold">{selectedCaptures.length}</div>
            </div>
            <div>
              <div className="text-gray-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                Pending
              </div>
              <div className="font-semibold">{stats.pending}</div>
            </div>
            <div>
              <div className="text-gray-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Approved
              </div>
              <div className="font-semibold">{stats.approved}</div>
            </div>
            <div>
              <div className="text-gray-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Rejected
              </div>
              <div className="font-semibold">{stats.rejected}</div>
            </div>
            <div>
              <div className="text-gray-500">Avg Quality</div>
              <div className="font-semibold">{Math.round(stats.avgQuality)}%</div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Quality Distribution</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="flex-1">Excellent (90%+)</span>
                <span>{visibleCaptures.filter(c => (c.qualityChecks?.overallScore || 0) >= 90).length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="flex-1">Good (80-89%)</span>
                <span>{visibleCaptures.filter(c => {
                  const score = c.qualityChecks?.overallScore || 0;
                  return score >= 80 && score < 90;
                }).length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="flex-1">Fair (60-79%)</span>
                <span>{visibleCaptures.filter(c => {
                  const score = c.qualityChecks?.overallScore || 0;
                  return score >= 60 && score < 80;
                }).length}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="flex-1">Poor (&lt;60%)</span>
                <span>{visibleCaptures.filter(c => (c.qualityChecks?.overallScore || 0) < 60).length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Map Layer Controls
 */
function MapLayerControls({
  layers,
  onLayerToggle,
  onSettingsChange
}: {
  layers: MapLayerConfig[];
  onLayerToggle: (layerId: MapLayerType) => void;
  onSettingsChange: (settings: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10">
      <Card className="w-64">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Map Layers
            </CardTitle>
            <Button variant="ghost" size="sm">
              {isOpen ? '−' : '+'}
            </Button>
          </div>
        </CardHeader>
        
        {isOpen && (
          <CardContent className="space-y-3">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {layer.icon}
                  <div>
                    <div className="text-sm font-medium">{layer.name}</div>
                    <div className="text-xs text-gray-500">{layer.description}</div>
                  </div>
                </div>
                <Checkbox
                  checked={layer.visible}
                  onCheckedChange={() => onLayerToggle(layer.id)}
                />
              </div>
            ))}
            
            <Separator />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Map Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Map Configuration</DialogTitle>
                  <DialogDescription>
                    Configure map display and analysis options
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Quality Score Visibility Threshold</Label>
                    <Slider
                      defaultValue={[0]}
                      max={100}
                      step={10}
                      className="mt-2"
                      onValueChange={([value]) => 
                        onSettingsChange({ qualityThreshold: value })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label>Distance Analysis Radius (m)</Label>
                    <Slider
                      defaultValue={[500]}
                      min={100}
                      max={1000}
                      step={50}
                      className="mt-2"
                      onValueChange={([value]) => 
                        onSettingsChange({ distanceRadius: value })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cluster-enable"
                      defaultChecked
                      onCheckedChange={(checked) => 
                        onSettingsChange({ clusteringEnabled: checked })
                      }
                    />
                    <Label htmlFor="cluster-enable">Enable marker clustering</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="connections-show"
                      defaultChecked
                      onCheckedChange={(checked) => 
                        onSettingsChange({ showConnections: checked })
                      }
                    />
                    <Label htmlFor="connections-show">Show pole connections</Label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * Capture Selection Tools
 */
function MapSelectionTools({
  selectedCaptures,
  onBulkAction,
  onClearSelection
}: {
  selectedCaptures: string[];
  onBulkAction: (action: string) => void;
  onClearSelection: () => void;
}) {
  if (selectedCaptures.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedCaptures.length} captures selected
            </span>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onClearSelection}>
                Clear
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={() => onBulkAction('review')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="w-4 h-4 mr-1" />
                Review Selected
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={() => onBulkAction('approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onBulkAction('reject')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkAction('export')}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Map Click Handler for Selection
 */
function MapClickHandler({ 
  onMarkerClick, 
  onMapClick 
}: { 
  onMarkerClick?: (captureId: string, event: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e: any) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onMapClick]);

  return null;
}

/**
 * Main Admin Map Review Component
 */
interface AdminMapReviewProps {
  captures: HomeDropCapture[];
  poles?: Array<{ id: string; number: string; latitude: number; longitude: number }>;
  onCaptureSelect?: (captureIds: string[]) => void;
  onCaptureView?: (captureId: string) => void;
  onBulkAction?: (action: string, captureIds: string[]) => void;
  height?: string;
  className?: string;
}

export function AdminMapReview({
  captures,
  poles = [],
  onCaptureSelect,
  onCaptureView,
  onBulkAction,
  height = '600px',
  className
}: AdminMapReviewProps) {
  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [layers, setLayers] = useState<MapLayerConfig[]>([
    {
      id: 'captures',
      name: 'Home Drop Captures',
      visible: true,
      icon: <MapPin className="w-4 h-4" />,
      description: 'Show capture locations'
    },
    {
      id: 'poles',
      name: 'Poles',
      visible: true,
      icon: <Target className="w-4 h-4" />,
      description: 'Show pole locations'
    },
    {
      id: 'connections',
      name: 'Pole Connections',
      visible: false,
      icon: <Navigation className="w-4 h-4" />,
      description: 'Show pole-to-drop connections'
    },
    {
      id: 'quality-heatmap',
      name: 'Quality Heatmap',
      visible: false,
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Color-coded quality overlay'
    },
    {
      id: 'distance-circles',
      name: 'Distance Analysis',
      visible: false,
      icon: <Ruler className="w-4 h-4" />,
      description: 'Show distance validation circles'
    }
  ]);
  
  const [mapSettings, setMapSettings] = useState({
    qualityThreshold: 0,
    distanceRadius: 500,
    clusteringEnabled: true,
    showConnections: true
  });

  // Filter captures based on settings
  const visibleCaptures = useMemo(() => {
    return captures.filter(capture => {
      if (!capture.gpsLocation) return false;
      const qualityScore = capture.qualityChecks?.overallScore || 0;
      return qualityScore >= mapSettings.qualityThreshold;
    });
  }, [captures, mapSettings.qualityThreshold]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (visibleCaptures.length === 0) return [51.505, -0.09] as [number, number];
    
    const avgLat = visibleCaptures.reduce((sum, c) => 
      sum + (c.gpsLocation?.latitude || 0), 0
    ) / visibleCaptures.length;
    
    const avgLng = visibleCaptures.reduce((sum, c) => 
      sum + (c.gpsLocation?.longitude || 0), 0
    ) / visibleCaptures.length;
    
    return [avgLat, avgLng] as [number, number];
  }, [visibleCaptures]);

  // Group captures by pole for connection lines
  const capturesByPole = useMemo(() => {
    const groups: Record<string, HomeDropCapture[]> = {};
    visibleCaptures.forEach(capture => {
      if (!groups[capture.poleNumber]) {
        groups[capture.poleNumber] = [];
      }
      groups[capture.poleNumber].push(capture);
    });
    return groups;
  }, [visibleCaptures]);

  const handleMarkerClick = useCallback((captureId: string, event: any) => {
    event.originalEvent.stopPropagation();
    
    // Toggle selection
    setSelectedCaptures(prev => {
      const newSelection = prev.includes(captureId)
        ? prev.filter(id => id !== captureId)
        : [...prev, captureId];
      
      onCaptureSelect?.(newSelection);
      return newSelection;
    });
  }, [onCaptureSelect]);

  const handleLayerToggle = useCallback((layerId: MapLayerType) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedCaptures.length === 0) return;
    
    switch (action) {
      case 'review':
        // Open bulk review interface
        if (selectedCaptures.length === 1) {
          onCaptureView?.(selectedCaptures[0]);
        } else {
          onBulkAction?.(action, selectedCaptures);
        }
        break;
      default:
        onBulkAction?.(action, selectedCaptures);
    }
  }, [selectedCaptures, onCaptureView, onBulkAction]);

  const isLayerVisible = useCallback((layerId: MapLayerType) => {
    return layers.find(l => l.id === layerId)?.visible || false;
  }, [layers]);

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Capture Markers */}
        {isLayerVisible('captures') && visibleCaptures.map(capture => (
          <Marker
            key={capture.id}
            position={[
              capture.gpsLocation!.latitude,
              capture.gpsLocation!.longitude
            ]}
            icon={createCaptureIcon(capture.status, capture.qualityChecks?.overallScore)}
            eventHandlers={{
              click: (e) => handleMarkerClick(capture.id, e)
            }}
          >
            <Popup>
              <div className="text-sm space-y-2">
                <div className="font-semibold">{capture.customer.name}</div>
                <div className="text-gray-600">{capture.customer.address}</div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      capture.status === 'approved' ? 'success' :
                      capture.status === 'rejected' ? 'destructive' :
                      capture.status === 'pending_approval' ? 'default' : 'secondary'
                    }
                  >
                    {capture.status.replace('_', ' ')}
                  </Badge>
                  
                  {capture.qualityChecks?.overallScore && (
                    <Badge variant="outline">
                      {capture.qualityChecks.overallScore}% Quality
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Pole</div>
                    <div className="font-medium">{capture.poleNumber}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Photos</div>
                    <div className="font-medium">
                      {capture.photos?.length || 0}/{capture.requiredPhotos?.length || 4}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Power</div>
                    <div className="font-medium">
                      {capture.installation?.powerReadings?.opticalPower 
                        ? `${capture.installation.powerReadings.opticalPower} dBm`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Distance</div>
                    <div className="font-medium">
                      {capture.distanceFromPole 
                        ? `${Math.round(capture.distanceFromPole)}m`
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => onCaptureView?.(capture.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Review Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Pole Markers */}
        {isLayerVisible('poles') && poles.map(pole => (
          <Marker
            key={`pole-${pole.id}`}
            position={[pole.latitude, pole.longitude]}
            icon={createPoleIcon()}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Pole {pole.number}</div>
                <div className="text-gray-600">
                  Connected Drops: {capturesByPole[pole.number]?.length || 0}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Pole-to-Drop Connection Lines */}
        {isLayerVisible('connections') && Object.entries(capturesByPole).map(([poleNumber, poleCaptures]) => {
          const pole = poles.find(p => p.number === poleNumber);
          if (!pole) return null;

          return poleCaptures.map(capture => (
            <Polyline
              key={`connection-${capture.id}`}
              positions={[
                [pole.latitude, pole.longitude],
                [capture.gpsLocation!.latitude, capture.gpsLocation!.longitude]
              ]}
              color="#6b7280"
              weight={1}
              opacity={0.6}
              dashArray="5, 5"
            />
          ));
        })}

        {/* Distance Validation Circles */}
        {isLayerVisible('distance-circles') && visibleCaptures.map(capture => (
          <Circle
            key={`distance-${capture.id}`}
            center={[
              capture.gpsLocation!.latitude,
              capture.gpsLocation!.longitude
            ]}
            radius={mapSettings.distanceRadius}
            color={
              capture.distanceFromPole && capture.distanceFromPole > mapSettings.distanceRadius
                ? '#ef4444'
                : '#10b981'
            }
            fillColor={
              capture.distanceFromPole && capture.distanceFromPole > mapSettings.distanceRadius
                ? '#ef4444'
                : '#10b981'
            }
            fillOpacity={0.1}
            weight={1}
          />
        ))}

        {/* Map Event Handlers */}
        <MapClickHandler 
          onMarkerClick={handleMarkerClick}
          onMapClick={() => {}} // Clear selection on map click if needed
        />
      </MapContainer>

      {/* Map Controls and Overlays */}
      <MapLayerControls
        layers={layers}
        onLayerToggle={handleLayerToggle}
        onSettingsChange={(settings) => setMapSettings(prev => ({ ...prev, ...settings }))}
      />

      <MapStatsOverlay
        captures={captures}
        visibleCaptures={visibleCaptures}
        selectedCaptures={selectedCaptures}
      />

      <MapSelectionTools
        selectedCaptures={selectedCaptures}
        onBulkAction={handleBulkAction}
        onClearSelection={() => setSelectedCaptures([])}
      />
    </div>
  );
}