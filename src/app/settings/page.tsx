'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  Camera,
  Database,
  Wifi,
  Bell,
  MapPin,
  Save,
  RotateCcw,
  Smartphone,
  HardDrive,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { localDB } from '@/lib/database';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

interface AppSettings {
  // Camera settings
  photoQuality: number; // 0.1 to 1.0
  maxPhotoSize: number; // MB
  autoGpsCapture: boolean;
  
  // Sync settings
  autoSync: boolean;
  syncInterval: number; // minutes
  syncOnWifiOnly: boolean;
  
  // Notification settings
  showSyncNotifications: boolean;
  showCompletionNotifications: boolean;
  
  // App preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
  keepScreenOn: boolean;
  
  // Data management
  autoDeleteSyncedPhotos: boolean;
  maxStorageDays: number;
}

const defaultSettings: AppSettings = {
  photoQuality: 0.8,
  maxPhotoSize: 10,
  autoGpsCapture: true,
  autoSync: true,
  syncInterval: 5,
  syncOnWifiOnly: false,
  showSyncNotifications: true,
  showCompletionNotifications: true,
  theme: 'auto',
  language: 'en',
  keepScreenOn: false,
  autoDeleteSyncedPhotos: false,
  maxStorageDays: 30
};

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 });

  // Load settings from localStorage
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = localStorage.getItem('fibrefield-settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
      
      // Calculate storage usage
      const installations = await localDB.poleInstallations.toArray();
      const photos = await localDB.photos.toArray();
      const usedStorage = photos.reduce((total, photo) => total + (photo.fileSize || 0), 0) / (1024 * 1024); // MB
      setStorageUsage({ used: usedStorage, total: 1024 }); // Assume 1GB limit
      
    } catch (error) {
      log.error('Failed to load settings:', {}, "Page", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings to localStorage
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem('fibrefield-settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      // Apply certain settings immediately
      if (settings.keepScreenOn && 'wakeLock' in navigator) {
        try {
          await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          log.warn('Wake lock not supported or failed', {}, "Page");
        }
      }
      
    } catch (error) {
      log.error('Failed to save settings:', {}, "Page", error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings(defaultSettings);
      setHasUnsavedChanges(true);
    }
  };

  // Clear local data
  const clearLocalData = async () => {
    const confirmed = confirm(
      'This will delete all local installations and photos that haven\'t been synced. Are you sure?'
    );
    
    if (!confirmed) return;

    try {
      await localDB.poleInstallations.clear();
      await localDB.photos.clear();
      await localDB.syncQueue.clear();
      alert('Local data cleared successfully.');
      setStorageUsage({ used: 0, total: storageUsage.total });
    } catch (error) {
      log.error('Failed to clear local data:', {}, "Page", error);
      alert('Failed to clear local data.');
    }
  };

  // Update settings helper
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-gray-600">Loading settings...</div>
              </div>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your FibreField preferences and configuration</p>
            </div>
          </div>

          {/* Settings Cards */}
        
        {/* User Profile */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 bg-[#005cbb] rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">{user?.displayName || user?.email || 'Field Technician'}</p>
                <p className="text-sm text-gray-600">Field Technician</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camera Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera & Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Photo Quality: {Math.round(settings.photoQuality * 100)}%</Label>
              <Slider
                value={[settings.photoQuality]}
                onValueChange={([value]) => updateSetting('photoQuality', value)}
                max={1}
                min={0.1}
                step={0.1}
                className="w-full"
              />
              <p className="text-sm text-gray-600">Higher quality = larger file sizes</p>
            </div>

            <div className="space-y-2">
              <Label>Max Photo Size: {settings.maxPhotoSize} MB</Label>
              <Slider
                value={[settings.maxPhotoSize]}
                onValueChange={([value]) => updateSetting('maxPhotoSize', value)}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-gps">Auto-capture GPS</Label>
                <p className="text-sm text-gray-600">Automatically capture location with photos</p>
              </div>
              <Switch
                id="auto-gps"
                checked={settings.autoGpsCapture}
                onCheckedChange={(checked) => updateSetting('autoGpsCapture', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Auto Sync</Label>
                <p className="text-sm text-gray-600">Automatically sync when online</p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.autoSync}
                onCheckedChange={(checked) => updateSetting('autoSync', checked)}
              />
            </div>

            {settings.autoSync && (
              <>
                <div className="space-y-2">
                  <Label>Sync Interval: {settings.syncInterval} minutes</Label>
                  <Slider
                    value={[settings.syncInterval]}
                    onValueChange={([value]) => updateSetting('syncInterval', value)}
                    max={60}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wifi-only">WiFi Only</Label>
                    <p className="text-sm text-gray-600">Only sync over WiFi to save data</p>
                  </div>
                  <Switch
                    id="wifi-only"
                    checked={settings.syncOnWifiOnly}
                    onCheckedChange={(checked) => updateSetting('syncOnWifiOnly', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-notifications">Sync Notifications</Label>
                <p className="text-sm text-gray-600">Show when data is being synced</p>
              </div>
              <Switch
                id="sync-notifications"
                checked={settings.showSyncNotifications}
                onCheckedChange={(checked) => updateSetting('showSyncNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="completion-notifications">Completion Notifications</Label>
                <p className="text-sm text-gray-600">Show when installations are completed</p>
              </div>
              <Switch
                id="completion-notifications"
                checked={settings.showCompletionNotifications}
                onCheckedChange={(checked) => updateSetting('showCompletionNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={settings.theme} onValueChange={(value: any) => updateSetting('theme', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="keep-screen-on">Keep Screen On</Label>
                <p className="text-sm text-gray-600">Prevent screen from turning off during use</p>
              </div>
              <Switch
                id="keep-screen-on"
                checked={settings.keepScreenOn}
                onCheckedChange={(checked) => updateSetting('keepScreenOn', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Management */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Management
            </CardTitle>
            <CardDescription>
              Using {storageUsage.used.toFixed(1)} MB of {storageUsage.total} MB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span>{((storageUsage.used / storageUsage.total) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#005cbb] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((storageUsage.used / storageUsage.total) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-delete">Auto-delete synced photos</Label>
                <p className="text-sm text-gray-600">Free up space by removing uploaded photos</p>
              </div>
              <Switch
                id="auto-delete"
                checked={settings.autoDeleteSyncedPhotos}
                onCheckedChange={(checked) => updateSetting('autoDeleteSyncedPhotos', checked)}
              />
            </div>

            <Button
              variant="destructive"
              onClick={clearLocalData}
              className="w-full"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Clear All Local Data
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={saveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className="w-full bg-[#005cbb] hover:bg-[#004a96]"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving Settings...' : 'Save Settings'}
          </Button>

          <Button
            variant="outline"
            onClick={resetSettings}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Unsaved changes warning */}
        {hasUnsavedChanges && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have unsaved changes. Don&apos;t forget to save your settings.
            </AlertDescription>
          </Alert>
        )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}