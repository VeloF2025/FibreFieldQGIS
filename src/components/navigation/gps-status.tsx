/**
 * GPS Status Component for FibreField Navigation
 * 
 * Features:
 * - Real-time GPS accuracy display
 * - Signal strength indicators
 * - Battery usage optimization controls
 * - Connection status monitoring
 * - Touch-optimized controls for field use
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  Signal, 
  Battery, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Target,
  Settings,
  RefreshCw,
  Power
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { gpsService, type GPSPosition, type GPSError } from '@/services/gps.service';

/**
 * GPS Signal Strength Component
 */
function GPSSignalStrength({ accuracy, className }: { 
  accuracy: number; 
  className?: string; 
}) {
  // Convert accuracy to signal strength (lower accuracy = higher strength)
  let strength: 'excellent' | 'good' | 'fair' | 'poor';
  let strengthValue: number;
  
  if (accuracy <= 3) {
    strength = 'excellent';
    strengthValue = 100;
  } else if (accuracy <= 8) {
    strength = 'good';
    strengthValue = 75;
  } else if (accuracy <= 15) {
    strength = 'fair';
    strengthValue = 50;
  } else {
    strength = 'poor';
    strengthValue = 25;
  }

  const colors = {
    excellent: 'text-green-600 bg-green-100',
    good: 'text-blue-600 bg-blue-100',
    fair: 'text-yellow-600 bg-yellow-100',
    poor: 'text-red-600 bg-red-100'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('p-1 rounded-full', colors[strength])}>
        <Signal className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium capitalize">{strength}</span>
          <span className="text-xs text-gray-600">±{gpsService.formatAccuracy(accuracy)}</span>
        </div>
        <Progress value={strengthValue} className="h-2" />
      </div>
    </div>
  );
}

/**
 * GPS Coordinates Display
 */
function GPSCoordinatesDisplay({ position, className }: { 
  position: GPSPosition; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-gray-600 font-medium">Latitude</div>
          <div className="font-mono">{position.latitude.toFixed(6)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-medium">Longitude</div>
          <div className="font-mono">{position.longitude.toFixed(6)}</div>
        </div>
      </div>
      
      {(position.altitude !== null && position.altitude !== undefined) && (
        <div>
          <div className="text-xs text-gray-600 font-medium">Altitude</div>
          <div className="font-mono">{position.altitude.toFixed(1)}m</div>
        </div>
      )}

      {(position.speed !== null && position.speed !== undefined && position.speed > 0) && (
        <div>
          <div className="text-xs text-gray-600 font-medium">Speed</div>
          <div className="font-mono">{(position.speed * 3.6).toFixed(1)} km/h</div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Last update: {new Date(position.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

/**
 * Battery Optimization Settings
 */
function BatteryOptimizationSettings({ 
  isOptimized, 
  onToggle, 
  className 
}: { 
  isOptimized: boolean; 
  onToggle: (optimized: boolean) => void; 
  className?: string; 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">Battery Optimization</span>
        </div>
        <Switch checked={isOptimized} onCheckedChange={onToggle} />
      </div>
      
      <div className="text-xs text-gray-600 pl-6">
        {isOptimized 
          ? 'GPS updates less frequently to save battery'
          : 'GPS updates frequently for best accuracy'
        }
      </div>

      <div className="bg-gray-50 p-3 rounded-lg text-xs">
        <div className="font-medium mb-1">Optimization Effects:</div>
        <ul className="space-y-1 text-gray-600">
          <li>• Update interval: {isOptimized ? '10s' : '1s'}</li>
          <li>• Accuracy: {isOptimized ? 'Standard' : 'High'}</li>
          <li>• Battery impact: {isOptimized ? 'Low' : 'High'}</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * GPS Status Props
 */
interface GPSStatusProps {
  compact?: boolean;
  showCoordinates?: boolean;
  showBatterySettings?: boolean;
  showRefreshButton?: boolean;
  onLocationUpdate?: (position: GPSPosition) => void;
  className?: string;
}

/**
 * Main GPS Status Component
 */
export function GPSStatus({
  compact = false,
  showCoordinates = true,
  showBatterySettings = true,
  showRefreshButton = true,
  onLocationUpdate,
  className
}: GPSStatusProps) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<GPSError | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [batteryOptimized, setBatteryOptimized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to GPS service
  useEffect(() => {
    const positionSubscription = gpsService.position$.subscribe((pos) => {
      setPosition(pos);
      if (pos && onLocationUpdate) {
        onLocationUpdate(pos);
      }
    });

    const errorSubscription = gpsService.error$.subscribe(setError);
    const watchingSubscription = gpsService.watching$.subscribe(setIsWatching);

    return () => {
      positionSubscription.unsubscribe();
      errorSubscription.unsubscribe();
      watchingSubscription.unsubscribe();
    };
  }, [onLocationUpdate]);

  // Handle GPS start/stop
  const handleToggleGPS = async () => {
    try {
      if (isWatching) {
        gpsService.stopWatching();
      } else {
        const options = {
          enableHighAccuracy: !batteryOptimized,
          maximumAge: batteryOptimized ? 10000 : 5000,
          timeout: 30000
        };
        gpsService.startWatching(options);
      }
    } catch (error) {
      log.error('GPS toggle error:', {}, "Gpsstatus", error);
    }
  };

  // Handle manual refresh
  const handleRefreshLocation = async () => {
    try {
      setIsRefreshing(true);
      await gpsService.getCurrentPosition({
        enableHighAccuracy: !batteryOptimized,
        maximumAge: 0, // Force fresh reading
        timeout: 15000
      });
    } catch (error) {
      log.error('GPS refresh error:', {}, "Gpsstatus", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle battery optimization toggle
  const handleBatteryOptimizationToggle = (optimized: boolean) => {
    setBatteryOptimized(optimized);
    
    // Restart GPS watching with new settings if active
    if (isWatching) {
      gpsService.stopWatching();
      setTimeout(() => {
        const options = {
          enableHighAccuracy: !optimized,
          maximumAge: optimized ? 10000 : 5000,
          timeout: 30000
        };
        gpsService.startWatching(options);
      }, 100);
    }
  };

  // Compact view for small spaces
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          variant={isWatching ? "default" : "outline"}
          onClick={handleToggleGPS}
          disabled={isRefreshing}
        >
          {isWatching ? <Target className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
        </Button>
        
        {position ? (
          <Badge variant="success" className="text-xs">
            <Signal className="w-3 h-3 mr-1" />
            ±{gpsService.formatAccuracy(position.accuracy)}
          </Badge>
        ) : error ? (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Waiting
          </Badge>
        )}
      </div>
    );
  }

  // Full GPS status view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">GPS Status</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {showRefreshButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefreshLocation}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </Button>
            )}
            <Button
              size="sm"
              variant={isWatching ? "default" : "outline"}
              onClick={handleToggleGPS}
              disabled={isRefreshing}
            >
              <Power className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection</span>
          {isWatching ? (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              Inactive
            </Badge>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">GPS Error</span>
            </div>
            <div className="text-xs text-red-600">{error.message}</div>
          </div>
        )}

        {/* Position Information */}
        {position && (
          <div className="space-y-3">
            {/* Signal Strength */}
            <GPSSignalStrength accuracy={position.accuracy} />
            
            {/* Coordinates */}
            {showCoordinates && (
              <div>
                <div className="text-sm font-medium mb-2">Coordinates</div>
                <GPSCoordinatesDisplay position={position} />
              </div>
            )}

            {/* Accuracy Info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {gpsService.formatAccuracy(position.accuracy)}
                  </div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {gpsService.isAccuracyAcceptable(position.accuracy, 10) ? '✓' : '⚠'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {gpsService.isAccuracyAcceptable(position.accuracy, 10) ? 'Acceptable' : 'Poor'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Position Message */}
        {!position && !error && isWatching && (
          <div className="text-center py-4 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-sm">Acquiring GPS signal...</div>
          </div>
        )}

        {/* Not Active Message */}
        {!isWatching && (
          <div className="text-center py-4 text-gray-500">
            <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">GPS is not active</div>
            <div className="text-xs">Tap the power button to start</div>
          </div>
        )}

        {/* Battery Optimization Settings */}
        {showBatterySettings && (
          <div>
            <div className="text-sm font-medium mb-3">Settings</div>
            <BatteryOptimizationSettings
              isOptimized={batteryOptimized}
              onToggle={handleBatteryOptimizationToggle}
            />
          </div>
        )}

        {/* GPS Status Info */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <div>Requires location permissions</div>
            <div>Works offline</div>
            <div>Battery usage: {batteryOptimized ? 'Low' : 'High'}</div>
            <div>Update rate: {batteryOptimized ? '10s' : '1s'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}