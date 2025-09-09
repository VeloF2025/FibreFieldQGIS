'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation,
  Layers,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Home,
  Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MapLayer {
  id: string;
  name: string;
  type: 'poles' | 'home-drops' | 'assignments' | 'routes';
  visible: boolean;
  count: number;
  color: string;
}

interface MapStats {
  totalPoles: number;
  completedDrops: number;
  pendingAssignments: number;
  activeRoutes: number;
}

export default function MapPage() {
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([
    { id: 'poles', name: 'Poles', type: 'poles', visible: true, count: 156, color: 'blue' },
    { id: 'home-drops', name: 'Home Drops', type: 'home-drops', visible: true, count: 89, color: 'green' },
    { id: 'assignments', name: 'Assignments', type: 'assignments', visible: true, count: 12, color: 'orange' },
    { id: 'routes', name: 'Navigation Routes', type: 'routes', visible: false, count: 3, color: 'purple' }
  ]);

  const [mapStats, setMapStats] = useState<MapStats>({
    totalPoles: 156,
    completedDrops: 89,
    pendingAssignments: 12,
    activeRoutes: 3
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const toggleLayerVisibility = (layerId: string) => {
    setMapLayers(layers => 
      layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    );
  };

  const getLayerIcon = (type: MapLayer['type']) => {
    switch (type) {
      case 'poles':
        return <Zap className="h-4 w-4" />;
      case 'home-drops':
        return <Home className="h-4 w-4" />;
      case 'assignments':
        return <Users className="h-4 w-4" />;
      case 'routes':
        return <Navigation className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLayerColorClass = (color: string, visible: boolean) => {
    const opacity = visible ? '' : 'opacity-50';
    switch (color) {
      case 'blue':
        return `bg-blue-100 text-blue-800 ${opacity}`;
      case 'green':
        return `bg-green-100 text-green-800 ${opacity}`;
      case 'orange':
        return `bg-orange-100 text-orange-800 ${opacity}`;
      case 'purple':
        return `bg-purple-100 text-purple-800 ${opacity}`;
      default:
        return `bg-gray-100 text-gray-800 ${opacity}`;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Field Map</h1>
        <p className="text-gray-600">Interactive map showing poles, home drops, and field assignments</p>
      </div>

      {/* Map Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{mapStats.totalPoles}</div>
            <div className="text-sm text-gray-600">Total Poles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Home className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{mapStats.completedDrops}</div>
            <div className="text-sm text-gray-600">Completed Drops</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{mapStats.pendingAssignments}</div>
            <div className="text-sm text-gray-600">Pending Assignments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Navigation className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{mapStats.activeRoutes}</div>
            <div className="text-sm text-gray-600">Active Routes</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Map Controls Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search poles, addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </CardContent>
          </Card>

          {/* Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mapLayers.map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    selectedLayer === layer.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedLayer(selectedLayer === layer.id ? null : layer.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getLayerIcon(layer.type)}
                      <span className="font-medium">{layer.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getLayerColorClass(layer.color, layer.visible)}>
                      {layer.count}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Map Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Map Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Import GeoPackage
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Navigation className="h-4 w-4 mr-2" />
                Plan Route
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Map Area */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center relative">
                {/* Map Placeholder */}
                <div className="text-center">
                  <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Interactive Map</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This interactive map will display poles, home drops, assignments, and navigation routes.
                    Integration with mapping libraries like Leaflet or MapBox coming soon.
                  </p>
                  
                  {/* Layer Legend */}
                  <div className="mt-6 p-4 bg-white rounded-lg shadow-sm max-w-sm mx-auto">
                    <h4 className="font-medium text-gray-900 mb-3">Active Layers</h4>
                    <div className="space-y-2 text-sm">
                      {mapLayers.filter(layer => layer.visible).map((layer) => (
                        <div key={layer.id} className="flex items-center gap-2">
                          {getLayerIcon(layer.type)}
                          <span>{layer.name}</span>
                          <Badge className={getLayerColorClass(layer.color, true)}>
                            {layer.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Map Controls Overlay */}
                <div className="absolute top-4 right-4 space-y-2">
                  <Button size="sm" variant="secondary" className="bg-white shadow-md">
                    <Navigation className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white shadow-md">
                    +
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white shadow-md">
                    -
                  </Button>
                </div>

                {/* Current Location Button */}
                <div className="absolute bottom-4 right-4">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-md">
                    <MapPin className="h-4 w-4 mr-2" />
                    My Location
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Layer Info */}
          {selectedLayer && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getLayerIcon(mapLayers.find(l => l.id === selectedLayer)?.type || 'poles')}
                  {mapLayers.find(l => l.id === selectedLayer)?.name} Layer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {mapLayers.find(l => l.id === selectedLayer)?.count}
                    </div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.floor((mapLayers.find(l => l.id === selectedLayer)?.count || 0) * 0.8)}
                    </div>
                    <div className="text-sm text-gray-600">Visible on Map</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.floor((mapLayers.find(l => l.id === selectedLayer)?.count || 0) * 0.1)}
                    </div>
                    <div className="text-sm text-gray-600">Needs Update</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}