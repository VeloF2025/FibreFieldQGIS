/**
 * Pole-Drop Relations API - Get all drops associated with a specific pole
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poleId: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const resolvedParams = await params;
    const poleId = resolvedParams.poleId;
    
    if (!poleId) {
      return NextResponse.json(
        { success: false, error: 'Pole ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('project');
    const includeDistance = searchParams.get('includeDistance') === 'true';

    // Get the pole information first
    const poleQuery = query(
      collection(db, 'pole_captures'),
      where('poleNumber', '==', poleId)
    );
    
    const poleSnapshot = await getDocs(poleQuery);
    
    if (poleSnapshot.empty) {
      // Try with document ID
      const poleByIdQuery = query(
        collection(db, 'pole_captures'),
        where('__name__', '==', poleId)
      );
      const poleByIdSnapshot = await getDocs(poleByIdQuery);
      
      if (poleByIdSnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Pole not found' },
          { status: 404 }
        );
      }
    }

    const poleDoc = poleSnapshot.docs[0] || null;
    const poleData = poleDoc?.data();

    // Build query for home drops related to this pole
    let dropsQuery = query(
      collection(db, 'home_drop_captures'),
      where('poleId', '==', poleId),
      orderBy('capturedAt', 'desc')
    );

    // Apply additional filters
    if (status) {
      dropsQuery = query(
        collection(db, 'home_drop_captures'),
        where('poleId', '==', poleId),
        where('approvalStatus', '==', status),
        orderBy('capturedAt', 'desc')
      );
    }

    if (projectId) {
      dropsQuery = query(
        collection(db, 'home_drop_captures'),
        where('poleId', '==', poleId),
        where('projectId', '==', projectId),
        orderBy('capturedAt', 'desc')
      );
    }

    const dropsSnapshot = await getDocs(dropsQuery);
    let homeDrops = dropsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString()
    })) as Array<any>;

    // Calculate distances if requested and pole location is available
    if (includeDistance && poleData?.gpsLocation) {
      homeDrops = homeDrops.map(drop => ({
        ...drop,
        distanceFromPole: calculateDistance(
          poleData.gpsLocation,
          drop.gpsLocation
        )
      }));
    }

    // Calculate relationship statistics
    const stats = {
      totalDrops: homeDrops.length,
      approvedDrops: homeDrops.filter(d => d.approvalStatus === 'approved').length,
      pendingDrops: homeDrops.filter(d => d.approvalStatus === 'pending').length,
      rejectedDrops: homeDrops.filter(d => d.approvalStatus === 'rejected').length,
      averageDistance: includeDistance && homeDrops.length > 0 
        ? homeDrops.reduce((sum, d) => sum + (d.distanceFromPole || 0), 0) / homeDrops.length
        : null,
      maxDistance: includeDistance && homeDrops.length > 0
        ? Math.max(...homeDrops.map(d => d.distanceFromPole || 0))
        : null,
      serviceArea: {
        minLatitude: Math.min(...homeDrops.map(d => d.gpsLocation?.latitude || 0)),
        maxLatitude: Math.max(...homeDrops.map(d => d.gpsLocation?.latitude || 0)),
        minLongitude: Math.min(...homeDrops.map(d => d.gpsLocation?.longitude || 0)),
        maxLongitude: Math.max(...homeDrops.map(d => d.gpsLocation?.longitude || 0))
      }
    };

    // Group drops by service type
    const serviceTypes = homeDrops.reduce((acc: any, drop) => {
      const serviceType = drop.serviceType || 'unknown';
      if (!acc[serviceType]) {
        acc[serviceType] = {
          count: 0,
          drops: []
        };
      }
      acc[serviceType].count++;
      acc[serviceType].drops.push(drop.id);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        pole: poleData ? {
          id: poleDoc.id,
          poleNumber: poleData.poleNumber,
          location: poleData.gpsLocation,
          capturedAt: poleData.capturedAt?.toDate?.()?.toISOString(),
          status: poleData.status,
          projectId: poleData.projectId
        } : null,
        homeDrops,
        statistics: stats,
        serviceTypes,
        relationship: {
          poleId,
          dropsCount: homeDrops.length,
          establishedAt: homeDrops.length > 0 
            ? Math.min(...homeDrops.map(d => new Date(d.capturedAt).getTime()))
            : null,
          lastUpdated: homeDrops.length > 0
            ? Math.max(...homeDrops.map(d => new Date(d.capturedAt || d.createdAt).getTime()))
            : null
        }
      }
    });

  } catch (error: unknown) {
    log.error('Pole-drops relation error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pole-drop relationships',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two GPS coordinates
function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  if (!coord1 || !coord2) return 0;

  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
           Math.cos(lat1Rad) * Math.cos(lat2Rad) *
           Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance); // Return distance in meters
}