/**
 * Coverage Area API - Get coverage area data and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ areaId: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const resolvedParams = await params;
    const areaId = resolvedParams.areaId;
    
    if (!areaId) {
      return NextResponse.json(
        { success: false, error: 'Area ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') !== 'false';
    const includeGeometry = searchParams.get('includeGeometry') !== 'false';
    const detailLevel = searchParams.get('detailLevel') || 'summary'; // 'summary', 'detailed', 'full'

    // Get poles in the area
    const polesQuery = query(
      collection(db, 'pole_captures'),
      where('serviceArea', '==', areaId),
      orderBy('capturedAt', 'desc')
    );
    
    const polesSnapshot = await getDocs(polesQuery);
    const poles = polesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString()
    })) as Array<any>;

    // Get home drops in the area
    const homeDropsQuery = query(
      collection(db, 'home_drop_captures'),
      where('serviceArea', '==', areaId),
      orderBy('capturedAt', 'desc')
    );

    const homeDropsSnapshot = await getDocs(homeDropsQuery);
    const homeDrops = homeDropsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString()
    })) as Array<any>;

    // Get relationships in the area
    const relationshipsQuery = query(
      collection(db, 'pole_drop_relationships'),
      where('metadata.serviceArea', '==', areaId),
      orderBy('createdAt', 'desc')
    );

    const relationshipsSnapshot = await getDocs(relationshipsQuery);
    const relationships = relationshipsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString()
    })) as Array<any>;

    // Calculate coverage statistics
    const coverageStats = calculateCoverageStats(poles, homeDrops, relationships);

    // Calculate service area geometry
    const areaGeometry = includeGeometry ? calculateServiceAreaGeometry(poles, homeDrops) : null;

    // Build response based on detail level
    const responseData: any = {
      areaId,
      summary: {
        totalPoles: poles.length,
        totalHomeDrops: homeDrops.length,
        totalRelationships: relationships.length,
        coveragePercentage: coverageStats.coveragePercentage,
        serviceRadius: coverageStats.serviceRadius
      }
    };

    if (includeStats) {
      responseData.statistics = coverageStats;
    }

    if (includeGeometry) {
      responseData.geometry = areaGeometry;
    }

    if (detailLevel === 'detailed' || detailLevel === 'full') {
      responseData.poles = poles.map(pole => ({
        id: pole.id,
        poleNumber: pole.poleNumber,
        location: pole.gpsLocation,
        status: pole.status,
        capturedAt: pole.capturedAt,
        connectedDrops: relationships.filter(r => r.poleId === pole.id).length
      }));

      responseData.homeDrops = homeDrops.map(drop => ({
        id: drop.id,
        serviceAddress: drop.serviceAddress,
        customerName: drop.customerInfo?.name,
        location: drop.gpsLocation,
        approvalStatus: drop.approvalStatus,
        capturedAt: drop.capturedAt,
        poleId: drop.poleId,
        distanceFromPole: drop.distanceFromPole
      }));
    }

    if (detailLevel === 'full') {
      responseData.relationships = relationships;
      responseData.networkTopology = generateNetworkTopology(poles, homeDrops, relationships);
      responseData.serviceQuality = calculateServiceQuality(homeDrops, relationships);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      generatedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    log.error('Coverage area API error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch coverage area data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate coverage statistics
function calculateCoverageStats(poles: any[], homeDrops: any[], relationships: any[]) {
  const connectedDrops = relationships.length;
  const totalDrops = homeDrops.length;
  const coveragePercentage = totalDrops > 0 ? (connectedDrops / totalDrops) * 100 : 0;

  // Calculate service radius (average distance from poles to connected drops)
  const distances = relationships
    .filter(r => r.distance && r.distance > 0)
    .map(r => r.distance);
  
  const averageDistance = distances.length > 0 
    ? distances.reduce((sum, d) => sum + d, 0) / distances.length 
    : 0;

  const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;

  // Calculate density metrics
  const areaGeometry = calculateServiceAreaGeometry(poles, homeDrops);
  const areaSize = areaGeometry ? calculatePolygonArea(areaGeometry.coordinates[0]) : 0;
  const poleDensity = areaSize > 0 ? poles.length / areaSize : 0;
  const dropDensity = areaSize > 0 ? homeDrops.length / areaSize : 0;

  // Service quality metrics
  const approvedDrops = homeDrops.filter(d => d.approvalStatus === 'approved').length;
  const pendingDrops = homeDrops.filter(d => d.approvalStatus === 'pending').length;
  const rejectedDrops = homeDrops.filter(d => d.approvalStatus === 'rejected').length;

  return {
    coveragePercentage: Math.round(coveragePercentage * 100) / 100,
    serviceRadius: Math.round(averageDistance),
    maxServiceDistance: maxDistance,
    connectedDrops,
    unconnectedDrops: totalDrops - connectedDrops,
    areaSize: Math.round(areaSize),
    density: {
      polesPerKm2: Math.round(poleDensity * 1000000), // Convert to per km²
      dropsPerKm2: Math.round(dropDensity * 1000000)
    },
    serviceStatus: {
      approved: approvedDrops,
      pending: pendingDrops,
      rejected: rejectedDrops,
      approvalRate: totalDrops > 0 ? (approvedDrops / totalDrops) * 100 : 0
    },
    efficiency: {
      averageDropsPerPole: poles.length > 0 ? homeDrops.length / poles.length : 0,
      utilizationRate: poles.length > 0 ? (connectedDrops / poles.length) * 100 : 0
    }
  };
}

// Helper function to calculate service area geometry
function calculateServiceAreaGeometry(poles: any[], homeDrops: any[]) {
  const allPoints = [
    ...poles.map(p => p.gpsLocation).filter(Boolean),
    ...homeDrops.map(d => d.gpsLocation).filter(Boolean)
  ];

  if (allPoints.length < 3) {
    return null;
  }

  // Calculate convex hull for service area boundary
  const hull = convexHull(allPoints);
  
  if (hull.length < 3) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates: [hull.map(point => [point.longitude, point.latitude])]
  };
}

// Helper function to generate network topology
function generateNetworkTopology(poles: any[], homeDrops: any[], relationships: any[]) {
  const nodes = [
    ...poles.map(pole => ({
      id: pole.id,
      type: 'pole',
      poleNumber: pole.poleNumber,
      location: pole.gpsLocation,
      connections: relationships.filter(r => r.poleId === pole.id).length
    })),
    ...homeDrops.map(drop => ({
      id: drop.id,
      type: 'home_drop',
      serviceAddress: drop.serviceAddress,
      location: drop.gpsLocation,
      poleId: drop.poleId
    }))
  ];

  const edges = relationships.map(rel => ({
    id: rel.id,
    from: rel.poleId,
    to: rel.homeDropId,
    distance: rel.distance,
    quality: rel.relationshipQuality,
    type: rel.linkType
  }));

  return {
    nodes,
    edges,
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgConnections: nodes.length > 0 ? edges.length / nodes.filter(n => n.type === 'pole').length : 0,
      networkDensity: nodes.length > 1 ? (2 * edges.length) / (nodes.length * (nodes.length - 1)) : 0
    }
  };
}

// Helper function to calculate service quality
function calculateServiceQuality(homeDrops: any[], relationships: any[]) {
  const connectedDrops = homeDrops.filter(d => d.poleId);
  
  if (connectedDrops.length === 0) {
    return {
      overallScore: 0,
      connectionQuality: 0,
      distanceQuality: 0,
      approvalQuality: 0
    };
  }

  // Connection quality (percentage of drops connected to poles)
  const connectionQuality = (connectedDrops.length / homeDrops.length) * 100;

  // Distance quality (based on average distance from poles)
  const distances = relationships.map(r => r.distance || 0).filter(d => d > 0);
  const avgDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 0;
  const distanceQuality = avgDistance > 0 ? Math.max(0, 100 - (avgDistance / 10)) : 100; // Penalty for longer distances

  // Approval quality (percentage of approved drops)
  const approvedDrops = homeDrops.filter(d => d.approvalStatus === 'approved').length;
  const approvalQuality = (approvedDrops / homeDrops.length) * 100;

  // Overall quality score (weighted average)
  const overallScore = (connectionQuality * 0.4) + (distanceQuality * 0.3) + (approvalQuality * 0.3);

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    connectionQuality: Math.round(connectionQuality * 100) / 100,
    distanceQuality: Math.round(distanceQuality * 100) / 100,
    approvalQuality: Math.round(approvalQuality * 100) / 100,
    details: {
      avgDistance,
      connectedDrops: connectedDrops.length,
      totalDrops: homeDrops.length,
      approvedDrops
    }
  };
}

// Helper function to calculate polygon area (simplified)
function calculatePolygonArea(coordinates: number[][]): number {
  if (coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  
  return Math.abs(area) / 2;
}

// Helper function to calculate convex hull (simplified Gift Wrapping algorithm)
function convexHull(points: { latitude: number; longitude: number }[]): { latitude: number; longitude: number }[] {
  if (points.length < 3) return points;

  // Find the leftmost point
  let leftmost = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].longitude < points[leftmost].longitude) {
      leftmost = i;
    }
  }

  const hull: { latitude: number; longitude: number }[] = [];
  let current = leftmost;

  do {
    hull.push(points[current]);
    let next = (current + 1) % points.length;

    for (let i = 0; i < points.length; i++) {
      if (orientation(points[current], points[i], points[next]) === 2) {
        next = i;
      }
    }

    current = next;
  } while (current !== leftmost);

  return hull;
}

// Helper function to find orientation of ordered triplet
function orientation(p: { longitude: number; latitude: number }, q: { longitude: number; latitude: number }, r: { longitude: number; latitude: number }): number {
  const val = (q.latitude - p.latitude) * (r.longitude - q.longitude) - (q.longitude - p.longitude) * (r.latitude - q.latitude);
  if (val === 0) return 0; // Collinear
  return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
}