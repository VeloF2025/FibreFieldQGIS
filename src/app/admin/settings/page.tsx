'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Users, 
  Shield, 
  Database, 
  Wifi,
  Camera,
  MapPin,
  Clock,
  Bell,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Globe,
  Download,
  Upload
} from 'lucide-react';
import { log } from '@/lib/logger';

interface SystemSettings {
  general: {
    companyName: string;
    timezone: string;
    dateFormat: string;
    defaultLanguage: string;
  };
  capture: {
    requiredPhotos: number;
    photoQuality: string;
    gpsAccuracy: number;
    autoSync: boolean;
    offlineRetention: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    approvalNotifications: boolean;
    failureAlerts: boolean;
  };
  security: {
    sessionTimeout: number;
    passwordPolicy: string;
    twoFactorRequired: boolean;
    ipRestriction: boolean;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      companyName: 'FibreField Technologies',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      defaultLanguage: 'en'
    },
    capture: {
      requiredPhotos: 4,
      photoQuality: 'high',
      gpsAccuracy: 10,
      autoSync: true,
      offlineRetention: 30
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      approvalNotifications: true,
      failureAlerts: true
    },
    security: {
      sessionTimeout: 480,
      passwordPolicy: 'strong',
      twoFactorRequired: false,
      ipRestriction: false
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (category: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    log.info('Saving settings:', { settings }, "Page");
    setHasChanges(false);
    // TODO: Implement actual save functionality
  };

  const handleResetSettings = () => {
    // TODO: Reset to default values
    setHasChanges(false);
  };

  const systemStats = {
    version: '1.2.3',
    uptime: '15 days, 8 hours',
    lastBackup: '2024-12-15 03:00 AM',
    storageUsed: '67%',
    activeUsers: 23,
    totalCaptures: 1247
  };

  const tabConfig = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'capture', label: 'Capture', icon: <Camera className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <Database className="w-4 h-4" /> }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure application preferences and system behavior</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleResetSettings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <Card className="lg:w-64 h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {tabConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={settings.general.companyName}
                      onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.general.timezone}
                      onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select 
                      value={settings.general.dateFormat}
                      onValueChange={(value) => handleSettingChange('general', 'dateFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Default Language</Label>
                    <Select 
                      value={settings.general.defaultLanguage}
                      onValueChange={(value) => handleSettingChange('general', 'defaultLanguage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'capture' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Capture Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="requiredPhotos">Required Photos per Capture</Label>
                    <Select 
                      value={settings.capture.requiredPhotos.toString()}
                      onValueChange={(value) => handleSettingChange('capture', 'requiredPhotos', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Photos</SelectItem>
                        <SelectItem value="4">4 Photos</SelectItem>
                        <SelectItem value="6">6 Photos</SelectItem>
                        <SelectItem value="8">8 Photos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="photoQuality">Photo Quality</Label>
                    <Select 
                      value={settings.capture.photoQuality}
                      onValueChange={(value) => handleSettingChange('capture', 'photoQuality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Fast upload)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (Best quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="gpsAccuracy">Required GPS Accuracy (meters)</Label>
                    <Input
                      id="gpsAccuracy"
                      type="number"
                      value={settings.capture.gpsAccuracy}
                      onChange={(e) => handleSettingChange('capture', 'gpsAccuracy', parseFloat(e.target.value))}
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-600 mt-1">Lower values require more precise location</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="offlineRetention">Offline Data Retention (days)</Label>
                    <Input
                      id="offlineRetention"
                      type="number"
                      value={settings.capture.offlineRetention}
                      onChange={(e) => handleSettingChange('capture', 'offlineRetention', parseInt(e.target.value))}
                      placeholder="30"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSync">Automatic Sync</Label>
                      <p className="text-sm text-gray-600">Automatically sync data when online</p>
                    </div>
                    <Switch
                      id="autoSync"
                      checked={settings.capture.autoSync}
                      onCheckedChange={(checked) => handleSettingChange('capture', 'autoSync', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-600">Send notifications via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.emailEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'emailEnabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-green-500" />
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-gray-600">Send notifications via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.smsEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'smsEnabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-purple-500" />
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-gray-600">Browser and mobile push notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.pushEnabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'pushEnabled', checked)}
                    />
                  </div>
                </div>
                
                <hr className="my-6" />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Types</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Approval Notifications</Label>
                      <p className="text-sm text-gray-600">When items need approval or are approved/rejected</p>
                    </div>
                    <Switch
                      checked={settings.notifications.approvalNotifications}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'approvalNotifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Failure Alerts</Label>
                      <p className="text-sm text-gray-600">System errors and capture failures</p>
                    </div>
                    <Switch
                      checked={settings.notifications.failureAlerts}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'failureAlerts', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      placeholder="480"
                    />
                    <p className="text-xs text-gray-600 mt-1">0 = never timeout</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="passwordPolicy">Password Policy</Label>
                    <Select 
                      value={settings.security.passwordPolicy}
                      onValueChange={(value) => handleSettingChange('security', 'passwordPolicy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                        <SelectItem value="strong">Strong (8+ chars, mixed case, numbers)</SelectItem>
                        <SelectItem value="complex">Complex (12+ chars, symbols required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-600">Require 2FA for all users</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorRequired}
                      onCheckedChange={(checked) => handleSettingChange('security', 'twoFactorRequired', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP Restriction</Label>
                      <p className="text-sm text-gray-600">Restrict access to specific IP addresses</p>
                    </div>
                    <Switch
                      checked={settings.security.ipRestriction}
                      onCheckedChange={(checked) => handleSettingChange('security', 'ipRestriction', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Version:</span>
                        <Badge variant="outline">{systemStats.version}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Uptime:</span>
                        <span className="text-sm text-gray-600">{systemStats.uptime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Last Backup:</span>
                        <span className="text-sm text-gray-600">{systemStats.lastBackup}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Storage Used:</span>
                        <Badge variant="outline" className="text-orange-600">{systemStats.storageUsed}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Active Users:</span>
                        <span className="text-sm text-gray-600">{systemStats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Captures:</span>
                        <span className="text-sm text-gray-600">{systemStats.totalCaptures}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Create System Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Restore from Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-orange-600 hover:text-orange-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    System Maintenance Mode
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}