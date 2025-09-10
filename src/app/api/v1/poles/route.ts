/**
 * Poles API - Manage pole capture data
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
    const limitCount = parseInt(searchParams.get('limit') || '50');

    // Build base query
    let polesQuery = query(
      collection(db, 'pole_captures'),
      orderBy('capturedAt', 'desc'),
      limit(limitCount)
    );

    // Apply filters
    if (projectId) {
      polesQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    if (contractorId && projectId) {
      polesQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        where('contractorId', '==', contractorId),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    if (status && projectId) {
      polesQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        where('status', '==', status),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(polesQuery);
    const poles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
      syncedAt: doc.data().syncedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: poles,
      count: poles.length
    });

  } catch (error: unknown) {
    log.error('Poles GET error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch poles',
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
    const requiredFields = ['projectId', 'contractorId', 'poleNumber', 'gpsLocation'];
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

    // Create pole capture document
    const poleData = {
      ...body,
      status: body.status || 'captured',
      capturedAt: Timestamp.now(),
      syncedAt: Timestamp.now(),
      version: 1
    };

    const docRef = await addDoc(collection(db, 'pole_captures'), poleData);

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...poleData,
        capturedAt: poleData.capturedAt.toDate().toISOString(),
        syncedAt: poleData.syncedAt.toDate().toISOString()
      }
    });

  } catch (error: unknown) {
    log.error('Poles POST error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create pole capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}