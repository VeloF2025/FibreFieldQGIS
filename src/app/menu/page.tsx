'use client';

import { useRouter } from 'next/navigation';
import { 
  Camera,
  Database,
  MapPin,
  Settings,
  User,
  History,
  BarChart3,
  Wifi,
  WifiOff,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MenuOption {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  badge?: string;
  disabled?: boolean;
}

export default function MenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const menuOptions: MenuOption[] = [
    {
      title: 'Pole Capture',
      description: 'Complete pole installation workflow',
      icon: Camera,
      route: '/poles/capture',
      color: 'bg-[#005cbb]',
      badge: 'Primary'
    },
    {
      title: 'Installation History',
      description: 'View completed installations',
      icon: History,
      route: '/installations',
      color: 'bg-green-600'
    },
    {
      title: 'Sync Status',
      description: 'Monitor data sync and uploads',
      icon: Database,
      route: '/sync',
      color: 'bg-orange-600',
      badge: isOnline ? 'Online' : 'Offline'
    },
    {
      title: 'Field Map',
      description: 'View pole locations and assignments',
      icon: MapPin,
      route: '/map',
      color: 'bg-blue-600',
      badge: 'New'
    },
    {
      title: 'Analytics',
      description: 'Performance metrics and reports',
      icon: BarChart3,
      route: '/analytics',
      color: 'bg-purple-600',
      badge: 'New'
    },
    {
      title: 'Settings',
      description: 'App preferences and configuration',
      icon: Settings,
      route: '/settings',
      color: 'bg-gray-600'
    }
  ];

  const handleNavigation = (route: string, disabled?: boolean) => {
    if (disabled) {
      alert('This feature is coming soon!');
      return;
    }
    router.push(route);
  };

  return (
    <div className="min-h-screen bg-[#faf9fd] flex flex-col">
      {/* Header - FibreFlow style */}
      <div className="bg-[#005cbb] text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">FibreField</h1>
            <p className="text-sm text-blue-100">Field Technician Portal</p>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={isOnline ? "secondary" : "destructive"}
              className={cn(
                "flex items-center gap-1",
                isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>

      {/* User Info */}
      <Card className="m-4 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#005cbb] rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{user?.displayName || user?.email || 'Field Technician'}</p>
              <p className="text-sm text-gray-600">Logged in as technician</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Options */}
      <div className="flex-1 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Main Features</h2>
        
        <div className="grid gap-4">
          {menuOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Card 
                key={index}
                className={cn(
                  "border-0 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md",
                  option.disabled && "opacity-50"
                )}
                onClick={() => handleNavigation(option.route, option.disabled)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-lg", option.color)}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{option.title}</h3>
                        {option.badge && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              option.badge === 'Primary' && "bg-blue-100 text-blue-800",
                              option.badge === 'Online' && "bg-green-100 text-green-800",
                              option.badge === 'Offline' && "bg-red-100 text-red-800"
                            )}
                          >
                            {option.badge}
                          </Badge>
                        )}
                        {option.disabled && (
                          <Badge variant="outline" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            FibreField v1.0.0
          </span>
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>System Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}