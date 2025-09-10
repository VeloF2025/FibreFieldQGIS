/**
 * QGIS Import API - Import GeoPackage assignments data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { log } from '@/lib/logger';
import { geoPackageHandler } from '@/lib/geopackage-handler';
import type { 
  GeoPackageImportOptions,
  GeoPackageDatabase 
} from '@/lib/geopackage-handler';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    
    // Get the uploaded file
    const file = formData.get('geopackage') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'GeoPackage file is required' },
        { status: 400 }
      );
    }

    // Get import options
    const projectId = formData.get('projectId') as string;
    const targetTable = formData.get('targetTable') as string || 'assignments';
    const validateOnly = formData.get('validateOnly') === 'true';
    const createAssignments = formData.get('createAssignments') !== 'false';
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.gpkg') && 
        !file.name.toLowerCase().endsWith('.geojson')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid file type. Only .gpkg and .geojson files are supported' 
        },
        { status: 400 }
      );
    }

    // Import options
    const importOptions: GeoPackageImportOptions = {
      targetTable,
      createSpatialIndex: true,
      validateGeometry: true
    };

    let database: GeoPackageDatabase;
    let assignments: any[] = [];

    if (file.name.toLowerCase().endsWith('.geojson')) {
      // Handle GeoJSON import
      const geojsonText = await file.text();
      const geojsonData = JSON.parse(geojsonText);
      
      // Validate GeoJSON structure
      if (geojsonData.type !== 'FeatureCollection' || !geojsonData.features) {
        return NextResponse.json(
          { success: false, error: 'Invalid GeoJSON format' },
          { status: 400 }
        );
      }

      // Convert GeoJSON to assignments
      assignments = geojsonData.features.map((feature: any, index: number) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0];
        
        return {
          id: `IMPORT-${Date.now()}-${index}`,
          assignmentId: props.assignment_id || `AUTO-${Date.now()}-${index}`,
          poleNumber: props.pole_number || props.pole_id || `P-${index}`,
          customer: {
            name: props.customer_name || 'Unknown Customer',
            address: props.customer_address || props.address || '',
            contactNumber: props.customer_phone || props.phone || '',
            email: props.customer_email || props.email || '',
            accountNumber: props.account_number || props.account || ''
          },
          location: {
            latitude: coords[1] || 0,
            longitude: coords[0] || 0
          },
          priority: normalizePriority(props.priority),
          status: normalizeStatus(props.status),
          scheduledDate: props.scheduled_date ? new Date(props.scheduled_date) : null,
          installationNotes: props.installation_notes || props.notes || '',
          accessNotes: props.access_notes || '',
          serviceType: props.service_type || '',
          bandwidth: props.bandwidth || '',
          projectId
        };
      });

    } else {
      // Handle GeoPackage import
      database = await geoPackageHandler.readGeoPackage(file, importOptions);
      
      // Extract assignments from GeoPackage
      assignments = await geoPackageHandler.extractAssignments(database, targetTable);
      
      // Add project ID to all assignments
      assignments = assignments.map(assignment => ({
        ...assignment,
        projectId
      }));
    }

    // Validation results
    const validationResults = {
      success: true,
      totalFeatures: assignments.length,
      validFeatures: 0,
      invalidFeatures: 0,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validate assignments
    const validAssignments: any[] = [];
    
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const validation = validateAssignment(assignment, i);
      
      if (validation.isValid) {
        validAssignments.push(assignment);
        validationResults.validFeatures++;
      } else {
        validationResults.invalidFeatures++;
        validationResults.errors.push(...validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        validationResults.warnings.push(...validation.warnings);
      }
    }

    // If validation only, return results
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        data: {
          validation: validationResults,
          sampleData: validAssignments.slice(0, 5) // First 5 records for preview
        }
      });
    }

    // Create assignments in database
    if (createAssignments && validAssignments.length > 0) {
      const createdAssignments: any[] = [];
      
      for (const assignment of validAssignments) {
        try {
          const assignmentData = {
            assignmentId: assignment.assignmentId,
            projectId: assignment.projectId,
            poleNumber: assignment.poleNumber,
            serviceArea: assignment.customer.address,
            assignedTo: null, // Will be assigned later
            status: assignment.status || 'unassigned',
            priority: assignment.priority || 'medium',
            customer: assignment.customer,
            location: assignment.location,
            scheduledDate: assignment.scheduledDate ? Timestamp.fromDate(assignment.scheduledDate) : null,
            installationNotes: assignment.installationNotes,
            accessNotes: assignment.accessNotes,
            serviceType: assignment.serviceType,
            bandwidth: assignment.bandwidth,
            createdAt: Timestamp.now(),
            createdBy: 'qgis_import',
            importedAt: Timestamp.now(),
            importSource: file.name
          };

          const docRef = await addDoc(collection(db, 'assignments'), assignmentData);
          createdAssignments.push({
            id: docRef.id,
            ...assignmentData
          });

        } catch (error) {
          validationResults.errors.push(
            `Failed to create assignment ${assignment.assignmentId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      // Create import log entry
      await addDoc(collection(db, 'import_logs'), {
        projectId,
        filename: file.name,
        fileSize: file.size,
        importType: 'assignments',
        totalRecords: assignments.length,
        validRecords: validAssignments.length,
        createdRecords: createdAssignments.length,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        importedAt: Timestamp.now(),
        importedBy: 'system'
      });

      return NextResponse.json({
        success: true,
        data: {
          imported: createdAssignments.length,
          validation: validationResults,
          assignments: createdAssignments
        },
        message: `Successfully imported ${createdAssignments.length} assignments`
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        validation: validationResults,
        assignments: validAssignments
      },
      message: 'Import validation completed'
    });

  } catch (error: unknown) {
    log.error('QGIS import error', {}, 'QgisImportRoute', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import GeoPackage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to validate assignment
function validateAssignment(assignment: any, index: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!assignment.customer?.name) {
    errors.push(`Assignment ${index}: Customer name is required`);
  }
  
  if (!assignment.customer?.address) {
    errors.push(`Assignment ${index}: Customer address is required`);
  }
  
  if (!assignment.poleNumber) {
    errors.push(`Assignment ${index}: Pole number is required`);
  }

  // Location validation
  if (!assignment.location || 
      typeof assignment.location.latitude !== 'number' ||
      typeof assignment.location.longitude !== 'number') {
    errors.push(`Assignment ${index}: Valid location coordinates are required`);
  } else {
    const { latitude, longitude } = assignment.location;
    if (latitude < -90 || latitude > 90) {
      errors.push(`Assignment ${index}: Latitude must be between -90 and 90`);
    }
    if (longitude < -180 || longitude > 180) {
      errors.push(`Assignment ${index}: Longitude must be between -180 and 180`);
    }
  }

  // Warnings for optional fields
  if (!assignment.customer?.contactNumber) {
    warnings.push(`Assignment ${index}: Missing customer contact number`);
  }
  
  if (!assignment.serviceType) {
    warnings.push(`Assignment ${index}: Missing service type`);
  }
  
  if (!assignment.scheduledDate) {
    warnings.push(`Assignment ${index}: Missing scheduled date`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to normalize priority
function normalizePriority(priority: any): 'high' | 'medium' | 'low' {
  if (typeof priority !== 'string') return 'medium';
  
  const p = priority.toLowerCase();
  if (p.includes('high') || p.includes('urgent') || p === '1') return 'high';
  if (p.includes('low') || p === '3') return 'low';
  return 'medium';
}

// Helper function to normalize status
function normalizeStatus(status: any): string {
  if (typeof status !== 'string') return 'unassigned';
  
  const s = status.toLowerCase();
  if (s.includes('assign')) return 'assigned';
  if (s.includes('progress') || s.includes('active')) return 'in_progress';
  if (s.includes('complet')) return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  return 'unassigned';
}