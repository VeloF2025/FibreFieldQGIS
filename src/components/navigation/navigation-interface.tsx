/**
 * Navigation Interface for FibreField Home Drop Field Workers
 * 
 * Features:
 * - Turn-by-turn navigation display
 * - GPS positioning with accuracy indicators
 * - Distance calculation and proximity alerts
 * - Route optimization for multiple assignments
 * - Touch-optimized mobile interface
 * - Battery-optimized GPS usage controls
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  Target, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  RotateCcw,
  Battery,
  Signal,
  Compass,
  Play,
  Square,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { InteractiveMap } from '@/components/mapping/interactive-map';
import { 
  navigationService, 
  type NavigationStatus, 
  type NavigationInstruction, 
  type ProximityAlert,
  type NavigationOptions 
} from '@/services/navigation/navigation.service';
import { gpsService, type GPSPosition } from '@/services/gps.service';
import type { HomeDropAssignment } from '@/types/home-drop.types';

/**
 * Turn Direction Icon Component
 */
function TurnDirectionIcon({ instruction }: { instruction: NavigationInstruction }) {
  const iconProps = { className: "w-6 h-6", strokeWidth: 2 };
  
  switch (instruction.type) {
    case 'start':
      return <Play {...iconProps} className="text-green-500" />;
    case 'turn-left':
      return <ArrowLeft {...iconProps} className="text-blue-500" />;
    case 'turn-right':
      return <ArrowRight {...iconProps} className="text-blue-500" />;
    case 'straight':
      return <ArrowUp {...iconProps} className="text-blue-500" />;
    case 'arrive':
      return <Target {...iconProps} className="text-red-500" />;
    default:
      return <Navigation {...iconProps} className="text-gray-500" />;
  }
}

/**
 * GPS Accuracy Indicator Component
 */
function GPSAccuracyIndicator({ position, className }: { 
  position: GPSPosition | null; 
  className?: string; 
}) {
  if (!position) {
    return (
      <Badge variant="destructive" className={className}>
        <Signal className="w-3 h-3 mr-1" />
        No GPS
      </Badge>
    );
  }

  const isAccurate = gpsService.isAccuracyAcceptable(position.accuracy, 10);
  const accuracyText = gpsService.formatAccuracy(position.accuracy);

  return (
    <Badge 
      variant={isAccurate ? "success" : "secondary"} 
      className={cn("text-xs", className)}
    >
      <Signal className="w-3 h-3 mr-1" />
      ±{accuracyText}
    </Badge>
  );
}

/**
 * Proximity Alert Component
 */
function ProximityAlertDisplay({ alerts, onDismiss }: { 
  alerts: ProximityAlert[]; 
  onDismiss: (alertId: string) => void; 
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-20">
      {alerts.map((alert) => (
        <Card key={alert.homeDropId} className="mb-2 bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="font-medium text-sm">Proximity Alert</div>
                  <div className="text-xs text-gray-600">
                    Within {alert.distance}m of destination
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onDismiss(alert.homeDropId)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Navigation Settings Panel
 */
function NavigationSettings({ 
  options, 
  onOptionsChange, 
  isVisible, 
  onClose 
}: {
  options: NavigationOptions;
  onOptionsChange: (options: NavigationOptions) => void;
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-end">
      <Card className="w-full rounded-b-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Navigation Settings</CardTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Proximity Alert Distance */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Proximity Alert Distance: {options.proximityAlertDistance || 50}m
            </label>
            <Slider
              value={[options.proximityAlertDistance || 50]}
              onValueChange={([value]) => 
                onOptionsChange({ ...options, proximityAlertDistance: value })
              }
              min={10}
              max={200}
              step={10}
              className="w-full"
            />
          </div>

          {/* Route Optimization */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Route Optimization</div>
              <div className="text-xs text-gray-600">
                Automatically optimize multi-stop routes
              </div>
            </div>
            <Switch
              checked={options.routeOptimization !== false}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, routeOptimization: checked })
              }
            />
          </div>

          {/* Walking Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Walking Mode</div>
              <div className="text-xs text-gray-600">
                Optimize for pedestrian navigation
              </div>
            </div>
            <Switch
              checked={options.walkingMode || false}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, walkingMode: checked })
              }
            />
          </div>

          {/* Battery Optimized */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Battery Optimized</div>
              <div className="text-xs text-gray-600">
                Reduce GPS accuracy to save battery
              </div>
            </div>
            <Switch
              checked={options.batteryOptimized || false}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, batteryOptimized: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Navigation Interface Props
 */
interface NavigationInterfaceProps {
  assignments: HomeDropAssignment[];
  onAssignmentSelect?: (assignment: HomeDropAssignment) => void;
  onNavigationComplete?: (assignmentId: string) => void;
  showMap?: boolean;
  className?: string;
}

/**
 * Main Navigation Interface Component
 */
export function NavigationInterface({
  assignments = [],
  onAssignmentSelect,
  onNavigationComplete,
  showMap = true,
  className
}: NavigationInterfaceProps) {
  // State
  const [navigationStatus, setNavigationStatus] = useState<NavigationStatus | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [proximityAlerts, setProximityAlerts] = useState<ProximityAlert[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<HomeDropAssignment | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [navigationOptions, setNavigationOptions] = useState<NavigationOptions>({
    proximityAlertDistance: 50,
    routeOptimization: true,
    walkingMode: false,
    batteryOptimized: false
  });

  // Subscribe to navigation service
  useEffect(() => {
    const statusSubscription = navigationService.status$.subscribe(setNavigationStatus);
    const alertsSubscription = navigationService.activeAlerts$.subscribe(setProximityAlerts);
    
    return () => {
      statusSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, []);

  // Subscribe to GPS service
  useEffect(() => {
    const positionSubscription = gpsService.position$.subscribe(setCurrentPosition);
    return () => positionSubscription.unsubscribe();
  }, []);

  // Handle start navigation
  const handleStartNavigation = useCallback(async (assignment: HomeDropAssignment) => {
    try {
      setSelectedAssignment(assignment);
      await navigationService.startNavigation(assignment, navigationOptions);
      onAssignmentSelect?.(assignment);
    } catch (error) {
      log.error('Failed to start navigation:', {}, "Navigationinterface", error);
    }
  }, [navigationOptions, onAssignmentSelect]);

  // Handle start multi-assignment navigation
  const handleStartMultiNavigation = useCallback(async () => {
    try {
      await navigationService.startMultiAssignmentNavigation(assignments, navigationOptions);
    } catch (error) {
      log.error('Failed to start multi-assignment navigation:', {}, "Navigationinterface", error);
    }
  }, [assignments, navigationOptions]);

  // Handle stop navigation
  const handleStopNavigation = useCallback(() => {
    navigationService.stopNavigation();
    setSelectedAssignment(null);
  }, []);

  // Handle proximity alert dismissal
  const handleDismissProximityAlert = useCallback((homeDropId: string) => {
    navigationService.clearProximityAlert(homeDropId);
  }, []);

  // Handle assignment completion
  const handleCompleteAssignment = useCallback(() => {
    if (selectedAssignment) {
      onNavigationComplete?.(selectedAssignment.id);
      handleStopNavigation();
    }
  }, [selectedAssignment, onNavigationComplete, handleStopNavigation]);

  return (
    <div className={cn('navigation-interface space-y-4', className)}>
      {/* Proximity Alerts */}
      <ProximityAlertDisplay 
        alerts={proximityAlerts}
        onDismiss={handleDismissProximityAlert}
      />

      {/* Navigation Status Card */}
      {navigationStatus?.isNavigating && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">Navigation Active</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <GPSAccuracyIndicator position={currentPosition} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {navigationStatus.currentDestination && (
              <div className="space-y-4">
                {/* Destination Info */}
                <div>
                  <div className="font-medium text-lg">
                    {navigationStatus.currentDestination.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {navigationStatus.currentDestination.address}
                  </div>
                </div>

                {/* Distance and ETA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {gpsService.formatDistance(navigationStatus.distanceToDestination)}
                    </div>
                    <div className="text-xs text-gray-600">Distance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(navigationStatus.timeToDestination / 60)}min
                    </div>
                    <div className="text-xs text-gray-600">ETA</div>
                  </div>
                </div>

                {/* Current Instruction */}
                {navigationStatus.currentInstruction && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TurnDirectionIcon instruction={navigationStatus.currentInstruction} />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {navigationStatus.currentInstruction.instruction}
                          </div>
                          {navigationStatus.distanceToNextTurn > 0 && (
                            <div className="text-xs text-gray-600">
                              in {gpsService.formatDistance(navigationStatus.distanceToNextTurn)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Instruction */}
                {navigationStatus.nextInstruction && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Next:</div>
                    <div className="flex items-center gap-2">
                      <TurnDirectionIcon instruction={navigationStatus.nextInstruction} />
                      <div className="text-sm">
                        {navigationStatus.nextInstruction.instruction}
                      </div>
                    </div>
                  </div>
                )}

                {/* Route Status */}
                <div className="flex items-center justify-between text-sm">
                  <Badge variant={navigationStatus.isOnRoute ? "success" : "destructive"}>
                    {navigationStatus.isOnRoute ? "On Route" : "Off Route"}
                  </Badge>
                  {navigationStatus.routeDeviation > 10 && (
                    <Badge variant="outline">
                      {gpsService.formatDistance(navigationStatus.routeDeviation)} off route
                    </Badge>
                  )}
                </div>

                {/* Navigation Controls */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCompleteAssignment}
                    className="flex-1"
                    variant="default"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Assignment
                  </Button>
                  <Button 
                    onClick={handleStopNavigation}
                    variant="outline"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignment Selection (when not navigating) */}
      {!navigationStatus?.isNavigating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Select Assignment</CardTitle>
              <div className="flex items-center gap-2">
                <GPSAccuracyIndicator position={currentPosition} />
                <Badge variant="outline">
                  {assignments.length} assignments
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div>No assignments available</div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Multi-assignment navigation */}
                {assignments.length > 1 && (
                  <Button 
                    onClick={handleStartMultiNavigation}
                    className="w-full"
                    variant="default"
                  >
                    <Route className="w-4 h-4 mr-2" />
                    Navigate All ({assignments.length} stops)
                  </Button>
                )}

                {/* Individual assignments */}
                <div className="space-y-2">
                  {assignments.slice(0, 5).map((assignment) => (
                    <Card key={assignment.id} className="hover:bg-gray-50 cursor-pointer">
                      <CardContent 
                        className="p-3"
                        onClick={() => handleStartNavigation(assignment)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {assignment.customer.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {assignment.customer.address}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Pole: {assignment.poleNumber}
                              </Badge>
                              <Badge 
                                variant={assignment.priority === 'high' ? 'destructive' : 'default'}
                                className="text-xs"
                              >
                                {assignment.priority}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentPosition && assignment.customer.location && (
                              <Badge variant="secondary" className="text-xs">
                                {gpsService.formatDistance(
                                  gpsService.calculateDistance(
                                    currentPosition.latitude,
                                    currentPosition.longitude,
                                    assignment.customer.location.latitude,
                                    assignment.customer.location.longitude
                                  )
                                )}
                              </Badge>
                            )}
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {assignments.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    ... and {assignments.length - 5} more assignments
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {showMap && (
        <Card>
          <CardContent className="p-0">
            <InteractiveMap
              assignments={assignments}
              height="400px"
              showNavigation={true}
              showGPSTracker={true}
              showLayerToggle={true}
              onMarkerClick={(type, id) => {
                if (type === 'assignment') {
                  const assignment = assignments.find(a => a.id === id);
                  if (assignment) {
                    handleStartNavigation(assignment);
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation Settings */}
      <NavigationSettings
        options={navigationOptions}
        onOptionsChange={setNavigationOptions}
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}