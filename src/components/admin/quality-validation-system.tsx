/**
 * Quality Validation System
 * 
 * Comprehensive quality assessment system for home drop installations.
 * Features:
 * - Standardized quality checklists
 * - Automated validation rules
 * - Photo quality analysis
 * - Technical specifications validation
 * - Custom quality standards configuration
 * - Performance metrics tracking
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Star, 
  Settings, 
  Eye,
  Camera,
  Zap,
  Signal,
  MapPin,
  Clock,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  Shield,
  Award,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { 
  HomeDropCapture, 
  HomeDropPhoto,
  HomeDropPhotoType 
} from '@/types/home-drop.types';
import { cn } from '@/lib/utils';

/**
 * Quality Check Item Interface
 */
interface QualityCheckItem {
  id: string;
  category: 'installation' | 'photos' | 'technical' | 'documentation' | 'customer';
  name: string;
  description: string;
  weight: number; // 1-10, importance weighting
  required: boolean;
  automated?: boolean; // Can be automatically validated
  validator?: (capture: HomeDropCapture) => { passed: boolean; message?: string };
}

/**
 * Quality Standards Configuration
 */
interface QualityStandards {
  minimumOverallScore: number;
  requiredChecks: string[];
  photoStandards: {
    [K in HomeDropPhotoType]: {
      minResolution?: { width: number; height: number };
      maxFileSize?: number;
      qualityThreshold: number;
      required: boolean;
    }
  };
  technicalStandards: {
    opticalPower: { min: number; max: number };
    signalStrength: { min: number };
    linkQuality: { min: number };
    maxDistanceFromPole: number;
  };
}

/**
 * Default Quality Standards
 */
const DEFAULT_QUALITY_STANDARDS: QualityStandards = {
  minimumOverallScore: 80,
  requiredChecks: [
    'power-level-check',
    'photos-complete',
    'customer-verified',
    'service-active'
  ],
  photoStandards: {
    'power-meter-test': {
      minResolution: { width: 1024, height: 768 },
      maxFileSize: 5 * 1024 * 1024,
      qualityThreshold: 75,
      required: true
    },
    'fibertime-setup-confirmation': {
      minResolution: { width: 800, height: 600 },
      maxFileSize: 3 * 1024 * 1024,
      qualityThreshold: 70,
      required: true
    },
    'fibertime-device-actions': {
      minResolution: { width: 800, height: 600 },
      maxFileSize: 3 * 1024 * 1024,
      qualityThreshold: 70,
      required: true
    },
    'router-4-lights-status': {
      minResolution: { width: 1024, height: 768 },
      maxFileSize: 5 * 1024 * 1024,
      qualityThreshold: 80,
      required: true
    }
  },
  technicalStandards: {
    opticalPower: { min: -30, max: -8 },
    signalStrength: { min: 70 },
    linkQuality: { min: 80 },
    maxDistanceFromPole: 500
  }
};

/**
 * Quality Check Items Configuration
 */
const QUALITY_CHECK_ITEMS: QualityCheckItem[] = [
  // Installation Category
  {
    id: 'power-level-check',
    category: 'technical',
    name: 'Optical Power Level',
    description: 'Power reading within acceptable range (-30 to -8 dBm)',
    weight: 10,
    required: true,
    automated: true,
    validator: (capture) => {
      const power = capture.installation?.powerReadings?.opticalPower;
      if (power === undefined) {
        return { passed: false, message: 'No power reading recorded' };
      }
      const inRange = power >= -30 && power <= -8;
      return { 
        passed: inRange, 
        message: inRange ? `Power level: ${power} dBm` : `Power level ${power} dBm is outside acceptable range` 
      };
    }
  },
  {
    id: 'signal-strength-check',
    category: 'technical',
    name: 'Signal Strength',
    description: 'Signal strength above 70%',
    weight: 8,
    required: false,
    automated: true,
    validator: (capture) => {
      const strength = capture.installation?.powerReadings?.signalStrength;
      if (strength === undefined) {
        return { passed: false, message: 'No signal strength recorded' };
      }
      const acceptable = strength >= 70;
      return { 
        passed: acceptable, 
        message: acceptable ? `Signal strength: ${strength}%` : `Signal strength ${strength}% is below threshold` 
      };
    }
  },
  {
    id: 'photos-complete',
    category: 'photos',
    name: 'All Required Photos',
    description: 'All 4 required photo types captured',
    weight: 9,
    required: true,
    automated: true,
    validator: (capture) => {
      const requiredTypes = capture.requiredPhotos || [];
      const completedTypes = capture.completedPhotos || [];
      const missingTypes = requiredTypes.filter(type => !completedTypes.includes(type));
      return { 
        passed: missingTypes.length === 0,
        message: missingTypes.length === 0 ? 'All photos complete' : `Missing photos: ${missingTypes.join(', ')}`
      };
    }
  },
  {
    id: 'photo-quality',
    category: 'photos',
    name: 'Photo Quality Standards',
    description: 'Photos meet resolution and clarity requirements',
    weight: 7,
    required: true,
    automated: true,
    validator: (capture) => {
      const photos = capture.photos || [];
      const lowQualityPhotos = photos.filter(photo => {
        if (!photo.resolution) return true;
        const standards = DEFAULT_QUALITY_STANDARDS.photoStandards[photo.type];
        if (!standards.minResolution) return false;
        return photo.resolution.width < standards.minResolution.width || 
               photo.resolution.height < standards.minResolution.height;
      });
      
      return {
        passed: lowQualityPhotos.length === 0,
        message: lowQualityPhotos.length === 0 ? 'All photos meet quality standards' : `${lowQualityPhotos.length} photos below quality threshold`
      };
    }
  },
  {
    id: 'customer-verified',
    category: 'customer',
    name: 'Customer Information Verified',
    description: 'Customer details and location confirmed',
    weight: 6,
    required: true,
    automated: true,
    validator: (capture) => {
      const customer = capture.customer;
      const hasName = customer?.name && customer.name.trim().length > 0;
      const hasAddress = customer?.address && customer.address.trim().length > 0;
      const hasLocation = capture.gpsLocation || customer?.location;
      
      const issues = [];
      if (!hasName) issues.push('name');
      if (!hasAddress) issues.push('address');
      if (!hasLocation) issues.push('GPS location');
      
      return {
        passed: issues.length === 0,
        message: issues.length === 0 ? 'Customer information complete' : `Missing: ${issues.join(', ')}`
      };
    }
  },
  {
    id: 'service-active',
    category: 'installation',
    name: 'Service Activation',
    description: 'Internet service tested and active',
    weight: 8,
    required: false,
    automated: true,
    validator: (capture) => {
      const active = capture.installation?.serviceConfig?.activationStatus;
      return {
        passed: Boolean(active),
        message: active ? 'Service is active' : 'Service activation not confirmed'
      };
    }
  },
  {
    id: 'equipment-serial',
    category: 'documentation',
    name: 'Equipment Serial Numbers',
    description: 'ONT and router serial numbers recorded',
    weight: 5,
    required: true,
    automated: true,
    validator: (capture) => {
      const equipment = capture.installation?.equipment;
      const hasONT = equipment?.ontSerialNumber && equipment.ontSerialNumber.trim().length > 0;
      const hasRouter = equipment?.routerSerialNumber && equipment.routerSerialNumber.trim().length > 0;
      
      const missing = [];
      if (!hasONT) missing.push('ONT');
      if (!hasRouter) missing.push('Router');
      
      return {
        passed: missing.length === 0,
        message: missing.length === 0 ? 'All serial numbers recorded' : `Missing serial numbers: ${missing.join(', ')}`
      };
    }
  },
  {
    id: 'pole-distance',
    category: 'installation',
    name: 'Pole Distance Validation',
    description: 'Installation within acceptable distance from pole',
    weight: 4,
    required: false,
    automated: true,
    validator: (capture) => {
      const distance = capture.distanceFromPole;
      if (distance === undefined) {
        return { passed: false, message: 'Distance from pole not calculated' };
      }
      const acceptable = distance <= 500; // meters
      return {
        passed: acceptable,
        message: acceptable 
          ? `Distance: ${Math.round(distance)}m` 
          : `Distance ${Math.round(distance)}m exceeds 500m limit`
      };
    }
  },
  {
    id: 'installation-notes',
    category: 'documentation',
    name: 'Installation Documentation',
    description: 'Technical notes and observations documented',
    weight: 3,
    required: false,
    automated: true,
    validator: (capture) => {
      const hasNotes = capture.notes || capture.technicalNotes;
      const hasSubstantialNotes = hasNotes && hasNotes.trim().length > 10;
      return {
        passed: Boolean(hasSubstantialNotes),
        message: hasSubstantialNotes ? 'Installation documented' : 'Minimal documentation provided'
      };
    }
  }
];

/**
 * Quality Checklist Component
 */
function QualityChecklist({
  capture,
  standards = DEFAULT_QUALITY_STANDARDS,
  onUpdate,
  readOnly = false
}: {
  capture: HomeDropCapture;
  standards?: QualityStandards;
  onUpdate?: (checks: Partial<HomeDropCapture['qualityChecks']>) => void;
  readOnly?: boolean;
}) {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState(capture.qualityChecks?.notes || '');

  // Calculate automated checks
  const checkResults = useMemo(() => {
    const results: Record<string, { passed: boolean; message?: string; automated: boolean }> = {};
    
    QUALITY_CHECK_ITEMS.forEach(item => {
      if (item.automated && item.validator) {
        results[item.id] = { ...item.validator(capture), automated: true };
      } else {
        results[item.id] = { 
          passed: manualChecks[item.id] || false, 
          automated: false 
        };
      }
    });
    
    return results;
  }, [capture, manualChecks]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    let totalWeight = 0;
    let achievedWeight = 0;
    
    QUALITY_CHECK_ITEMS.forEach(item => {
      totalWeight += item.weight;
      if (checkResults[item.id]?.passed) {
        achievedWeight += item.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  }, [checkResults]);

  // Group checks by category
  const checksByCategory = useMemo(() => {
    const grouped: Record<string, QualityCheckItem[]> = {};
    QUALITY_CHECK_ITEMS.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  const handleManualCheckChange = (checkId: string, checked: boolean) => {
    if (readOnly) return;
    
    setManualChecks(prev => ({ ...prev, [checkId]: checked }));
    
    // Update parent component
    if (onUpdate) {
      const updatedChecks = { ...manualChecks, [checkId]: checked };
      const newOverallScore = calculateScoreFromChecks(updatedChecks);
      onUpdate({
        ...capture.qualityChecks,
        overallScore: newOverallScore,
        notes
      });
    }
  };

  const calculateScoreFromChecks = (checks: Record<string, boolean>) => {
    let totalWeight = 0;
    let achievedWeight = 0;
    
    QUALITY_CHECK_ITEMS.forEach(item => {
      totalWeight += item.weight;
      const result = item.automated && item.validator 
        ? item.validator(capture)
        : { passed: checks[item.id] || false };
      
      if (result.passed) {
        achievedWeight += item.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'installation': return <Settings className="w-4 h-4" />;
      case 'photos': return <Camera className="w-4 h-4" />;
      case 'technical': return <Zap className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      case 'customer': return <MapPin className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getCategoryProgress = (category: string) => {
    const items = checksByCategory[category] || [];
    const passed = items.filter(item => checkResults[item.id]?.passed).length;
    return items.length > 0 ? (passed / items.length) * 100 : 0;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Quality Assessment
            </CardTitle>
            <CardDescription>
              Comprehensive installation quality validation
            </CardDescription>
          </div>
          
          <div className="text-right">
            <div className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
              {overallScore}%
            </div>
            <Badge variant={getScoreBadgeVariant(overallScore) as any}>
              {overallScore >= standards.minimumOverallScore ? 'PASS' : 'REVIEW NEEDED'}
            </Badge>
          </div>
        </div>
        
        <Progress value={overallScore} className="mt-2" />
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="checklist">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checklist">Quality Checklist</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>
          
          <TabsContent value="checklist" className="space-y-4">
            <div className="space-y-3">
              {QUALITY_CHECK_ITEMS.map(item => {
                const result = checkResults[item.id];
                const isRequired = standards.requiredChecks.includes(item.id) || item.required;
                
                return (
                  <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="mt-1">
                      {item.automated ? (
                        result?.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )
                      ) : (
                        <Checkbox
                          checked={result?.passed || false}
                          onCheckedChange={(checked) => handleManualCheckChange(item.id, Boolean(checked))}
                          disabled={readOnly}
                        />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium cursor-pointer">
                          {item.name}
                        </Label>
                        {isRequired && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {item.automated && (
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Star className="w-3 h-3 fill-current" />
                          {item.weight}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      
                      {result?.message && (
                        <div className={cn(
                          "text-xs p-2 rounded flex items-center gap-2",
                          result.passed 
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        )}>
                          {result.passed ? (
                            <Info className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          )}
                          {result.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!readOnly && (
              <div className="pt-4 border-t">
                <Label htmlFor="quality-notes">Additional Notes</Label>
                <Textarea
                  id="quality-notes"
                  placeholder="Add any additional quality observations or comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            {Object.entries(checksByCategory).map(([category, items]) => {
              const progress = getCategoryProgress(category);
              const passedCount = items.filter(item => checkResults[item.id]?.passed).length;
              
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <CardTitle className="text-lg capitalize">
                          {category.replace(/([A-Z])/g, ' $1')}
                        </CardTitle>
                      </div>
                      <Badge variant="outline">
                        {passedCount}/{items.length}
                      </Badge>
                    </div>
                    <Progress value={progress} className="mt-2" />
                  </CardHeader>
                  
                  <CardContent className="space-y-2">
                    {items.map(item => {
                      const result = checkResults[item.id];
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {result?.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={result?.passed ? 'text-green-700' : 'text-red-700'}>
                              {item.name}
                            </span>
                          </div>
                          
                          {result?.message && (
                            <span className="text-xs text-gray-500 max-w-xs truncate" title={result.message}>
                              {result.message}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Quality Standards Configuration Component
 */
function QualityStandardsConfig({
  standards,
  onUpdate,
  onReset
}: {
  standards: QualityStandards;
  onUpdate: (standards: Partial<QualityStandards>) => void;
  onReset: () => void;
}) {
  const [editingStandards, setEditingStandards] = useState(standards);

  const handleSave = () => {
    onUpdate(editingStandards);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configure Standards
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Quality Standards Configuration</DialogTitle>
          <DialogDescription>
            Customize quality validation criteria and thresholds
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overall Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Standards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Minimum Overall Score (%)</Label>
                <Slider
                  value={[editingStandards.minimumOverallScore]}
                  onValueChange={([value]) => 
                    setEditingStandards(prev => ({ ...prev, minimumOverallScore: value }))
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Current: {editingStandards.minimumOverallScore}%
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Technical Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Technical Standards</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Optical Power Range (dBm)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={editingStandards.technicalStandards.opticalPower.min}
                    onChange={(e) => 
                      setEditingStandards(prev => ({
                        ...prev,
                        technicalStandards: {
                          ...prev.technicalStandards,
                          opticalPower: {
                            ...prev.technicalStandards.opticalPower,
                            min: Number(e.target.value)
                          }
                        }
                      }))
                    }
                    placeholder="Min"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={editingStandards.technicalStandards.opticalPower.max}
                    onChange={(e) => 
                      setEditingStandards(prev => ({
                        ...prev,
                        technicalStandards: {
                          ...prev.technicalStandards,
                          opticalPower: {
                            ...prev.technicalStandards.opticalPower,
                            max: Number(e.target.value)
                          }
                        }
                      }))
                    }
                    placeholder="Max"
                  />
                </div>
              </div>
              
              <div>
                <Label>Min Signal Strength (%)</Label>
                <Input
                  type="number"
                  value={editingStandards.technicalStandards.signalStrength.min}
                  onChange={(e) => 
                    setEditingStandards(prev => ({
                      ...prev,
                      technicalStandards: {
                        ...prev.technicalStandards,
                        signalStrength: { min: Number(e.target.value) }
                      }
                    }))
                  }
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Min Link Quality (%)</Label>
                <Input
                  type="number"
                  value={editingStandards.technicalStandards.linkQuality.min}
                  onChange={(e) => 
                    setEditingStandards(prev => ({
                      ...prev,
                      technicalStandards: {
                        ...prev.technicalStandards,
                        linkQuality: { min: Number(e.target.value) }
                      }
                    }))
                  }
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Max Distance from Pole (m)</Label>
                <Input
                  type="number"
                  value={editingStandards.technicalStandards.maxDistanceFromPole}
                  onChange={(e) => 
                    setEditingStandards(prev => ({
                      ...prev,
                      technicalStandards: {
                        ...prev.technicalStandards,
                        maxDistanceFromPole: Number(e.target.value)
                      }
                    }))
                  }
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            Save Standards
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Quality Validation System Export
 */
export {
  QualityChecklist,
  QualityStandardsConfig,
  DEFAULT_QUALITY_STANDARDS,
  QUALITY_CHECK_ITEMS
};

export type {
  QualityCheckItem,
  QualityStandards
};