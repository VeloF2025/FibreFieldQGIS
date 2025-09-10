/**
 * Assignment Integration Service
 * Handles integration with external services, QGIS/QField, and data transformation
 * File: assignment-integration.service.ts (Target: 150 lines)
 */

import type { HomeDropAssignment } from '@/types/home-drop.types';
import { coreAssignmentService, type AssignmentPriority, type AssignmentStatus } from './core-assignment.service';
import { homeDropCaptureService } from '../home-drop-capture.service';
import { log } from '@/lib/logger';
import { liveQuery } from 'dexie';
import { db } from '@/lib/database';

export interface GeoPackageAssignment {
  id: string;
  homeDropId: string;
  poleNumber: string;
  customerName: string;
  customerAddress: string;
  customerContact?: string;
  latitude: number;
  longitude: number;
  priority: AssignmentPriority;
  scheduledDate?: string;
  assignedTo: string;
  assignmentNotes?: string;
  accessNotes?: string;
  status: AssignmentStatus;
  assignedAt: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface BulkAssignmentOperation {
  homeDropIds: string[];
  assignedTo: string;
  assignedBy: string;
  priority?: AssignmentPriority;
  scheduledDate?: Date;
  notes?: string;
}

/**
 * Assignment Integration Service
 */
class AssignmentIntegrationService {
  /**
   * Load assignments from QGIS GeoPackage
   */
  async loadFromGeoPackage(
    geoPackageData: GeoPackageAssignment[]
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const geoAssignment of geoPackageData) {
      try {
        let homeDropCapture = await homeDropCaptureService.getHomeDropCapture(geoAssignment.homeDropId);
        
        if (!homeDropCapture) {
          const homeDropId = await homeDropCaptureService.createHomeDropCapture({
            id: geoAssignment.homeDropId,
            poleNumber: geoAssignment.poleNumber,
            projectId: 'imported-from-geopackage',
            contractorId: '',
            customer: {
              name: geoAssignment.customerName,
              address: geoAssignment.customerAddress,
              contactNumber: geoAssignment.customerContact
            },
            gpsLocation: {
              latitude: geoAssignment.latitude,
              longitude: geoAssignment.longitude,
              accuracy: 10,
              capturedAt: new Date()
            }
          });
          
          homeDropCapture = await homeDropCaptureService.getHomeDropCapture(homeDropId);
        }

        if (!homeDropCapture) {
          errors.push(`Failed to create home drop ${geoAssignment.homeDropId}`);
          continue;
        }

        const existingAssignment = await coreAssignmentService.getAssignmentByHomeDropId(geoAssignment.homeDropId);
        
        if (existingAssignment) {
          await coreAssignmentService.updateAssignment(existingAssignment.id, {
            priority: geoAssignment.priority,
            scheduledDate: geoAssignment.scheduledDate ? new Date(geoAssignment.scheduledDate) : undefined,
            assignedTo: geoAssignment.assignedTo,
            status: geoAssignment.status,
            installationNotes: geoAssignment.assignmentNotes,
            accessNotes: geoAssignment.accessNotes
          });
          updated++;
        } else {
          await coreAssignmentService.createAssignment(geoAssignment.homeDropId, {
            assignedTo: geoAssignment.assignedTo,
            assignedBy: 'system-geopackage-import',
            priority: geoAssignment.priority,
            scheduledDate: geoAssignment.scheduledDate ? new Date(geoAssignment.scheduledDate) : undefined,
            installationNotes: geoAssignment.assignmentNotes,
            accessNotes: geoAssignment.accessNotes,
            customer: {
              name: geoAssignment.customerName,
              address: geoAssignment.customerAddress,
              contactNumber: geoAssignment.customerContact
            }
          });
          created++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Assignment ${geoAssignment.id}: ${errorMessage}`);
      }
    }

    log.info('GeoPackage import completed', { created, updated, errorCount: errors.length }, 'AssignmentIntegrationService');
    return { created, updated, errors };
  }

  /**
   * Export assignments to GeoPackage format
   */
  async exportToGeoPackage(assignmentIds?: string[]): Promise<GeoPackageAssignment[]> {
    const assignments = assignmentIds
      ? await Promise.all(assignmentIds.map(id => coreAssignmentService.getAssignment(id)))
      : await coreAssignmentService.getAllAssignments();

    const validAssignments = assignments.filter((a): a is HomeDropAssignment => a !== undefined);
    const geoPackageData: GeoPackageAssignment[] = [];

    for (const assignment of validAssignments) {
      const homeDropCapture = await homeDropCaptureService.getHomeDropCapture(assignment.homeDropId);
      
      if (!homeDropCapture || !homeDropCapture.gpsLocation) {
        log.warn('Skipping export - no GPS location', { assignmentId: assignment.id }, 'AssignmentIntegrationService');
        continue;
      }

      geoPackageData.push({
        id: assignment.id,
        homeDropId: assignment.homeDropId,
        poleNumber: assignment.poleNumber,
        customerName: assignment.customer.name,
        customerAddress: assignment.customer.address,
        customerContact: assignment.customer.contactNumber,
        latitude: homeDropCapture.gpsLocation.latitude,
        longitude: homeDropCapture.gpsLocation.longitude,
        priority: assignment.priority,
        scheduledDate: assignment.scheduledDate?.toISOString(),
        assignedTo: assignment.assignedTo,
        assignmentNotes: assignment.installationNotes,
        accessNotes: assignment.accessNotes,
        status: assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
        geometry: {
          type: 'Point',
          coordinates: [homeDropCapture.gpsLocation.longitude, homeDropCapture.gpsLocation.latitude]
        }
      });
    }

    log.info('Exported to GeoPackage', { count: geoPackageData.length }, 'AssignmentIntegrationService');
    return geoPackageData;
  }

  /**
   * Watch assignments for technician (reactive)
   */
  watchAssignmentsForTechnician(technicianId: string) {
    return liveQuery(() =>
      (db as any).homeDropAssignments
        .where('assignedTo')
        .equals(technicianId)
        .toArray()
    );
  }

  /**
   * Watch all assignments (reactive)
   */
  watchAllAssignments() {
    return liveQuery(() => (db as any).homeDropAssignments.toArray());
  }

  /**
   * Watch assignments by status (reactive)
   */
  watchAssignmentsByStatus(status: AssignmentStatus) {
    return liveQuery(() =>
      (db as any).homeDropAssignments
        .where('status')
        .equals(status)
        .toArray()
    );
  }
}

export const assignmentIntegrationService = new AssignmentIntegrationService();