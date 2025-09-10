'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Database, 
  Map, 
  Calendar,
  Filter,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Camera
} from 'lucide-react';
import { log } from '@/lib/logger';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  icon: React.ReactNode;
  size: string;
}

interface ExportHistory {
  id: string;
  name: string;
  format: string;
  size: string;
  exportedAt: string;
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
}

export default function ExportsPage() {
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['captures']);
  const [dateRange, setDateRange] = useState('30d');
  const [exportFormat, setExportFormat] = useState('csv');
  const [includedFields, setIncludedFields] = useState<string[]>(['basic']);

  const exportFormats: ExportFormat[] = [
    {
      id: 'csv',
      name: 'CSV',
      extension: '.csv',
      description: 'Comma-separated values for spreadsheet applications',
      icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
      size: '~2.5MB typical'
    },
    {
      id: 'excel',
      name: 'Excel',
      extension: '.xlsx',
      description: 'Microsoft Excel format with formatted tables',
      icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
      size: '~3.2MB typical'
    },
    {
      id: 'json',
      name: 'JSON',
      extension: '.json',
      description: 'Structured data format for API integration',
      icon: <Database className="w-5 h-5 text-purple-600" />,
      size: '~1.8MB typical'
    },
    {
      id: 'pdf',
      name: 'PDF Report',
      extension: '.pdf',
      description: 'Formatted report with charts and summaries',
      icon: <FileText className="w-5 h-5 text-red-600" />,
      size: '~5.1MB typical'
    },
    {
      id: 'geojson',
      name: 'GeoJSON',
      extension: '.geojson',
      description: 'Geographic data format for mapping applications',
      icon: <Map className="w-5 h-5 text-green-600" />,
      size: '~4.3MB typical'
    },
    {
      id: 'gpkg',
      name: 'GeoPackage',
      extension: '.gpkg',
      description: 'QGIS compatible format with spatial data',
      icon: <Map className="w-5 h-5 text-blue-600" />,
      size: '~6.7MB typical'
    }
  ];

  const exportHistory: ExportHistory[] = [
    {
      id: '1',
      name: 'Home Drop Captures - December 2024',
      format: 'CSV',
      size: '2.4 MB',
      exportedAt: '2024-12-15 14:30',
      status: 'completed',
      downloadUrl: '/exports/home-drops-dec-2024.csv'
    },
    {
      id: '2',
      name: 'Pole Installations - Q4 2024',
      format: 'Excel',
      size: '3.1 MB',
      exportedAt: '2024-12-14 10:15',
      status: 'completed',
      downloadUrl: '/exports/poles-q4-2024.xlsx'
    },
    {
      id: '3',
      name: 'Geographic Analysis Report',
      format: 'PDF',
      size: '8.2 MB',
      exportedAt: '2024-12-13 16:45',
      status: 'processing'
    },
    {
      id: '4',
      name: 'Technician Performance Data',
      format: 'JSON',
      size: '1.7 MB',
      exportedAt: '2024-12-12 09:20',
      status: 'failed'
    }
  ];

  const dataTypes = [
    { id: 'captures', label: 'Home Drop Captures', icon: <Camera className="w-4 h-4" /> },
    { id: 'poles', label: 'Pole Installations', icon: <Map className="w-4 h-4" /> },
    { id: 'technicians', label: 'Technician Data', icon: <Users className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <Calendar className="w-4 h-4" /> },
    { id: 'approvals', label: 'Approval History', icon: <CheckCircle className="w-4 h-4" /> }
  ];

  const fieldOptions = [
    { id: 'basic', label: 'Basic Information', description: 'ID, timestamps, status' },
    { id: 'location', label: 'GPS & Location Data', description: 'Coordinates, addresses, accuracy' },
    { id: 'photos', label: 'Photo Metadata', description: 'Photo URLs, timestamps, quality scores' },
    { id: 'technician', label: 'Technician Details', description: 'Names, contact info, performance' },
    { id: 'quality', label: 'Quality Metrics', description: 'Scores, validations, reviews' },
    { id: 'customer', label: 'Customer Information', description: 'Names, addresses, contact details' }
  ];

  const handleDataTypeToggle = (dataType: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(t => t !== dataType)
        : [...prev, dataType]
    );
  };

  const handleFieldToggle = (field: string) => {
    setIncludedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = () => {
    log.info('Exporting with options', {
      dataTypes: selectedDataTypes,
      format: exportFormat,
      dateRange,
      fields: includedFields
    }, 'ExportsPage');
    // TODO: Implement actual export functionality
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Export</h1>
          <p className="text-gray-600 mt-1">Export field data in various formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Data Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Data Types to Include</h4>
                <div className="grid grid-cols-2 gap-3">
                  {dataTypes.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={type.id}
                        checked={selectedDataTypes.includes(type.id)}
                        onCheckedChange={() => handleDataTypeToggle(type.id)}
                      />
                      <label htmlFor={type.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        {type.icon}
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Date Range</h4>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="font-medium mb-3">Fields to Include</h4>
                <div className="space-y-3">
                  {fieldOptions.map((field) => (
                    <div key={field.id} className="flex items-start space-x-2">
                      <Checkbox 
                        id={field.id}
                        checked={includedFields.includes(field.id)}
                        onCheckedChange={() => handleFieldToggle(field.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor={field.id} className="text-sm font-medium cursor-pointer">
                          {field.label}
                        </label>
                        <p className="text-xs text-gray-600">{field.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Formats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Export Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportFormats.map((format) => (
                  <div 
                    key={format.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      exportFormat === format.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setExportFormat(format.id)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {format.icon}
                      <div>
                        <h4 className="font-medium">{format.name}</h4>
                        <p className="text-xs text-gray-600">{format.extension}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{format.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {format.size}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Ready to Export</h4>
                  <p className="text-sm text-gray-600">
                    {selectedDataTypes.length} data type(s) selected • {includedFields.length} field group(s) • {dateRange}
                  </p>
                </div>
                <Button onClick={handleExport} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Generate Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Export History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {exportHistory.map((export_) => (
                  <div key={export_.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-2">{export_.name}</h4>
                        <p className="text-xs text-gray-600">{export_.exportedAt}</p>
                      </div>
                      <div className="ml-2">
                        {getStatusIcon(export_.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {export_.format}
                        </Badge>
                        <span className="text-xs text-gray-600">{export_.size}</span>
                      </div>
                      
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(export_.status)}`}
                      >
                        {export_.status}
                      </Badge>
                    </div>
                    
                    {export_.status === 'completed' && export_.downloadUrl && (
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    )}
                    
                    {export_.status === 'failed' && (
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Retry Export
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Today&apos;s Captures (CSV)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Map className="w-4 h-4 mr-2" />
                Geographic Data (GeoJSON)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Technician Report (PDF)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}