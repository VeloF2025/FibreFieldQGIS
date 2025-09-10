/**
 * QGIS Export API - Export project data as GeoPackage
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { log } from '@/lib/logger';
import { geoPackageHandler } from '@/lib/geopackage-handler';
import type { GeoPackageExportOptions } from '@/lib/geopackage-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params;
  const projectId = resolvedParams.projectId;

  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'gpkg'; // 'gpkg' or 'geojson'
    const includeApproved = searchParams.get('includeApproved') !== 'false';
    const includePending = searchParams.get('includePending') !== 'false';
    const includeRejected = searchParams.get('includeRejected') === 'true';
    const tableName = searchParams.get('tableName') || 'home_drops';
    const layerName = searchParams.get('layerName') || `${projectId} Home Drops`;

    // Fetch home drop captures for the project
    const capturesQuery = query(
      collection(db, 'home_drop_captures'),
      where('projectId', '==', projectId)
    );

    const capturesSnapshot = await getDocs(capturesQuery);
    let captures = capturesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString(),
      syncedAt: doc.data().syncedAt?.toDate?.()?.toISOString()
    })) as Array<any>;

    // Apply status filters
    if (!includeApproved) {
      captures = captures.filter(c => c.approvalStatus !== 'approved');
    }
    if (!includePending) {
      captures = captures.filter(c => c.approvalStatus !== 'pending');
    }
    if (!includeRejected) {
      captures = captures.filter(c => c.approvalStatus !== 'rejected');
    }

    if (captures.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No captures found for export' },
        { status: 404 }
      );
    }

    // Export options
    const exportOptions: GeoPackageExportOptions = {
      tableName,
      layerName,
      description: `Home drop captures for project ${projectId}`,
      targetCRS: 'EPSG:4326',
      includeMetadata: true,
      createSpatialIndex: true,
      customAttributes: {
        export_date: new Date().toISOString(),
        export_format: format,
        export_version: '1.0',
        project_id: projectId
      }
    };

    if (format === 'geojson') {
      // Export as GeoJSON
      const geojsonFeatures = captures.map(capture => ({
        type: 'Feature',
        id: capture.id,
        geometry: {
          type: 'Point',
          coordinates: [
            capture.gpsLocation?.longitude || 0,
            capture.gpsLocation?.latitude || 0
          ]
        },
        properties: {
          capture_id: capture.id,
          service_address: capture.serviceAddress || '',
          customer_name: capture.customerInfo?.name || '',
          captured_at: capture.capturedAt,
          approval_status: capture.approvalStatus || 'pending',
          gps_accuracy: capture.gpsLocation?.accuracy || 0,
          photos_count: Object.keys(capture.photos || {}).length,
          quality_score: capture.qualityScore || 0,
          assignment_id: capture.assignmentId || '',
          project_id: capture.projectId,
          contractor_id: capture.contractorId || '',
          notes: capture.notes || ''
        }
      }));

      const geojson = {
        type: 'FeatureCollection',
        name: layerName,
        crs: {
          type: 'name',
          properties: { name: 'EPSG:4326' }
        },
        features: geojsonFeatures
      };

      const filename = `${projectId}_home_drops_${new Date().toISOString().split('T')[0]}.geojson`;

      return new Response(JSON.stringify(geojson, null, 2), {
        headers: {
          'Content-Type': 'application/geo+json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });

    } else {
      // Export as GeoPackage
      const gpkgBlob = await geoPackageHandler.writeGeoPackage(captures, exportOptions);
      const filename = `${projectId}_home_drops_${new Date().toISOString().split('T')[0]}.gpkg`;

      return new Response(gpkgBlob, {
        headers: {
          'Content-Type': 'application/geopackage+sqlite3',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error: unknown) {
    log.error('QGIS export error', { projectId }, 'QgisExportRoute', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export GeoPackage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}