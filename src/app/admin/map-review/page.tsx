'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Map, 
  MapPin, 
  Filter, 
  Search, 
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  CheckCircle,
  XCircle,
  Clock,
  Camera
} from 'lucide-react';

export default function MapReviewPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for map markers
  const captureLocations = [
    { id: '1', lat: 40.7128, lng: -74.0060, status: 'approved', address: '123 Main St', captureId: 'HD-001' },
    { id: '2', lat: 40.7589, lng: -73.9851, status: 'pending', address: '456 Park Ave', captureId: 'HD-002' },
    { id: '3', lat: 40.7505, lng: -73.9934, status: 'rejected', address: '789 Broadway', captureId: 'HD-003' },
    { id: '4', lat: 40.7282, lng: -73.7949, status: 'in_review', address: '321 Oak St', captureId: 'HD-004' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'in_review': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'in_review': return <Camera className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const statsData = {
    total: captureLocations.length,
    approved: captureLocations.filter(c => c.status === 'approved').length,
    pending: captureLocations.filter(c => c.status === 'pending').length,
    rejected: captureLocations.filter(c => c.status === 'rejected').length,
    inReview: captureLocations.filter(c => c.status === 'in_review').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Geographic View</h1>
          <p className="text-gray-600 mt-1">Map-based installation review interface</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Layers className="w-4 h-4 mr-2" />
            Layers
          </Button>
          <Button variant="outline" size="sm">
            <Navigation className="w-4 h-4 mr-2" />
            Center Map
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statsData.total}</div>
            <div className="text-sm text-gray-600">Total Locations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statsData.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statsData.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statsData.inReview}</div>
            <div className="text-sm text-gray-600">In Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statsData.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by address or capture ID..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="approved">Approved Only</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Installation Locations
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="sm">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Placeholder for actual map component */}
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Map Component</h3>
                <p className="text-sm text-gray-500">
                  Interactive map showing all installation locations would be displayed here.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Integration with mapping service (Google Maps, Mapbox, etc.) required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location List */}
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {captureLocations.map((location) => (
                <div key={location.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {location.captureId}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          className={`text-white text-xs ${getStatusColor(location.status)}`}
                        >
                          {location.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{location.address}</p>
                      <p className="text-xs text-gray-500">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {getStatusIcon(location.status)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Map Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Approved Installations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span>Pending Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Currently Reviewing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span>Rejected/Issues</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}