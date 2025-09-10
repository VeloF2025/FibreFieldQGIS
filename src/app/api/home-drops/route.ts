/**
 * Home Drop Captures API - Manage home drop capture data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');
    const contractorId = searchParams.get('contractor');
    const status = searchParams.get('status');
    const assignmentId = searchParams.get('assignment');
    const limitCount = parseInt(searchParams.get('limit') || '50');

    // Build base query
    let capturesQuery = query(
      collection(db, 'home_drop_captures'),
      orderBy('capturedAt', 'desc'),
      limit(limitCount)
    );

    // Apply filters
    if (projectId) {
      capturesQuery = query(
        collection(db, 'home_drop_captures'),
        where('projectId', '==', projectId),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    if (contractorId && projectId) {
      capturesQuery = query(
        collection(db, 'home_drop_captures'),
        where('projectId', '==', projectId),
        where('contractorId', '==', contractorId),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    if (status && projectId) {
      capturesQuery = query(
        collection(db, 'home_drop_captures'),
        where('projectId', '==', projectId),
        where('approvalStatus', '==', status),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    if (assignmentId) {
      capturesQuery = query(
        collection(db, 'home_drop_captures'),
        where('assignmentId', '==', assignmentId),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(capturesQuery);
    const captures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString(),
      syncedAt: doc.data().syncedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: captures,
      count: captures.length
    });

  } catch (error: unknown) {
    log.error('Home drops GET error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch home drop captures',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['projectId', 'contractorId', 'assignmentId', 'serviceAddress', 'gpsLocation'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Validate required photos
    const requiredPhotos = ['powerMeter', 'fibertimeSetup', 'deviceActions', 'routerLights'];
    if (!body.photos || typeof body.photos !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing photos object'
        },
        { status: 400 }
      );
    }

    for (const photoType of requiredPhotos) {
      if (!body.photos[photoType]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required photo: ${photoType}`
          },
          { status: 400 }
        );
      }
    }

    // Create home drop capture document
    const captureData = {
      ...body,
      approvalStatus: 'pending',
      capturedAt: Timestamp.now(),
      syncedAt: Timestamp.now(),
      version: 1,
      qualityScore: calculateQualityScore(body)
    };

    const docRef = await addDoc(collection(db, 'home_drop_captures'), captureData);

    // Create audit log entry
    await addDoc(collection(db, 'home_drop_audit_log'), {
      captureId: docRef.id,
      action: 'created',
      timestamp: Timestamp.now(),
      userId: body.contractorId,
      details: {
        serviceAddress: body.serviceAddress,
        photoCount: Object.keys(body.photos).length
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...captureData,
        capturedAt: captureData.capturedAt.toDate().toISOString(),
        syncedAt: captureData.syncedAt.toDate().toISOString()
      }
    });

  } catch (error: unknown) {
    log.error('Home drops POST error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create home drop capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate quality score
function calculateQualityScore(data: any): number {
  let score = 0;
  
  // GPS accuracy (0-30 points)
  const accuracy = data.gpsLocation?.accuracy || 999;
  if (accuracy <= 5) score += 30;
  else if (accuracy <= 10) score += 25;
  else if (accuracy <= 20) score += 20;
  else score += 10;
  
  // Required photos (40 points - 10 per photo)
  const requiredPhotos = ['powerMeter', 'fibertimeSetup', 'deviceActions', 'routerLights'];
  requiredPhotos.forEach(photoType => {
    if (data.photos && data.photos[photoType]) {
      score += 10;
    }
  });
  
  // Additional data completeness (30 points)
  if (data.dropNumber) score += 10;
  if (data.customerInfo && data.customerInfo.name) score += 10;
  if (data.notes && data.notes.length > 10) score += 10;
  
  return Math.min(100, score);
}