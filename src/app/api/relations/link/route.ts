/**
 * Link Relations API - Link home drops to poles
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      homeDropId, 
      poleId, 
      linkType = 'direct', // 'direct', 'calculated', 'manual'
      confidence = 1.0,
      notes,
      createdBy 
    } = body;

    if (!homeDropId || !poleId) {
      return NextResponse.json(
        { success: false, error: 'Home drop ID and pole ID are required' },
        { status: 400 }
      );
    }

    // Verify home drop exists
    const homeDropRef = doc(db, 'home_drop_captures', homeDropId);
    const homeDropDoc = await getDoc(homeDropRef);
    
    if (!homeDropDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Home drop not found' },
        { status: 404 }
      );
    }

    // Find pole by ID or pole number
    let poleDoc = null;
    let poleRef = doc(db, 'pole_captures', poleId);
    const poleDocResult = await getDoc(poleRef);
    
    if (poleDocResult.exists()) {
      poleDoc = poleDocResult;
    } else {
      // Try to find by pole number
      const poleQuery = query(
        collection(db, 'pole_captures'),
        where('poleNumber', '==', poleId),
        limit(1)
      );
      const poleSnapshot = await getDocs(poleQuery);
      
      if (!poleSnapshot.empty) {
        poleDoc = poleSnapshot.docs[0];
        poleRef = poleDoc.ref;
      }
    }

    if (!poleDoc) {
      return NextResponse.json(
        { success: false, error: 'Pole not found' },
        { status: 404 }
      );
    }

    const homeDropData = homeDropDoc.data();
    const poleData = poleDoc.data();

    // Calculate distance and validate relationship
    const distance = calculateDistance(
      homeDropData.gpsLocation,
      poleData.gpsLocation
    );

    // Validate reasonable distance (typically home drops should be within 500m of pole)
    if (distance > 1000) { // 1km
      return NextResponse.json(
        {
          success: false,
          error: 'Distance between pole and home drop is unusually large',
          details: {
            distance: `${distance}m`,
            suggestion: 'Please verify the correct pole assignment'
          }
        },
        { status: 400 }
      );
    }

    // Check for existing relationships
    const existingRelationQuery = query(
      collection(db, 'pole_drop_relationships'),
      where('homeDropId', '==', homeDropId)
    );
    const existingRelationSnapshot = await getDocs(existingRelationQuery);

    let relationshipId = null;

    if (!existingRelationSnapshot.empty) {
      // Update existing relationship
      const existingDoc = existingRelationSnapshot.docs[0];
      relationshipId = existingDoc.id;
      
      await updateDoc(existingDoc.ref, {
        poleId: poleDoc.id,
        poleNumber: poleData.poleNumber,
        linkType,
        confidence,
        distance,
        notes,
        updatedAt: Timestamp.now(),
        updatedBy: createdBy,
        revisionCount: (existingDoc.data().revisionCount || 0) + 1
      });
      
    } else {
      // Create new relationship
      const relationshipData = {
        homeDropId,
        poleId: poleDoc.id,
        poleNumber: poleData.poleNumber,
        homeDropAddress: homeDropData.serviceAddress || homeDropData.customerInfo?.address || '',
        linkType,
        confidence,
        distance,
        established: 'active',
        relationshipQuality: calculateRelationshipQuality(distance, confidence, linkType),
        spatialData: {
          homeDropLocation: homeDropData.gpsLocation,
          poleLocation: poleData.gpsLocation,
          calculatedDistance: distance,
          bearing: calculateBearing(poleData.gpsLocation, homeDropData.gpsLocation)
        },
        metadata: {
          homeDropCapturedAt: homeDropData.capturedAt,
          poleCapturedAt: poleData.capturedAt,
          projectId: homeDropData.projectId,
          contractorId: homeDropData.contractorId
        },
        notes,
        createdAt: Timestamp.now(),
        createdBy,
        revisionCount: 1
      };

      const relationshipDoc = await addDoc(collection(db, 'pole_drop_relationships'), relationshipData);
      relationshipId = relationshipDoc.id;
    }

    // Update home drop with pole reference
    await updateDoc(homeDropRef, {
      poleId: poleDoc.id,
      poleNumber: poleData.poleNumber,
      distanceFromPole: distance,
      poleRelationshipId: relationshipId,
      relationshipEstablishedAt: Timestamp.now()
    });

    // Create activity log entry
    await addDoc(collection(db, 'relationship_activity_log'), {
      relationshipId,
      action: existingRelationSnapshot.empty ? 'linked' : 'updated',
      homeDropId,
      poleId: poleDoc.id,
      distance,
      linkType,
      timestamp: Timestamp.now(),
      performedBy: createdBy,
      details: {
        previousPoleId: existingRelationSnapshot.empty ? null : existingRelationSnapshot.docs[0].data().poleId,
        newDistance: distance,
        notes
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        relationshipId,
        homeDropId,
        poleId: poleDoc.id,
        poleNumber: poleData.poleNumber,
        distance,
        linkType,
        confidence,
        relationshipQuality: calculateRelationshipQuality(distance, confidence, linkType)
      },
      message: `Home drop successfully ${existingRelationSnapshot.empty ? 'linked' : 'relinked'} to pole`
    });

  } catch (error: unknown) {
    log.error('Link relationship error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to link home drop to pole',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const homeDropId = searchParams.get('homeDropId');
    const poleId = searchParams.get('poleId');
    const projectId = searchParams.get('projectId');

    let relationshipsQuery;

    if (homeDropId) {
      relationshipsQuery = query(
        collection(db, 'pole_drop_relationships'),
        where('homeDropId', '==', homeDropId)
      );
    } else if (poleId) {
      relationshipsQuery = query(
        collection(db, 'pole_drop_relationships'),
        where('poleId', '==', poleId),
        orderBy('createdAt', 'desc')
      );
    } else if (projectId) {
      relationshipsQuery = query(
        collection(db, 'pole_drop_relationships'),
        where('metadata.projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );
    } else {
      relationshipsQuery = query(
        collection(db, 'pole_drop_relationships'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const relationshipsSnapshot = await getDocs(relationshipsQuery);
    const relationships = relationshipsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: relationships,
      count: relationships.length
    });

  } catch (error: unknown) {
    log.error('Get relationships error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch relationships',
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

// Helper function to calculate bearing between two points
function calculateBearing(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  if (!from || !to) return 0;

  const lat1Rad = (from.latitude * Math.PI) / 180;
  const lat2Rad = (to.latitude * Math.PI) / 180;
  const deltaLngRad = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;

  // Normalize to 0-360 degrees
  return (bearingDeg + 360) % 360;
}

// Helper function to calculate relationship quality score
function calculateRelationshipQuality(
  distance: number, 
  confidence: number, 
  linkType: string
): number {
  let qualityScore = 100;

  // Distance factor (closer is better)
  if (distance <= 50) qualityScore *= 1.0; // Perfect
  else if (distance <= 100) qualityScore *= 0.95;
  else if (distance <= 200) qualityScore *= 0.9;
  else if (distance <= 300) qualityScore *= 0.8;
  else if (distance <= 500) qualityScore *= 0.7;
  else qualityScore *= 0.5; // Poor

  // Confidence factor
  qualityScore *= confidence;

  // Link type factor
  switch (linkType) {
    case 'direct':
      qualityScore *= 1.0; // Best
      break;
    case 'calculated':
      qualityScore *= 0.9; // Good
      break;
    case 'manual':
      qualityScore *= 0.8; // Needs verification
      break;
    default:
      qualityScore *= 0.7;
  }

  return Math.round(qualityScore);
}